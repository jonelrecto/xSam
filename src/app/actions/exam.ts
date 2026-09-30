"use server";

import { and, asc, count, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import {
  exams,
  questions,
  examSessions,
  categories,
  questionBank,
  examEditLog,
  type Question,
} from "@/lib/db/schema";
import { getOwnedExam } from "@/lib/exams";
import { requireRole } from "@/lib/auth-server";
import {
  examDetailsSchema,
  saveDraftSchema,
  publishableQuestionSchema,
} from "@/lib/schemas/exam";
import { canEditExam, computeExamDisplayStatus, type ExamDisplayStatus } from "@/lib/exam/lifecycle";
import { computeQuestionHash } from "@/lib/exam/bank-hash";
import { plainTextToTiptap, tiptapToPlainText } from "@/lib/editor/converters";

// 6-character access code excluding ambiguous characters (0, O, 1, I)
const generateAccessCode = customAlphabet(
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZ",
  6
);

export async function createExam(input: unknown) {
  const session = await requireRole(["teacher", "admin"]);
  const user = session.user as any;

  const parsed = examDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0].message };
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
        scheduledStart: d.scheduledStart ? new Date(d.scheduledStart) : null,
        scheduledEnd: new Date(d.scheduledEnd),
      })
      .returning({ id: exams.id });

    return { ok: true as const, id: row.id };
  } catch (error: any) {
    return {
      ok: false as const,
      error: error.message || "Failed to create exam",
    };
  }
}

export async function updateExamSettings(examId: string, input: unknown) {
  const session = await requireRole(["teacher", "admin"]);
  const user = session.user as any;
  const exam = await getOwnedExam(examId);

  // 1. Session count for lifecycle lock check
  const [sessionCountRes] = await db
    .select({ count: count() })
    .from(examSessions)
    .where(eq(examSessions.examId, examId));
  const sessionCount = Number(sessionCountRes?.count || 0);

  if (!canEditExam(exam, sessionCount)) {
    return {
      ok: false as const,
      error:
        "This exam is locked from modifications because students have already started or the availability start time has passed.",
    };
  }

  const parsed = examDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0].message };
  }

  const d = parsed.data;

  try {
    await db
      .update(exams)
      .set({
        title: d.title,
        description: d.description || null,
        categoryId: d.categoryId || null,
        durationMinutes: d.durationMinutes,
        passingPercent: d.passingPercent || 60,
        shuffleQuestions: d.shuffleQuestions,
        shuffleOptions: d.shuffleOptions,
        requireCamera: d.requireCamera,
        showScoreOnSubmit: d.showScoreOnSubmit,
        enforceFullscreen: d.enforceFullscreen,
        scheduledStart: d.scheduledStart ? new Date(d.scheduledStart) : null,
        scheduledEnd: new Date(d.scheduledEnd),
      })
      .where(eq(exams.id, examId));

    if (exam.status === "published") {
      await db.insert(examEditLog).values({
        examId,
        userId: user.id,
        version: exam.draftVersion,
        action: "settings_update",
        changesSummary: "Updated exam configuration settings on published exam",
      });
    }

    return { ok: true as const };
  } catch (error: any) {
    return {
      ok: false as const,
      error: error.message || "Failed to update exam settings",
    };
  }
}

export async function saveDraft(
  examId: string,
  baseVersion: number,
  input: unknown
) {
  const session = await requireRole(["teacher", "admin"]);
  const user = session.user as any;
  const exam = await getOwnedExam(examId);

  // 1. Check session count for lifecycle editability
  const [sessionCountRes] = await db
    .select({ count: count() })
    .from(examSessions)
    .where(eq(examSessions.examId, examId));
  const sessionCount = Number(sessionCountRes?.count || 0);

  if (!canEditExam(exam, sessionCount)) {
    return {
      ok: false,
      code: "LOCKED",
      error: "This exam is locked and cannot be edited.",
    } as const;
  }

  const parsed = saveDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID",
      error: parsed.error.errors[0].message,
    } as const;
  }

  // 2. Strict publish check if editing a published exam
  if (exam.status === "published") {
    for (const q of parsed.data) {
      const val = publishableQuestionSchema.safeParse(q);
      if (!val.success) {
        return {
          ok: false,
          code: "INVALID",
          error: `Question #${q.order}: ${val.error.errors[0].message}`,
        } as const;
      }
    }
  }

  // 3. Optimistic lock: only save if version matches
  const bumped = await db
    .update(exams)
    .set({ draftVersion: sql`${exams.draftVersion} + 1` })
    .where(
      and(
        eq(exams.id, examId),
        eq(exams.draftVersion, baseVersion)
      )
    )
    .returning({ v: exams.draftVersion });

  if (bumped.length === 0) {
    return { ok: false, code: "CONFLICT" } as const;
  }

  const newVersion = bumped[0].v;

  // 4. Stable differential upsert: preserve question IDs
  const existingQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, examId));

  const existingMap = new Map(existingQuestions.map((q) => [q.id, q]));
  const preservedIds = new Set<string>();

  for (let i = 0; i < parsed.data.length; i++) {
    const q = parsed.data[i];
    const promptJson = q.promptJson || plainTextToTiptap(q.prompt, q.underlined);
    const plainPrompt = q.prompt || tiptapToPlainText(promptJson);

    const rowData = {
      examId,
      orderIndex: i + 1,
      type: q.type,
      prompt: plainPrompt,
      promptJson,
      options: q.options,
      answers: q.answers,
      answerSource: q.answerSource,
      confirmed: q.confirmed,
      points: String(q.points),
      sourcePage: q.sourcePage ?? null,
      warnings: q.warnings,
      tags: q.tags || [],
      categoryId: q.categoryId ?? null,
      bankQuestionId: q.bankQuestionId ?? null,
      context: q.context ?? null,
      contextJson: q.contextJson ?? null,
      instructions: q.instructions ?? null,
      instructionsJson: q.instructionsJson ?? null,
      underlined: q.underlined ?? null,
    };

    if (q.id && existingMap.has(q.id)) {
      // Update existing question
      await db
        .update(questions)
        .set(rowData)
        .where(eq(questions.id, q.id));
      preservedIds.add(q.id);
    } else {
      // Insert new question
      const [inserted] = await db
        .insert(questions)
        .values(rowData)
        .returning({ id: questions.id });
      preservedIds.add(inserted.id);
    }
  }

  // Delete removed questions
  const toDelete = existingQuestions
    .filter((q) => !preservedIds.has(q.id))
    .map((q) => q.id);

  if (toDelete.length > 0) {
    await db.delete(questions).where(inArray(questions.id, toDelete));
  }

  // 5. Audit Log on published edits
  if (exam.status === "published") {
    await db.insert(examEditLog).values({
      examId,
      userId: user.id,
      version: newVersion,
      action: "published_edit",
      changesSummary: `Updated ${parsed.data.length} questions prior to exam session start`,
    });
  }

  return { ok: true, version: newVersion } as const;
}

export async function getDraftVersion(examId: string) {
  const exam = await getOwnedExam(examId);
  return exam.draftVersion;
}

/**
 * Synchronizes all confirmed questions from an exam into the teacher's Question Bank.
 * Uses SHA-256 deduplication hashing to avoid redundant copies.
 */
export async function syncConfirmedQuestionsToBank(examId: string, teacherId: string) {
  const confirmedRows = await db
    .select()
    .from(questions)
    .where(and(eq(questions.examId, examId), eq(questions.confirmed, true)));

  for (const q of confirmedRows) {
    const hash = computeQuestionHash(q.prompt, q.options, q.answers);

    // Check if bank already has this question for this teacher
    const existing = await db.query.questionBank.findFirst({
      where: and(
        eq(questionBank.teacherId, teacherId),
        eq(questionBank.hash, hash)
      ),
    });

    if (!existing) {
      const [bankRow] = await db
        .insert(questionBank)
        .values({
          teacherId,
          categoryId: q.categoryId,
          type: q.type,
          prompt: q.prompt,
          promptJson: q.promptJson || plainTextToTiptap(q.prompt),
          options: q.options,
          answers: q.answers,
          points: q.points,
          tags: q.tags,
          hash,
          context: q.context,
          contextJson: q.contextJson,
          instructions: q.instructions,
          instructionsJson: q.instructionsJson,
        })
        .returning({ id: questionBank.id });

      // Link question row to the bank item
      await db
        .update(questions)
        .set({ bankQuestionId: bankRow.id })
        .where(eq(questions.id, q.id));
    }
  }
}

export async function publishExam(examId: string) {
  const exam = await getOwnedExam(examId);

  if (exam.status === "published") {
    return { ok: false, issues: ["This exam is already published."] } as const;
  }

  const rows = await db
    .select()
    .from(questions)
    .where(eq(questions.examId, examId))
    .orderBy(asc(questions.orderIndex));

  const issues: string[] = [];

  if (rows.length === 0) {
    issues.push(
      "Cannot publish an exam with zero questions. Add at least one question."
    );
  }

  for (const r of rows) {
    const res = publishableQuestionSchema.safeParse({
      id: r.id,
      tempId: r.id,
      order: r.orderIndex,
      type: r.type,
      prompt: r.prompt,
      promptJson: r.promptJson,
      options: r.options,
      answers: r.answers,
      answerSource: r.answerSource,
      points: Number(r.points),
      warnings: r.warnings,
      tags: r.tags || [],
      confirmed: r.confirmed,
      context: r.context ?? undefined,
      instructions: r.instructions ?? undefined,
      underlined: r.underlined ?? undefined,
    });

    if (!res.success) {
      issues.push(`Question #${r.orderIndex}: ${res.error.issues[0].message}`);
    }
  }

  if (exam.scheduledEnd && exam.scheduledEnd <= new Date()) {
    issues.push("Scheduled availability end time cannot be in the past.");
  }

  if (issues.length > 0) {
    return { ok: false, issues } as const;
  }

  // Generate unique access code if none exists
  let accessCode = exam.accessCode || generateAccessCode();
  let retries = 5;
  let updated = false;

  while (retries > 0 && !updated) {
    try {
      await db
        .update(exams)
        .set({
          status: "published",
          accessCode,
        })
        .where(and(eq(exams.id, examId), eq(exams.status, "draft")));
      updated = true;
    } catch (err: any) {
      if (err?.code === "23505") {
        accessCode = generateAccessCode();
        retries--;
      } else {
        throw err;
      }
    }
  }

  if (!updated) {
    return {
      ok: false,
      issues: ["Failed to generate a unique access code. Please try again."],
    } as const;
  }

  // Synchronize confirmed questions to the Question Bank
  await syncConfirmedQuestionsToBank(examId, exam.teacherId);

  return { ok: true, accessCode } as const;
}

export async function getTeacherExams() {
  const session = await requireRole(["teacher", "admin"]);
  const user = session.user as any;

  const examRows = await db
    .select({
      id: exams.id,
      teacherId: exams.teacherId,
      categoryId: exams.categoryId,
      title: exams.title,
      description: exams.description,
      durationMinutes: exams.durationMinutes,
      passingPercent: exams.passingPercent,
      status: exams.status,
      draftVersion: exams.draftVersion,
      accessCode: exams.accessCode,
      shuffleQuestions: exams.shuffleQuestions,
      shuffleOptions: exams.shuffleOptions,
      requireCamera: exams.requireCamera,
      showScoreOnSubmit: exams.showScoreOnSubmit,
      enforceFullscreen: exams.enforceFullscreen,
      scheduledStart: exams.scheduledStart,
      scheduledEnd: exams.scheduledEnd,
      createdAt: exams.createdAt,
      totalSessions: sql<number>`count(${examSessions.id})::int`,
      submittedSessions: sql<number>`count(case when ${examSessions.status} = 'submitted' then 1 end)::int`,
      ungradedSessions: sql<number>`count(case when ${examSessions.status} = 'submitted' and ${examSessions.fullyGraded} = false then 1 end)::int`,
    })
    .from(exams)
    .leftJoin(examSessions, eq(exams.id, examSessions.examId))
    .where(user.role === "admin" ? undefined : eq(exams.teacherId, user.id))
    .groupBy(exams.id)
    .orderBy(desc(exams.createdAt));

  return examRows.map((r) => ({
    ...r,
    displayStatus: computeExamDisplayStatus({
      status: r.status,
      scheduledStart: r.scheduledStart,
      scheduledEnd: r.scheduledEnd,
      totalSessions: r.totalSessions,
      submittedSessions: r.submittedSessions,
      ungradedSessions: r.ungradedSessions,
    }),
  }));
}

export async function togglePostponeExam(examId: string, postpone: boolean) {
  const session = await requireRole(["teacher", "admin"]);
  const user = session.user as any;
  const exam = await getOwnedExam(examId);

  if (exam.status === "draft") {
    return { ok: false as const, error: "Draft exams cannot be postponed." };
  }

  const newStatus = postpone ? ("postponed" as const) : ("published" as const);

  await db
    .update(exams)
    .set({
      status: newStatus,
    })
    .where(eq(exams.id, examId));

  return { ok: true as const, status: newStatus };
}

// Categories Actions
export async function getCategoriesAction() {
  const session = await requireRole(["teacher", "admin"]);
  const user = session.user as any;

  return await db
    .select()
    .from(categories)
    .where(eq(categories.teacherId, user.id))
    .orderBy(asc(categories.name));
}

export async function createCategoryAction(
  name: string,
  color: string = "#6366f1",
  description?: string
) {
  const session = await requireRole(["teacher", "admin"]);
  const user = session.user as any;

  if (!name.trim()) {
    return { ok: false as const, error: "Category name is required" };
  }

  const [created] = await db
    .insert(categories)
    .values({
      teacherId: user.id,
      name: name.trim(),
      color: color || "#6366f1",
      description: description?.trim() || null,
    })
    .returning();

  return { ok: true as const, category: created };
}
