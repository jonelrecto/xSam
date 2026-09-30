"use server";

import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { questionBank, categories, type QuestionBankItem } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-server";
import { computeQuestionHash } from "@/lib/exam/bank-hash";
import { plainTextToTiptap } from "@/lib/editor/converters";
import type { DraftQuestion } from "@/lib/schemas/exam";

export async function getBankQuestions(filters?: {
  categoryId?: string;
  search?: string;
  type?: string;
}) {
  const session = await requireRole(["teacher", "admin"]);
  const user = session.user as any;

  const conditions = [eq(questionBank.teacherId, user.id)];

  if (filters?.categoryId) {
    conditions.push(eq(questionBank.categoryId, filters.categoryId));
  }

  if (filters?.type && filters.type !== "all") {
    conditions.push(eq(questionBank.type, filters.type as any));
  }

  if (filters?.search && filters.search.trim() !== "") {
    conditions.push(ilike(questionBank.prompt, `%${filters.search.trim()}%`));
  }

  return await db
    .select({
      id: questionBank.id,
      teacherId: questionBank.teacherId,
      categoryId: questionBank.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      type: questionBank.type,
      prompt: questionBank.prompt,
      promptJson: questionBank.promptJson,
      options: questionBank.options,
      answers: questionBank.answers,
      points: questionBank.points,
      tags: questionBank.tags,
      context: questionBank.context,
      instructions: questionBank.instructions,
      createdAt: questionBank.createdAt,
    })
    .from(questionBank)
    .leftJoin(categories, eq(questionBank.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(questionBank.createdAt));
}

export async function createBankQuestion(input: {
  type: "multiple_choice" | "true_false" | "identification" | "essay";
  prompt: string;
  promptJson?: any;
  options?: string[] | null;
  answers?: string[];
  points?: number;
  categoryId?: string | null;
  tags?: string[];
  context?: string | null;
  instructions?: string | null;
}) {
  const session = await requireRole(["teacher", "admin"]);
  const user = session.user as any;

  if (!input.prompt || !input.prompt.trim()) {
    return { ok: false as const, error: "Question prompt is required." };
  }

  const hash = computeQuestionHash(input.prompt, input.options, input.answers);

  try {
    const [created] = await db
      .insert(questionBank)
      .values({
        teacherId: user.id,
        categoryId: input.categoryId || null,
        type: input.type,
        prompt: input.prompt.trim(),
        promptJson: input.promptJson || plainTextToTiptap(input.prompt),
        options: input.options || null,
        answers: input.answers || [],
        points: String(input.points || 1),
        tags: input.tags || [],
        hash,
        context: input.context || null,
        instructions: input.instructions || null,
      })
      .returning({ id: questionBank.id });

    return { ok: true as const, id: created.id };
  } catch (err: any) {
    return { ok: false as const, error: err.message || "Failed to add question to bank." };
  }
}

export async function deleteBankQuestion(id: string) {
  const session = await requireRole(["teacher", "admin"]);
  const user = session.user as any;

  await db
    .delete(questionBank)
    .where(and(eq(questionBank.id, id), eq(questionBank.teacherId, user.id)));

  return { ok: true as const };
}

export async function getQuestionsForDraft(bankIds: string[]): Promise<DraftQuestion[]> {
  const session = await requireRole(["teacher", "admin"]);
  const user = session.user as any;

  if (!bankIds || bankIds.length === 0) return [];

  const rows = await db
    .select()
    .from(questionBank)
    .where(
      and(
        inArray(questionBank.id, bankIds),
        eq(questionBank.teacherId, user.id)
      )
    );

  return rows.map((r, i) => ({
    tempId:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9),
    bankQuestionId: r.id,
    categoryId: r.categoryId,
    order: i + 1,
    type: r.type,
    prompt: r.prompt,
    promptJson: r.promptJson || plainTextToTiptap(r.prompt),
    options: r.options,
    answers: r.answers,
    answerSource: "provided" as const,
    points: Number(r.points),
    warnings: [],
    tags: r.tags || [],
    confirmed: true,
    context: r.context,
    instructions: r.instructions,
  }));
}
