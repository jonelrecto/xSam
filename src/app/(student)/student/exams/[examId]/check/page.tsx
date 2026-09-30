import React from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { exams, questions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { evaluateAvailability } from "@/lib/exam/availability";
import { getSession } from "@/lib/auth-server";
import { PreflightForm } from "@/components/student/PreflightForm";

interface Props {
  params: Promise<{ examId: string }>;
}

export default async function ExamPreflightPage({ params }: Props) {
  const { examId } = await params;
  const authSession = await getSession();
  if (!authSession) {
    redirect("/auth/sign-in");
  }

  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, examId),
  });

  if (!exam) {
    notFound();
  }

  const availability = evaluateAvailability(exam);
  if (availability !== "open") {
    redirect(`/student?error=exam_${availability}`);
  }

  const [questionCountRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(questions)
    .where(eq(questions.examId, examId));

  const questionCount = Number(questionCountRes?.count || 0);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
      <PreflightForm
        exam={{
          id: exam.id,
          title: exam.title,
          description: exam.description,
          durationMinutes: exam.durationMinutes,
          requireCamera: exam.requireCamera,
          enforceFullscreen: exam.enforceFullscreen,
          questionCount,
        }}
      />
    </div>
  );
}
