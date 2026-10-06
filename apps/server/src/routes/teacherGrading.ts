import { FastifyInstance } from "fastify";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  exams,
  questions,
  examSessions,
  studentAnswers,
  user as userTable,
} from "@xsam/db";
import { requireRole } from "../lib/auth-middleware";
import { getOwnedExam } from "../lib/exams";
import { gradeSession } from "../lib/exam/grade";

export async function teacherGradingRoutes(app: FastifyInstance) {
  // 1. Get exam results list
  app.get("/api/teacher/exams/:examId/results", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;
    const { examId } = req.params as { examId: string };

    const exam = await getOwnedExam(examId, user);
    if (!exam) return reply.status(404).send({ error: "Exam not found." });

    const sessions = await db
      .select({
        sessionId: examSessions.id,
        studentId: examSessions.studentId,
        studentName: userTable.name,
        studentEmail: userTable.email,
        studentNumber: userTable.studentNumber,
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
      .innerJoin(userTable, eq(examSessions.studentId, userTable.id))
      .where(eq(examSessions.examId, examId))
      .orderBy(desc(examSessions.startedAt));

    const rows = sessions.map((s) => {
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

    return reply.send(rows);
  });

  // 2. Get pending manual grading queue
  app.get("/api/teacher/exams/:examId/grading-queue", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;
    const { examId } = req.params as { examId: string };

    const exam = await getOwnedExam(examId, user);
    if (!exam) return reply.status(404).send({ error: "Exam not found." });

    const examQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.examId, examId));

    const questionsMap = new Map(examQuestions.map((q) => [q.id, q]));

    const sessions = await db
      .select({
        sessionId: examSessions.id,
        studentId: examSessions.studentId,
        studentName: userTable.name,
        studentNumber: userTable.studentNumber,
        submittedAt: examSessions.submittedAt,
      })
      .from(examSessions)
      .innerJoin(userTable, eq(examSessions.studentId, userTable.id))
      .where(
        and(
          eq(examSessions.examId, examId),
          eq(examSessions.status, "submitted")
        )
      );

    if (sessions.length === 0) return reply.send([]);

    const sessionIds = sessions.map((s) => s.sessionId);
    const sessionMap = new Map(sessions.map((s) => [s.sessionId, s]));

    const answers = await db
      .select()
      .from(studentAnswers)
      .where(inArray(studentAnswers.sessionId, sessionIds));

    const queue: any[] = [];

    for (const ans of answers) {
      const q = questionsMap.get(ans.questionId);
      if (!q) continue;

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

    queue.sort((a, b) => a.questionOrder - b.questionOrder || a.studentName.localeCompare(b.studentName));
    return reply.send(queue);
  });

  // 3. Grade a student's answer manually
  app.post("/api/teacher/grading/grade-answer", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;

    const body = (req.body || {}) as {
      sessionId: string;
      questionId: string;
      pointsAwarded: number;
      isCorrect?: boolean;
    };

    if (!body.sessionId || !body.questionId || body.pointsAwarded === undefined) {
      return reply.status(400).send({ error: "Missing required grading fields." });
    }

    await db
      .insert(studentAnswers)
      .values({
        sessionId: body.sessionId,
        questionId: body.questionId,
        pointsAwarded: String(body.pointsAwarded),
        isCorrect: body.isCorrect ?? (body.pointsAwarded > 0),
        manualGrade: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [studentAnswers.sessionId, studentAnswers.questionId],
        set: {
          pointsAwarded: String(body.pointsAwarded),
          isCorrect: body.isCorrect ?? (body.pointsAwarded > 0),
          manualGrade: true,
          updatedAt: new Date(),
        },
      });

    const recomputed = await gradeSession(body.sessionId);

    return reply.send({
      ok: true,
      sessionScore: recomputed?.score,
      maxScore: recomputed?.maxScore,
      fullyGraded: recomputed?.fullyGraded,
    });
  });
}
