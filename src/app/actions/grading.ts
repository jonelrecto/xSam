"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  exams,
  questions,
  examSessions,
  studentAnswers,
  user,
  type Question,
  type StudentAnswer,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-server";
import { getOwnedExam } from "@/lib/exams";
import { gradeSession } from "@/lib/exam/grade";

export interface StudentResultRow {
  sessionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentNumber: string | null;
  attemptNo: number;
  status: "in_progress" | "submitted";
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  fullyGraded: boolean;
  submitReason: string | null;
  startedAt: string;
  submittedAt: string | null;
  violationSummary: Record<string, number>;
  reviewOutcome: string;
}

export async function getExamResults(examId: string): Promise<StudentResultRow[]> {
  await getOwnedExam(examId);

  const sessions = await db
    .select({
      sessionId: examSessions.id,
      studentId: examSessions.studentId,
      studentName: user.name,
      studentEmail: user.email,
      studentNumber: user.studentNumber,
      attemptNo: examSessions.attemptNo,
      status: examSessions.status,
      score: examSessions.score,
      maxScore: examSessions.maxScore,
      fullyGraded: examSessions.fullyGraded,
      submitReason: examSessions.submitReason,
      startedAt: examSessions.startedAt,
      submittedAt: examSessions.submittedAt,
      violationSummary: examSessions.violationSummary,
      reviewOutcome: examSessions.reviewOutcome,
    })
    .from(examSessions)
    .innerJoin(user, eq(examSessions.studentId, user.id))
    .where(eq(examSessions.examId, examId))
    .orderBy(desc(examSessions.startedAt));

  return sessions.map((s) => {
    const numScore = s.score !== null ? Number(s.score) : null;
    const numMax = s.maxScore !== null ? Number(s.maxScore) : null;
    const percentage =
      numScore !== null && numMax !== null && numMax > 0
        ? Math.round((numScore / numMax) * 100)
        : null;

    return {
      sessionId: s.sessionId,
      studentId: s.studentId,
      studentName: s.studentName,
      studentEmail: s.studentEmail,
      studentNumber: s.studentNumber,
      attemptNo: s.attemptNo,
      status: s.status,
      score: numScore,
      maxScore: numMax,
      percentage,
      fullyGraded: s.fullyGraded,
      submitReason: s.submitReason,
      startedAt: s.startedAt.toISOString(),
      submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
      violationSummary: s.violationSummary || {},
      reviewOutcome: s.reviewOutcome,
    };
  });
}

export interface PendingGradingItem {
  answerId: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  questionId: string;
  questionOrder: number;
  questionType: string;
  prompt: string;
  promptJson: any;
  maxPoints: number;
  answerText: string | null;
  pointsAwarded: number | null;
  manualGrade: boolean;
  submittedAt: string | null;
}

export async function getGradingQueue(examId: string): Promise<PendingGradingItem[]> {
  await getOwnedExam(examId);

  // 1. Get all questions for this exam
  const examQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, examId));

  const questionsMap = new Map(examQuestions.map((q) => [q.id, q]));

  // 2. Get all submitted sessions
  const sessions = await db
    .select({
      sessionId: examSessions.id,
      studentId: examSessions.studentId,
      studentName: user.name,
      studentNumber: user.studentNumber,
      submittedAt: examSessions.submittedAt,
    })
    .from(examSessions)
    .innerJoin(user, eq(examSessions.studentId, user.id))
    .where(
      and(
        eq(examSessions.examId, examId),
        eq(examSessions.status, "submitted")
      )
    );

  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.sessionId);
  const sessionMap = new Map(sessions.map((s) => [s.sessionId, s]));

  // 3. Get all answers for these sessions
  const answers = await db
    .select()
    .from(studentAnswers)
    .where(inArray(studentAnswers.sessionId, sessionIds));

  const queue: PendingGradingItem[] = [];

  for (const ans of answers) {
    const q = questionsMap.get(ans.questionId);
    if (!q) continue;

    // Items needing manual grading: essays or answers where manualGrade is false and pointsAwarded is null
    const isManualItem = q.type === "essay" || (!ans.manualGrade && ans.pointsAwarded === null);

    if (isManualItem) {
      const sess = sessionMap.get(ans.sessionId);
      if (!sess) continue;

      queue.push({
        answerId: ans.id,
        sessionId: ans.sessionId,
        studentId: sess.studentId,
        studentName: sess.studentName,
        studentNumber: sess.studentNumber,
        questionId: q.id,
        questionOrder: q.orderIndex,
        questionType: q.type,
        prompt: q.prompt,
        promptJson: q.promptJson,
        maxPoints: Number(q.points),
        answerText: ans.answerText,
        pointsAwarded: ans.pointsAwarded !== null ? Number(ans.pointsAwarded) : null,
        manualGrade: ans.manualGrade,
        submittedAt: sess.submittedAt ? sess.submittedAt.toISOString() : null,
      });
    }
  }

  // Sort by question order, then student name
  queue.sort((a, b) => a.questionOrder - b.questionOrder || a.studentName.localeCompare(b.studentName));
  return queue;
}

export async function gradeStudentAnswerAction(
  sessionId: string,
  questionId: string,
  pointsAwarded: number,
  isCorrect?: boolean
) {
  const session = await requireRole(["teacher", "admin"]);
  const user = session.user as any;

  // 1. Update or insert student answer with manual score
  await db
    .insert(studentAnswers)
    .values({
      sessionId,
      questionId,
      pointsAwarded: String(pointsAwarded),
      isCorrect: isCorrect ?? (pointsAwarded > 0),
      manualGrade: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [studentAnswers.sessionId, studentAnswers.questionId],
      set: {
        pointsAwarded: String(pointsAwarded),
        isCorrect: isCorrect ?? (pointsAwarded > 0),
        manualGrade: true,
        updatedAt: new Date(),
      },
    });

  // 2. Re-grade session to recompute total score & check if fully graded
  const recomputed = await gradeSession(sessionId);

  return {
    ok: true as const,
    sessionScore: recomputed?.score,
    maxScore: recomputed?.maxScore,
    fullyGraded: recomputed?.fullyGraded,
  };
}

export async function exportExamResultsCsv(examId: string): Promise<string> {
  const results = await getExamResults(examId);

  const headers = [
    "Student Name",
    "Student Number",
    "Email",
    "Attempt",
    "Status",
    "Score",
    "Max Score",
    "Percentage",
    "Fully Graded",
    "Submit Reason",
    "Violations Total",
    "Started At",
    "Submitted At",
  ];

  const rows = results.map((r) => [
    `"${r.studentName.replace(/"/g, '""')}"`,
    `"${(r.studentNumber || "").replace(/"/g, '""')}"`,
    `"${r.studentEmail.replace(/"/g, '""')}"`,
    r.attemptNo,
    r.status,
    r.score !== null ? r.score : "N/A",
    r.maxScore !== null ? r.maxScore : "N/A",
    r.percentage !== null ? `${r.percentage}%` : "N/A",
    r.fullyGraded ? "Yes" : "No",
    r.submitReason || "—",
    Object.values(r.violationSummary || {}).reduce((a, b) => a + Number(b), 0),
    r.startedAt,
    r.submittedAt || "—",
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}
