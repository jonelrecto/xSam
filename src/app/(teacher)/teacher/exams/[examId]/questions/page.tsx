import React from "react";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { questions, examSessions } from "@/lib/db/schema";
import { getOwnedExam } from "@/lib/exams";
import { DraftStudio } from "@/components/teacher/DraftStudio";
import { canEditExam } from "@/lib/exam/lifecycle";
import type { DraftQuestion } from "@/lib/schemas/exam";

interface PageProps {
  params: Promise<{
    examId: string;
  }>;
}

export default async function ExamQuestionsPage({ params }: PageProps) {
  const { examId } = await params;
  const exam = await getOwnedExam(examId);

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

  const initialQuestions: DraftQuestion[] = questionRows.map((r) => ({
    id: r.id,
    tempId: r.id,
    order: r.orderIndex,
    type: r.type,
    prompt: r.prompt,
    promptJson: r.promptJson,
    options: r.options,
    answers: r.answers,
    answerSource: r.answerSource as any,
    confirmed: r.confirmed,
    points: Number(r.points),
    sourcePage: r.sourcePage ?? undefined,
    warnings: r.warnings ?? [],
    tags: r.tags ?? [],
    categoryId: r.categoryId ?? undefined,
    bankQuestionId: r.bankQuestionId ?? undefined,
    context: r.context ?? undefined,
    instructions: r.instructions ?? undefined,
    underlined: r.underlined ?? undefined,
  }));

  return (
    <DraftStudio
      exam={exam}
      isEditable={isEditable}
      sessionCount={sessionCount}
      initialQuestions={initialQuestions}
      initialVersion={exam.draftVersion}
    />
  );
}
