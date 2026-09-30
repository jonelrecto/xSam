import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { importUsage } from "@/lib/db/schema";

export const DAILY_IMPORT_LIMIT = 20;

export async function getTeacherQuota(userId: string) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD (UTC)

  try {
    const record = await db.query.importUsage.findFirst({
      where: and(eq(importUsage.userId, userId), eq(importUsage.day, today)),
    });

    const count = record ? record.count : 0;
    const remaining = Math.max(0, DAILY_IMPORT_LIMIT - count);

    return {
      used: count,
      limit: DAILY_IMPORT_LIMIT,
      remaining,
      allowed: count < DAILY_IMPORT_LIMIT,
    };
  } catch (error) {
    console.error("Failed to query quota:", error);
    return {
      used: 0,
      limit: DAILY_IMPORT_LIMIT,
      remaining: DAILY_IMPORT_LIMIT,
      allowed: true,
    };
  }
}

export async function checkAndIncrementQuota(userId: string) {
  const today = new Date().toISOString().split("T")[0];

  const quota = await getTeacherQuota(userId);
  if (!quota.allowed) {
    return {
      allowed: false as const,
      used: quota.used,
      remaining: 0,
      limit: DAILY_IMPORT_LIMIT,
      error: `Daily AI import quota exceeded (${DAILY_IMPORT_LIMIT} imports/day). Resets at midnight UTC.`,
    };
  }

  // Atomic upsert with increment
  try {
    const updated = await db
      .insert(importUsage)
      .values({
        userId,
        day: today,
        count: 1,
      })
      .onConflictDoUpdate({
        target: [importUsage.userId, importUsage.day],
        set: { count: sql`${importUsage.count} + 1` },
      })
      .returning({ count: importUsage.count });

    const newCount = updated[0]?.count ?? quota.used + 1;
    return {
      allowed: true as const,
      used: newCount,
      remaining: Math.max(0, DAILY_IMPORT_LIMIT - newCount),
      limit: DAILY_IMPORT_LIMIT,
    };
  } catch (err: any) {
    console.error("Quota increment error:", err);
    return {
      allowed: true as const,
      used: quota.used + 1,
      remaining: Math.max(0, DAILY_IMPORT_LIMIT - (quota.used + 1)),
      limit: DAILY_IMPORT_LIMIT,
    };
  }
}
