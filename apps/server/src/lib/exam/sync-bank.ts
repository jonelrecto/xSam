import { and, eq } from "drizzle-orm";
import { db, questions, questionBank } from "@xsam/db";
import { computeQuestionHash } from "./bank-hash";
import { plainTextToTiptap } from "@xsam/shared";

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
          categoryId: q.categoryId || null,
          type: q.type,
          prompt: q.prompt,
          promptJson: q.promptJson || plainTextToTiptap(q.prompt),
          options: q.options,
          answers: q.answers,
          points: q.points,
          tags: q.tags,
          hash,
          context: q.context || null,
          contextJson: q.contextJson || null,
          instructions: q.instructions || null,
          instructionsJson: q.instructionsJson || null,
        })
        .returning({ id: questionBank.id });

      // Link question row to the bank item
      await db
        .update(questions)
        .set({ bankQuestionId: bankRow.id })
        .where(eq(questions.id, q.id));
    } else {
      await db
        .update(questions)
        .set({ bankQuestionId: existing.id })
        .where(eq(questions.id, q.id));
    }
  }
}
