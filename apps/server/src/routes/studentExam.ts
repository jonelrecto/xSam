import { FastifyInstance } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  exams,
  questions,
  examSessions,
  studentAnswers,
  type Question,
} from "@xsam/db";
import { evaluateAvailability, makeLayout, buildPaper } from "@xsam/shared";
import { requireRole } from "../lib/auth-middleware";
import { finalizeSession } from "../lib/exam/finalize";

const GRACE_PERIOD_MS = 10_000;
const CONSENT_VERSION = "2026-09";

// In-Memory Exam Paper Cache to prevent 500 duplicate DB question queries at 9:00 AM
const examPaperCache = new Map<string, { questions: Question[]; expiresAt: number }>();

export function invalidateExamCache(examId: string) {
  examPaperCache.delete(examId);
}

export async function studentExamRoutes(app: FastifyInstance) {
  // 1. Lookup Exam by 6-digit access code OR examId
  app.post("/api/student/lookup", async (req, reply) => {
    const { accessCode, examId } = (req.body || {}) as {
      accessCode?: string;
      examId?: string;
    };

    let exam;
    if (examId) {
      exam = await db.query.exams.findFirst({
        where: eq(exams.id, examId),
      });
    } else {
      const code = (accessCode || "").trim().toUpperCase();
      if (code.length < 4) {
        return reply.status(400).send({ error: "Please enter a valid access code." });
      }
      exam = await db.query.exams.findFirst({
        where: eq(exams.accessCode, code),
      });
    }

    if (!exam) {
      return reply.status(404).send({
        error: examId
          ? "Exam not found or unavailable."
          : "No examination found with this access code.",
      });
    }

    const availability = evaluateAvailability(exam);

    const qs = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(questions)
      .where(eq(questions.examId, exam.id));
    const questionCount = qs[0]?.count || 0;

    return reply.send({
      ok: true,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        requireCamera: exam.requireCamera,
        enforceFullscreen: exam.enforceFullscreen,
        restrictInput: exam.restrictInput,
        questionCount,
        status: exam.status,
        availability,
        scheduledStart: exam.scheduledStart,
        scheduledEnd: exam.scheduledEnd,
      },
    });
  });

  // 1b. Direct Preflight Lookup for Student
  app.get("/api/student/exams/:examId/preflight", async (req, reply) => {
    const { examId } = req.params as { examId: string };
    const exam = await db.query.exams.findFirst({
      where: eq(exams.id, examId),
    });

    if (!exam) {
      return reply.status(404).send({ error: "Exam not found or unavailable." });
    }

    const availability = evaluateAvailability(exam);

    const qs = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(questions)
      .where(eq(questions.examId, exam.id));
    const questionCount = qs[0]?.count || 0;

    return reply.send({
      ok: true,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        requireCamera: exam.requireCamera,
        enforceFullscreen: exam.enforceFullscreen,
        restrictInput: exam.restrictInput,
        questionCount,
        status: exam.status,
        availability,
        scheduledStart: exam.scheduledStart,
        scheduledEnd: exam.scheduledEnd,
      },
    });
  });

  // 2. Start Exam Attempt & Compute Deterministic Shuffled Layout
  app.post("/api/student/sessions/start", async (req, reply) => {
    const authSession = await requireRole(["student", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;

    const { examId, consentVersion } = (req.body || {}) as {
      examId?: string;
      consentVersion?: string;
    };

    if (!examId) {
      return reply.status(400).send({ error: "Exam ID is required." });
    }

    const exam = await db.query.exams.findFirst({
      where: eq(exams.id, examId),
    });

    if (!exam) {
      return reply.status(404).send({ error: "Exam not found." });
    }

    const availability = evaluateAvailability(exam);
    if (availability !== "open") {
      return reply.status(403).send({
        error: `This exam is currently ${availability.replace("_", " ")}.`,
      });
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
      return reply.send({
        ok: true,
        sessionId: existing.id,
        deadlineAt: existing.deadlineAt.toISOString(),
        status: existing.status,
      });
    }

    const now = new Date();
    const durationEnd = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);
    let deadlineAt = durationEnd;

    if (exam.scheduledEnd) {
      const windowEnd = new Date(exam.scheduledEnd);
      if (windowEnd < durationEnd) {
        deadlineAt = windowEnd;
      }
    }

    // Fetch questions with in-memory caching
    let cached = examPaperCache.get(examId);
    if (!cached || cached.expiresAt < Date.now()) {
      const qs = await db
        .select()
        .from(questions)
        .where(eq(questions.examId, examId));
      cached = { questions: qs, expiresAt: Date.now() + 60_000 * 10 }; // 10m TTL
      examPaperCache.set(examId, cached);
    }

    const layout = makeLayout(
      {
        shuffleQuestions: exam.shuffleQuestions,
        shuffleOptions: exam.shuffleOptions,
      },
      cached.questions
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

    return reply.status(201).send({
      ok: true,
      sessionId: created.id,
      deadlineAt: deadlineAt.toISOString(),
      status: "in_progress",
    });
  });

  // 3. Fetch Zero-Knowledge Paper for Student Runner
  app.get("/api/student/sessions/:sessionId/paper", async (req, reply) => {
    const authSession = await requireRole(["student", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;
    const { sessionId } = req.params as { sessionId: string };

    const session = await db.query.examSessions.findFirst({
      where: eq(examSessions.id, sessionId),
    });

    if (!session) {
      return reply.status(404).send({ error: "Exam session not found." });
    }

    if (user.role !== "admin" && session.studentId !== user.id) {
      return reply.status(403).send({ error: "Unauthorized access to exam session." });
    }

    const now = new Date();
    const deadlineWithGrace = new Date(
      session.deadlineAt.getTime() + GRACE_PERIOD_MS
    );

    if (session.status === "in_progress" && now > deadlineWithGrace) {
      await finalizeSession(sessionId, "timeout");
    }

    const exam = await db.query.exams.findFirst({
      where: eq(exams.id, session.examId),
    });

    // In-memory cached question paper
    let cached = examPaperCache.get(session.examId);
    if (!cached || cached.expiresAt < Date.now()) {
      const qs = await db
        .select()
        .from(questions)
        .where(eq(questions.examId, session.examId));
      cached = { questions: qs, expiresAt: Date.now() + 60_000 * 10 };
      examPaperCache.set(session.examId, cached);
    }

    const sanitizedPaper = buildPaper(cached.questions, session.layout);

    const savedAnswers = await db
      .select()
      .from(studentAnswers)
      .where(eq(studentAnswers.sessionId, sessionId));

    return reply.send({
      ok: true,
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
    });
  });

  // 4. Submit Exam Session
  app.post("/api/student/sessions/:sessionId/submit", async (req, reply) => {
    const authSession = await requireRole(["student", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;
    const { sessionId } = req.params as { sessionId: string };
    const { reason } = (req.body || {}) as { reason?: "student" | "timeout" };

    const session = await db.query.examSessions.findFirst({
      where: eq(examSessions.id, sessionId),
    });

    if (!session || (user.role !== "admin" && session.studentId !== user.id)) {
      return reply.status(403).send({ error: "Unauthorized." });
    }

    const exam = await db.query.exams.findFirst({
      where: eq(exams.id, session.examId),
    });

    const finalized = await finalizeSession(sessionId, reason || "student");

    return reply.send({
      ok: true,
      score: exam?.showScoreOnSubmit ? finalized?.score : null,
      maxScore: finalized?.maxScore,
      showScore: Boolean(exam?.showScoreOnSubmit),
    });
  });

  // 5. List Student Exam Sessions History
  app.get("/api/student/sessions", async (req, reply) => {
    const authSession = await requireRole(["student", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;

    const list = await db
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

    return reply.send(list);
  });
}
