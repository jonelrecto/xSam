import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exams } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-server";

export async function getOwnedExam(examId: string) {
  const session = await requireRole(["teacher", "admin"]);
  const user = session.user as any;

  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, examId),
  });

  if (!exam) {
    notFound();
  }

  // Non-admin teachers can only view/modify their own exams
  if (user.role !== "admin" && exam.teacherId !== user.id) {
    notFound();
  }

  return exam;
}
