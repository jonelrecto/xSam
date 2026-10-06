import { eq } from "drizzle-orm";
import { db, exams } from "@xsam/db";

export async function getOwnedExam(examId: string, user: { id: string; role?: string }) {
  const exam = await db.query.exams.findFirst({
    where: eq(exams.id, examId),
  });

  if (!exam) {
    return null;
  }

  // Non-admin teachers can only view/modify their own exams
  if (user.role !== "admin" && exam.teacherId !== user.id) {
    return null;
  }

  return exam;
}
