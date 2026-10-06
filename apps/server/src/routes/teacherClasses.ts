import { FastifyInstance } from "fastify";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, classes, classMembers, examClasses, user as userTable } from "@xsam/db";
import { requireRole } from "../lib/auth-middleware";

export async function teacherClassesRoutes(app: FastifyInstance) {
  // 1. List teacher classes
  app.get("/api/teacher/classes", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const authUser = authSession.user as any;

    const list = await db
      .select()
      .from(classes)
      .where(eq(classes.teacherId, authUser.id))
      .orderBy(desc(classes.createdAt));

    return reply.send(list);
  });

  // 2. Create class
  app.post("/api/teacher/classes", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const authUser = authSession.user as any;

    const body = (req.body || {}) as {
      name: string;
      section?: string;
      subject?: string;
      academicYear?: string;
    };

    if (!body.name || !body.name.trim()) {
      return reply.status(400).send({ error: "Class name is required." });
    }

    try {
      const [created] = await db
        .insert(classes)
        .values({
          teacherId: authUser.id,
          name: body.name.trim(),
          section: body.section?.trim() || null,
          subject: body.subject?.trim() || null,
          academicYear: body.academicYear?.trim() || null,
        })
        .returning();

      return reply.status(201).send({ ok: true, class: created });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to create class." });
    }
  });

  // 3. Get single class with student members
  app.get("/api/teacher/classes/:classId", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const authUser = authSession.user as any;
    const { classId } = req.params as { classId: string };

    const classData = await db.query.classes.findFirst({
      where: and(eq(classes.id, classId), eq(classes.teacherId, authUser.id)),
    });

    if (!classData) {
      return reply.status(404).send({ error: "Class not found." });
    }

    const members = await db
      .select({
        id: classMembers.id,
        joinedAt: classMembers.joinedAt,
        studentId: userTable.id,
        name: userTable.name,
        email: userTable.email,
        studentNumber: userTable.studentNumber,
      })
      .from(classMembers)
      .innerJoin(userTable, eq(classMembers.studentId, userTable.id))
      .where(eq(classMembers.classId, classId))
      .orderBy(asc(userTable.name));

    return reply.send({
      ...classData,
      members,
    });
  });

  // 4. Add student member to class
  app.post("/api/teacher/classes/:classId/members", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const authUser = authSession.user as any;
    const { classId } = req.params as { classId: string };

    const body = (req.body || {}) as {
      studentEmail: string;
      studentNumber?: string;
    };

    if (!body.studentEmail || !body.studentEmail.trim()) {
      return reply.status(400).send({ error: "Student email is required." });
    }

    const classData = await db.query.classes.findFirst({
      where: and(eq(classes.id, classId), eq(classes.teacherId, authUser.id)),
    });

    if (!classData) {
      return reply.status(404).send({ error: "Class not found." });
    }

    const existingUser = await db.query.user.findFirst({
      where: eq(userTable.email, body.studentEmail.trim().toLowerCase()),
    });

    if (!existingUser) {
      return reply.status(404).send({
        error: `No registered student account found with email "${body.studentEmail}". Ask student to register first.`,
      });
    }

    if (body.studentNumber && body.studentNumber.trim()) {
      await db
        .update(userTable)
        .set({ studentNumber: body.studentNumber.trim() })
        .where(eq(userTable.id, existingUser.id));
    }

    try {
      await db.insert(classMembers).values({
        classId,
        studentId: existingUser.id,
      });
      return reply.status(201).send({ ok: true });
    } catch (err: any) {
      if (err?.code === "23505") {
        return reply.status(409).send({ error: "Student is already enrolled in this class." });
      }
      return reply.status(500).send({ error: err.message || "Failed to add student to class." });
    }
  });

  // 5. Get assigned classes for an exam
  app.get("/api/teacher/exams/:examId/classes", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const { examId } = req.params as { examId: string };

    const assigned = await db
      .select({
        id: classes.id,
        name: classes.name,
        section: classes.section,
        subject: classes.subject,
      })
      .from(examClasses)
      .innerJoin(classes, eq(examClasses.classId, classes.id))
      .where(eq(examClasses.examId, examId));

    return reply.send(assigned);
  });

  // 6. Assign classes to exam
  app.post("/api/teacher/exams/:examId/classes", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const { examId } = req.params as { examId: string };
    const body = (req.body || {}) as { classIds: string[] };

    await db.delete(examClasses).where(eq(examClasses.examId, examId));

    if (body.classIds && body.classIds.length > 0) {
      const rows = body.classIds.map((classId) => ({
        examId,
        classId,
      }));
      await db.insert(examClasses).values(rows);
    }

    return reply.send({ ok: true });
  });
}
