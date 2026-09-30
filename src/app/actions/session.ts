"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  exams,
  questions,
  examSessions,
  studentAnswers,
  type Question,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-server";
import { evaluateAvailability } from "@/lib/exam/availability";
import { makeLayout, buildPaper } from "@/lib/exam/paper";
import { finalizeSession } from "@/lib/exam/finalize";

const GRACE_PERIOD_MS = 10_000; // 10s network latency grace period
const CONSENT_VERSION = "2026-09";

export async function lookupExam(accessCode: string) {
  const code = (accessCode || "").trim().toUpperCase();
  if (code.length < 4) {
    return { ok: false as const, error: "Please enter a valid access code." };
  }

  const exam = await db.query.exams.findFirst({
    where: eq(exams.accessCode, code),
  });

  if (!exam) {
    return { ok: false as const, error: "No examination found with this access code." };
  }

  const availability = evaluateAvailability(exam);

  return {
    ok: true as const,
    exam: {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      requireCamera: exam.requireCamera,
      enforceFullscreen: exam.enforceFullscreen,
      status: exam.status,
      availability,
      scheduledStart: exam.scheduledStart,
      scheduledEnd: exam.scheduledEnd,
    },
  };
}

export async function startSession(examId: string, consentVersion?: string) {
  const authSession = await requireRole(["student", "admin"]);
  const user = authSession.user as any;

  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, examId),
  });

  if (!exam) {
    return { ok: false as const, error: "Exam not found." };
  }

  const availability = evaluateAvailability(exam);
  if (availability !== "open") {
    return {
      ok: false as const,
      error: `This exam is currently ${availability.replace("_", " ")}.`,
    };
  }

  // Check for existing session attempt
  const existing = await db.query.examSessions.findFirst({
    where: and(
      eq(examSessions.examId, examId),
      eq(examSessions.studentId, user.id),
      eq(examSessions.attemptNo, 1)
    ),
  });

  if (existing) {
    return {
      ok: true as const,
      sessionId: existing.id,
      deadlineAt: existing.deadlineAt.toISOString(),
      status: existing.status,
    };
  }

  // Calculate strict deadline: LEAST(now + duration, scheduledEnd)
  const now = new Date();
  const durationEnd = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);
  let deadlineAt = durationEnd;

  if (exam.scheduledEnd) {
    const windowEnd = new Date(exam.scheduledEnd);
    if (windowEnd < durationEnd) {
      deadlineAt = windowEnd;
    }
  }

  // Fetch questions to compute deterministic layout
  const examQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, examId));

  const layout = makeLayout(
    {
      shuffleQuestions: exam.shuffleQuestions,
      shuffleOptions: exam.shuffleOptions,
    },
    examQuestions
  );

  const [created] = await db
    .insert(examSessions)
    .values({
      examId,
      studentId: user.id,
      attemptNo: 1,
      status: "in_progress",
      startedAt: now,
      deadlineAt,
      consentAt: now,
      consentVersion: consentVersion || CONSENT_VERSION,
      layout,
    })
    .returning({ id: examSessions.id });

  return {
    ok: true as const,
    sessionId: created.id,
    deadlineAt: deadlineAt.toISOString(),
    status: "in_progress",
  };
}

export async function getPaper(sessionId: string) {
  const authSession = await requireRole(["student", "admin"]);
  const user = authSession.user as any;

  const session = await db.query.examSessions.findFirst({
    where: eq(examSessions.id, sessionId),
  });

  if (!session) {
    return { ok: false as const, error: "Exam session not found." };
  }

  if (user.role !== "admin" && session.studentId !== user.id) {
    return { ok: false as const, error: "Unauthorized access to exam session." };
  }

  const now = new Date();
  const deadlineWithGrace = new Date(
    session.deadlineAt.getTime() + GRACE_PERIOD_MS
  );

  // Lazy finalization if deadline expired
  if (session.status === "in_progress" && now > deadlineWithGrace) {
    await finalizeSession(sessionId, "timeout");
  }

  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, session.examId),
  });

  const examQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, session.examId));

  const sanitizedPaper = buildPaper(examQuestions, session.layout);

  const savedAnswers = await db
    .select()
    .from(studentAnswers)
    .where(eq(studentAnswers.sessionId, sessionId));

  return {
    ok: true as const,
    session: {
      id: session.id,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      deadlineAt: session.deadlineAt.toISOString(),
      score: exam?.showScoreOnSubmit ? session.score : null,
      maxScore: session.maxScore,
    },
    exam: {
      id: exam?.id,
      title: exam?.title,
      durationMinutes: exam?.durationMinutes,
      requireCamera: exam?.requireCamera,
      enforceFullscreen: exam?.enforceFullscreen,
      showScoreOnSubmit: exam?.showScoreOnSubmit,
    },
    paper: sanitizedPaper,
    savedAnswers: savedAnswers.map((a) => ({
      questionId: a.questionId,
      answerText: a.answerText || "",
      clientTs: a.clientTs,
    })),
  };
}

export async function saveAnswers(
  sessionId: string,
  incomingAnswers: { questionId: string; answerText: string; clientTs: number }[]
) {
  const authSession = await requireRole(["student", "admin"]);
  const user = authSession.user as any;

  const session = await db.query.examSessions.findFirst({
    where: eq(examSessions.id, sessionId),
  });

  if (!session || (user.role !== "admin" && session.studentId !== user.id)) {
    return { ok: false as const, error: "Unauthorized or invalid session." };
  }

  if (session.status !== "in_progress") {
    return { ok: false as const, error: "Exam session is already submitted." };
  }

  const now = new Date();
  const deadlineWithGrace = new Date(
    session.deadlineAt.getTime() + GRACE_PERIOD_MS
  );

  if (now > deadlineWithGrace) {
    await finalizeSession(sessionId, "timeout");
    return { ok: false as const, error: "Time expired for this exam." };
  }

  let savedCount = 0;

  for (const item of incomingAnswers) {
    const existing = await db.query.studentAnswers.findFirst({
      where: and(
        eq(studentAnswers.sessionId, sessionId),
        eq(studentAnswers.questionId, item.questionId)
      ),
    });

    // Stale timestamp guard: discard older write arriving late
    if (existing && existing.clientTs >= item.clientTs) {
      continue;
    }

    await db
      .insert(studentAnswers)
      .values({
        sessionId,
        questionId: item.questionId,
        answerText: item.answerText,
        clientTs: item.clientTs,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [studentAnswers.sessionId, studentAnswers.questionId],
        set: {
          answerText: item.answerText,
          clientTs: item.clientTs,
          updatedAt: new Date(),
        },
      });

    savedCount++;
  }

  return { ok: true as const, savedCount };
}

export async function submitSession(
  sessionId: string,
  reason: "student" | "timeout" = "student"
) {
  const authSession = await requireRole(["student", "admin"]);
  const user = authSession.user as any;

  const session = await db.query.examSessions.findFirst({
    where: eq(examSessions.id, sessionId),
  });

  if (!session || (user.role !== "admin" && session.studentId !== user.id)) {
    return { ok: false as const, error: "Unauthorized." };
  }

  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, session.examId),
  });

  const finalized = await finalizeSession(sessionId, reason);

  return {
    ok: true as const,
    score: exam?.showScoreOnSubmit ? finalized?.score : null,
    maxScore: finalized?.maxScore,
    showScore: Boolean(exam?.showScoreOnSubmit),
  };
}

export async function getStudentSessions() {
  const authSession = await requireRole(["student", "admin"]);
  const user = authSession.user as any;

  return await db
    .select({
      id: examSessions.id,
      examId: examSessions.examId,
      examTitle: exams.title,
      status: examSessions.status,
      startedAt: examSessions.startedAt,
      submittedAt: examSessions.submittedAt,
      deadlineAt: examSessions.deadlineAt,
      score: examSessions.score,
      maxScore: examSessions.maxScore,
      showScoreOnSubmit: exams.showScoreOnSubmit,
    })
    .from(examSessions)
    .innerJoin(exams, eq(examSessions.examId, exams.id))
    .where(eq(examSessions.studentId, user.id))
    .orderBy(desc(examSessions.startedAt));
}
