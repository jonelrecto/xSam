import { FastifyInstance } from "fastify";
import { and, desc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { db, questionBank, categories } from "@xsam/db";
import { plainTextToTiptap } from "@xsam/shared";
import { requireRole } from "../lib/auth-middleware";
import { computeQuestionHash } from "../lib/exam/bank-hash";

export async function teacherBankRoutes(app: FastifyInstance) {
  // 1. List question bank items with filters
  app.get("/api/teacher/bank", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;

    const query = (req.query || {}) as {
      categoryId?: string;
      search?: string;
      type?: string;
    };

    const conditions: any[] = [];
    if (user.role !== "admin") {
      conditions.push(eq(questionBank.teacherId, user.id));
    }

    if (
      query.categoryId &&
      query.categoryId !== "all" &&
      query.categoryId !== "undefined"
    ) {
      if (query.categoryId === "uncategorized" || query.categoryId === "none") {
        conditions.push(isNull(questionBank.categoryId));
      } else {
        conditions.push(eq(questionBank.categoryId, query.categoryId));
      }
    }

    if (
      query.type &&
      query.type !== "all" &&
      query.type !== "undefined"
    ) {
      conditions.push(eq(questionBank.type, query.type as any));
    }

    if (
      query.search &&
      query.search.trim() !== "" &&
      query.search !== "undefined"
    ) {
      conditions.push(ilike(questionBank.prompt, `%${query.search.trim()}%`));
    }

    const items = await db
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(questionBank.createdAt));

    return reply.send(items);
  });

  // 2. Create bank question
  app.post("/api/teacher/bank", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;

    const body = (req.body || {}) as {
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
    };

    if (!body.prompt || !body.prompt.trim()) {
      return reply.status(400).send({ error: "Question prompt is required." });
    }

    const hash = computeQuestionHash(body.prompt, body.options, body.answers);

    try {
      const [created] = await db
        .insert(questionBank)
        .values({
          teacherId: user.id,
          categoryId: body.categoryId || null,
          type: body.type,
          prompt: body.prompt.trim(),
          promptJson: body.promptJson || plainTextToTiptap(body.prompt),
          options: body.options || null,
          answers: body.answers || [],
          points: String(body.points || 1),
          tags: body.tags || [],
          hash,
          context: body.context || null,
          instructions: body.instructions || null,
        })
        .returning({ id: questionBank.id });

      return reply.status(201).send({ ok: true, id: created.id });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to add question to bank." });
    }
  });

  // 3. Delete bank question
  app.delete("/api/teacher/bank/:id", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;
    const { id } = req.params as { id: string };

    await db
      .delete(questionBank)
      .where(and(eq(questionBank.id, id), eq(questionBank.teacherId, user.id)));

    return reply.send({ ok: true });
  });

  // 4. Categories list & create
  app.get("/api/teacher/categories", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;

    const list = await db
      .select()
      .from(categories)
      .where(user.role === "admin" ? undefined : eq(categories.teacherId, user.id))
      .orderBy(desc(categories.createdAt));

    return reply.send(list);
  });

  app.post("/api/teacher/categories", async (req, reply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;

    const body = (req.body || {}) as {
      name: string;
      color?: string;
      description?: string;
    };

    if (!body.name || !body.name.trim()) {
      return reply.status(400).send({ error: "Category name is required." });
    }

    try {
      const [created] = await db
        .insert(categories)
        .values({
          teacherId: user.id,
          name: body.name.trim(),
          color: body.color || "#6366f1",
          description: body.description || null,
        })
        .returning();

      return reply.status(201).send({ ok: true, category: created });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to create category." });
    }
  });
}
