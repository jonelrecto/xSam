import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { examSessions } from "@/lib/db/schema";
import { gradeSession } from "./grade";

export async function finalizeSession(
  sessionId: string,
  reason: "student" | "timeout" | "teacher_force" = "student"
) {
  const session = await db.query.examSessions.findFirst({
    where: eq(examSessions.id, sessionId),
  });

  if (!session) return null;

  if (session.status === "submitted") {
    return session;
  }

  const now = new Date();

  await db
    .update(examSessions)
    .set({
      status: "submitted",
      submittedAt: now,
      submitReason: reason,
    })
    .where(eq(examSessions.id, sessionId));

  // Run automated evaluation
  await gradeSession(sessionId);

  return await db.query.examSessions.findFirst({
    where: eq(examSessions.id, sessionId),
  });
}
