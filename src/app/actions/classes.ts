"use server";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  classes,
  classMembers,
  examClasses,
  user,
  type Class,
  type ClassMember,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/auth-server";

export async function getTeacherClasses() {
  const session = await requireRole(["teacher", "admin"]);
  const authUser = session.user as any;

  return await db
    .select()
    .from(classes)
    .where(eq(classes.teacherId, authUser.id))
    .orderBy(desc(classes.createdAt));
}

export async function createClassAction(input: {
  name: string;
  section?: string;
  subject?: string;
  academicYear?: string;
}) {
  const session = await requireRole(["teacher", "admin"]);
  const authUser = session.user as any;

  if (!input.name || !input.name.trim()) {
    return { ok: false as const, error: "Class name is required." };
  }

  try {
    const [created] = await db
      .insert(classes)
      .values({
        teacherId: authUser.id,
        name: input.name.trim(),
        section: input.section?.trim() || null,
        subject: input.subject?.trim() || null,
        academicYear: input.academicYear?.trim() || null,
      })
      .returning();

    return { ok: true as const, class: created };
  } catch (err: any) {
    return { ok: false as const, error: err.message || "Failed to create class." };
  }
}

export async function getClassWithMembers(classId: string) {
  const session = await requireRole(["teacher", "admin"]);
  const authUser = session.user as any;

  const classData = await db.query.classes.findFirst({
    where: and(eq(classes.id, classId), eq(classes.teacherId, authUser.id)),
  });

  if (!classData) return null;

  const members = await db
    .select({
      id: classMembers.id,
      joinedAt: classMembers.joinedAt,
      studentId: user.id,
      name: user.name,
      email: user.email,
      studentNumber: user.studentNumber,
    })
    .from(classMembers)
    .innerJoin(user, eq(classMembers.studentId, user.id))
    .where(eq(classMembers.classId, classId))
    .orderBy(asc(user.name));

  return {
    ...classData,
    members,
  };
}

export async function addMemberToClassAction(
  classId: string,
  studentEmail: string,
  studentNumber?: string
) {
  const session = await requireRole(["teacher", "admin"]);
  const authUser = session.user as any;

  const classData = await db.query.classes.findFirst({
    where: and(eq(classes.id, classId), eq(classes.teacherId, authUser.id)),
  });

  if (!classData) {
    return { ok: false as const, error: "Class not found." };
  }

  const existingUser = await db.query.user.findFirst({
    where: eq(user.email, studentEmail.trim().toLowerCase()),
  });

  if (!existingUser) {
    return {
      ok: false as const,
      error: `No registered student account found with email "${studentEmail}". Ask student to register first.`,
    };
  }

  // Update student number if provided
  if (studentNumber && studentNumber.trim()) {
    await db
      .update(user)
      .set({ studentNumber: studentNumber.trim() })
      .where(eq(user.id, existingUser.id));
  }

  try {
    await db.insert(classMembers).values({
      classId,
      studentId: existingUser.id,
    });
    return { ok: true as const };
  } catch (err: any) {
    if (err?.code === "23505") {
      return { ok: false as const, error: "Student is already in this class." };
    }
    return { ok: false as const, error: err.message || "Failed to add student to class." };
  }
}

export async function assignExamClassesAction(examId: string, classIds: string[]) {
  const session = await requireRole(["teacher", "admin"]);
  const authUser = session.user as any;

  // Clear existing assignments
  await db.delete(examClasses).where(eq(examClasses.examId, examId));

  if (classIds.length > 0) {
    const rows = classIds.map((classId) => ({
      examId,
      classId,
    }));
    await db.insert(examClasses).values(rows);
  }

  return { ok: true as const };
}

export async function getExamAssignedClasses(examId: string) {
  return await db
    .select({
      id: classes.id,
      name: classes.name,
      section: classes.section,
      subject: classes.subject,
    })
    .from(examClasses)
    .innerJoin(classes, eq(examClasses.classId, classes.id))
    .where(eq(examClasses.examId, examId));
}
