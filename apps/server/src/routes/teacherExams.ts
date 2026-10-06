import { FastifyInstance } from "fastify";
import { and, asc, count, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import {
  db,
  exams,
  questions,
  examSessions,
  categories,
  questionBank,
  examEditLog,
  type Question,
} from "@xsam/db";
import {
  examDetailsSchema,
  saveDraftSchema,
  publishableQuestionSchema,
  canEditExam,
  computeExamDisplayStatus,
} from "@xsam/shared";
import { requireRole } from "../lib/auth-middleware";
import { getOwnedExam } from "../lib/exams";
import { computeQuestionHash } from "../lib/exam/bank-hash";
import { syncConfirmedQuestionsToBank } from "../lib/exam/sync-bank";
import { plainTextToTiptap, tiptapToPlainText } from "@xsam/shared";
import { getExamAnalytics } from "../lib/exam/analytics";

const generateAccessCode = customAlphabet(
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZ",
  6
);

export async function teacherExamRoutes(app: FastifyInstance) {
  // 1. List all exams owned by the teacher
  app.get("/api/teacher/exams", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;

    const teacherExams = await db
      .select({
        id: exams.id,
        title: exams.title,
        description: exams.description,
        status: exams.status,
        durationMinutes: exams.durationMinutes,
        passingPercent: exams.passingPercent,
        accessCode: exams.accessCode,
        categoryName: categories.name,
        categoryColor: categories.color,
        scheduledStart: exams.scheduledStart,
        scheduledEnd: exams.scheduledEnd,
        createdAt: exams.createdAt,
      })
      .from(exams)
      .leftJoin(categories, eq(exams.categoryId, categories.id))
      .where(user.role === "admin" ? undefined : eq(exams.teacherId, user.id))
      .orderBy(desc(exams.createdAt));

    const examIds = teacherExams.map((e) => e.id);

    const questionCounts = examIds.length
      ? await db
          .select({ examId: questions.examId, total: count() })
          .from(questions)
          .where(inArray(questions.examId, examIds))
          .groupBy(questions.examId)
      : [];

    const sessionStats = examIds.length
      ? await db
          .select({
            examId: examSessions.examId,
            total: count(),
            submitted: count(sql`CASE WHEN ${examSessions.status} = 'submitted' THEN 1 END`),
            ungraded: count(
              sql`CASE WHEN ${examSessions.status} = 'submitted' AND ${examSessions.fullyGraded} = false THEN 1 END`
            ),
          })
          .from(examSessions)
          .where(inArray(examSessions.examId, examIds))
          .groupBy(examSessions.examId)
      : [];

    const qCountMap = new Map(questionCounts.map((q) => [q.examId, q.total]));
    const sStatMap = new Map(sessionStats.map((s) => [s.examId, s]));

    const enriched = teacherExams.map((exam) => {
      const stats = sStatMap.get(exam.id) || { total: 0, submitted: 0, ungraded: 0 };
      const displayStatus = computeExamDisplayStatus({
        status: exam.status,
        scheduledStart: exam.scheduledStart,
        scheduledEnd: exam.scheduledEnd,
        totalSessions: Number(stats.total),
        submittedSessions: Number(stats.submitted),
        ungradedSessions: Number(stats.ungraded),
      });

      return {
        ...exam,
        questionCount: qCountMap.get(exam.id) || 0,
        totalSessions: Number(stats.total),
        submittedSessions: Number(stats.submitted),
        ungradedSessions: Number(stats.ungraded),
        displayStatus,
      };
    });

    return reply.send(enriched);
  });

  // 2. Get single exam with questions
  app.get("/api/teacher/exams/:examId", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;
    const { examId } = req.params as { examId: string };

    const exam = await getOwnedExam(examId, user);
    if (!exam) {
      return reply.status(404).send({ error: "Exam not found or access denied." });
    }

    const [sessionCountRes] = await db
      .select({ total: count() })
      .from(examSessions)
      .where(eq(examSessions.examId, examId));
    const sessionCount = Number(sessionCountRes?.total || 0);
    const isEditable = canEditExam(exam, sessionCount);

    const questionRows = await db
      .select()
      .from(questions)
      .where(eq(questions.examId, examId))
      .orderBy(asc(questions.orderIndex));

    return reply.send({
      exam,
      isEditable,
      sessionCount,
      questions: questionRows,
    });
  });

  // 3. Exam Analytics
  app.get("/api/teacher/exams/:examId/analytics", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;
    const { examId } = req.params as { examId: string };

    const analytics = await getExamAnalytics(examId, user);
    if (!analytics) {
      return reply.status(404).send({ error: "Exam not found." });
    }

    return reply.send(analytics);
  });

  // 4. Create new exam
  app.post("/api/teacher/exams", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;

    const parsed = examDetailsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }

    const d = parsed.data;

    try {
      const [row] = await db
        .insert(exams)
        .values({
          teacherId: user.id,
          categoryId: d.categoryId || null,
          title: d.title,
          description: d.description || null,
          durationMinutes: d.durationMinutes,
          passingPercent: d.passingPercent || 60,
          shuffleQuestions: d.shuffleQuestions,
          shuffleOptions: d.shuffleOptions,
          requireCamera: d.requireCamera,
          showScoreOnSubmit: d.showScoreOnSubmit,
          enforceFullscreen: d.enforceFullscreen,
          restrictInput: d.restrictInput ?? false,
          scheduledStart: d.scheduledStart ? new Date(d.scheduledStart) : null,
          scheduledEnd: new Date(d.scheduledEnd),
        })
        .returning({ id: exams.id });

      return reply.status(201).send({ ok: true, id: row.id });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message || "Failed to create exam" });
    }
  });

  // 5. Update exam details
  app.put("/api/teacher/exams/:examId/details", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;
    const { examId } = req.params as { examId: string };

    const exam = await getOwnedExam(examId, user);
    if (!exam) return reply.status(404).send({ error: "Exam not found." });

    const [sessionCountRes] = await db
      .select({ count: count() })
      .from(examSessions)
      .where(eq(examSessions.examId, examId));
    const sessionCount = Number(sessionCountRes?.count || 0);

    if (!canEditExam(exam, sessionCount)) {
      return reply.status(400).send({
        error: "This exam is locked because student sessions exist or start time has passed.",
      });
    }

    const parsed = examDetailsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }

    const d = parsed.data;

    try {
      await db
        .update(exams)
        .set({
          categoryId: d.categoryId || null,
          title: d.title,
          description: d.description || null,
          durationMinutes: d.durationMinutes,
          passingPercent: d.passingPercent,
          shuffleQuestions: d.shuffleQuestions,
          shuffleOptions: d.shuffleOptions,
          requireCamera: d.requireCamera,
          showScoreOnSubmit: d.showScoreOnSubmit,
          enforceFullscreen: d.enforceFullscreen,
          restrictInput: d.restrictInput ?? false,
          scheduledStart: d.scheduledStart ? new Date(d.scheduledStart) : null,
          scheduledEnd: new Date(d.scheduledEnd),
        })
        .where(eq(exams.id, examId));

      return reply.send({ ok: true });
    } catch (error: any) {
      return reply.status(500).send({ error: error.message || "Failed to update exam details" });
    }
  });

  // 6. Autosave draft questions
  app.post("/api/teacher/exams/:examId/questions/batch", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;
    const { examId } = req.params as { examId: string };

    const exam = await getOwnedExam(examId, user);
    if (!exam) return reply.status(404).send({ error: "Exam not found." });

    const [sessionCountRes] = await db
      .select({ count: count() })
      .from(examSessions)
      .where(eq(examSessions.examId, examId));
    const sessionCount = Number(sessionCountRes?.count || 0);

    if (!canEditExam(exam, sessionCount)) {
      return reply.status(400).send({
        error: "This exam is locked from question modifications.",
      });
    }

    const parsed = saveDraftSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }

    const items = parsed.data;

    try {
      const persistedQuestions = await db.transaction(async (tx) => {
        const existingRows = await tx
          .select({ id: questions.id })
          .from(questions)
          .where(eq(questions.examId, examId));

        const existingIdSet = new Set(existingRows.map((r) => r.id));

        const incomingDbIds = items
          .map((q) => q.id)
          .filter((id): id is string => typeof id === "string" && existingIdSet.has(id));

        const idsToDelete = existingRows
          .map((r) => r.id)
          .filter((id) => !incomingDbIds.includes(id));

        if (idsToDelete.length > 0) {
          await tx.delete(questions).where(inArray(questions.id, idsToDelete));
        }

        const questionResults: { clientTempId: string; dbId: string }[] = [];

        for (let i = 0; i < items.length; i++) {
          const q = items[i];
          const orderIndex = i + 1;
          const pointsStr = String(q.points ?? 1.0);

          const promptJson =
            q.promptJson && typeof q.promptJson === "object"
              ? q.promptJson
              : plainTextToTiptap(q.prompt, q.underlined);
          const promptText = q.prompt || tiptapToPlainText(promptJson);

          if (q.id && existingIdSet.has(q.id)) {
            await tx
              .update(questions)
              .set({
                orderIndex,
                type: q.type,
                prompt: promptText,
                promptJson,
                options: q.options,
                answers: q.answers,
                answerSource: q.answerSource,
                confirmed: q.confirmed,
                points: pointsStr,
                sourcePage: q.sourcePage || null,
                warnings: q.warnings,
                tags: q.tags,
                categoryId: q.categoryId || null,
                bankQuestionId: q.bankQuestionId || null,
                context: q.context || null,
                contextJson: q.contextJson || null,
                instructions: q.instructions || null,
                instructionsJson: q.instructionsJson || null,
                underlined: q.underlined || null,
              })
              .where(eq(questions.id, q.id));

            questionResults.push({ clientTempId: q.tempId, dbId: q.id });
          } else {
            const [inserted] = await tx
              .insert(questions)
              .values({
                examId,
                orderIndex,
                type: q.type,
                prompt: promptText,
                promptJson,
                options: q.options,
                answers: q.answers,
                answerSource: q.answerSource,
                confirmed: q.confirmed,
                points: pointsStr,
                sourcePage: q.sourcePage || null,
                warnings: q.warnings,
                tags: q.tags,
                categoryId: q.categoryId || null,
                bankQuestionId: q.bankQuestionId || null,
                context: q.context || null,
                contextJson: q.contextJson || null,
                instructions: q.instructions || null,
                instructionsJson: q.instructionsJson || null,
                underlined: q.underlined || null,
              })
              .returning({ id: questions.id });

            questionResults.push({ clientTempId: q.tempId, dbId: inserted.id });
          }
        }

        const newVersion = (exam.draftVersion || 0) + 1;
        await tx
          .update(exams)
          .set({ draftVersion: newVersion })
          .where(eq(exams.id, examId));

        return { questionResults, newVersion };
      });

      return reply.send({
        ok: true,
        version: persistedQuestions.newVersion,
        idMap: persistedQuestions.questionResults,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to save draft" });
    }
  });

  // 7. Publish draft exam
  app.post("/api/teacher/exams/:examId/publish", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;
    const { examId } = req.params as { examId: string };

    const exam = await getOwnedExam(examId, user);
    if (!exam) return reply.status(404).send({ error: "Exam not found." });

    const questionRows = await db
      .select()
      .from(questions)
      .where(eq(questions.examId, examId))
      .orderBy(asc(questions.orderIndex));

    if (questionRows.length === 0) {
      return reply.status(400).send({ error: "Cannot publish an exam without questions." });
    }

    const validationErrors: { questionIndex: number; message: string }[] = [];

    questionRows.forEach((q, idx) => {
      const parsed = publishableQuestionSchema.safeParse({
        ...q,
        tempId: q.id,
        order: q.orderIndex,
        points: Number(q.points),
        warnings: q.warnings || [],
        tags: q.tags || [],
      });

      if (!parsed.success) {
        parsed.error.errors.forEach((err) => {
          validationErrors.push({
            questionIndex: idx + 1,
            message: `Q${idx + 1}: ${err.message}`,
          });
        });
      }
    });

    if (validationErrors.length > 0) {
      return reply.status(422).send({
        error: "Validation failed before publish.",
        issues: validationErrors,
      });
    }

    // Generate unique 6-char access code if absent
    let accessCode = exam.accessCode;
    if (!accessCode) {
      let uniqueFound = false;
      while (!uniqueFound) {
        const candidate = generateAccessCode();
        const existing = await db.query.exams.findFirst({
          where: eq(exams.accessCode, candidate),
        });
        if (!existing) {
          accessCode = candidate;
          uniqueFound = true;
        }
      }
    }

    await db
      .update(exams)
      .set({
        status: "published",
        accessCode,
      })
      .where(eq(exams.id, examId));

    // Auto-sync confirmed questions into teacher's Question Bank
    try {
      await syncConfirmedQuestionsToBank(examId, exam.teacherId);
    } catch (bankSyncErr) {
      console.error("Failed to sync questions to bank upon publish:", bankSyncErr);
    }

    return reply.send({
      ok: true,
      accessCode,
      status: "published",
    });
  });

  // 8. Delete draft exam
  app.delete("/api/teacher/exams/:examId", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;
    const { examId } = req.params as { examId: string };

    const exam = await getOwnedExam(examId, user);
    if (!exam) return reply.status(404).send({ error: "Exam not found." });

    const [sessionCountRes] = await db
      .select({ count: count() })
      .from(examSessions)
      .where(eq(examSessions.examId, examId));
    const sessionCount = Number(sessionCountRes?.count || 0);

    if (sessionCount > 0) {
      return reply.status(400).send({
        error: "Cannot delete an exam that has recorded student attempts.",
      });
    }

    await db.delete(exams).where(eq(exams.id, examId));
    return reply.send({ ok: true });
  });
}
