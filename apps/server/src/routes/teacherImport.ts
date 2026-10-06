import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireRole } from "../lib/auth-middleware";
import { getOwnedExam } from "../lib/exams";
import { checkAndIncrementQuota, getTeacherQuota } from "../lib/quota";
import { extractDocumentText } from "../lib/ai/extract-text";
import { extractQuestionsFromText } from "../lib/ai/extract-questions";

export async function teacherImportRoutes(app: FastifyInstance) {
  // 1. Check teacher quota
  app.get("/api/teacher/import/quota", async (req: FastifyRequest, reply: FastifyReply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;

    const quota = await getTeacherQuota(user.id);
    return reply.send(quota);
  });

  // 2. Upload and parse document
  app.post("/api/teacher/exams/:examId/import-document", async (req: FastifyRequest, reply: FastifyReply) => {
    const authSession = await requireRole(["teacher", "admin"])(req, reply);
    if (!authSession) return;
    const user = authSession.user as any;
    const { examId } = req.params as { examId: string };

    const exam = await getOwnedExam(examId, user);
    if (!exam) return reply.status(404).send({ error: "Exam not found." });

    if (exam.status !== "draft") {
      return reply.status(400).send({
        error: "This exam is already published and cannot be modified.",
      });
    }

    let fileData;
    try {
      fileData = await req.file();
    } catch {
      return reply.status(400).send({ error: "Invalid multipart payload." });
    }

    if (!fileData) {
      return reply.status(400).send({ error: "No document file was uploaded." });
    }

    const quotaRes = await checkAndIncrementQuota(user.id);
    if (!quotaRes.allowed) {
      return reply.status(429).send({ error: quotaRes.error });
    }

    try {
      const buffer = await fileData.toBuffer();
      const doc = await extractDocumentText(buffer, fileData.filename, fileData.mimetype);
      const extraction = extractQuestionsFromText(doc.text);

      return reply.send({
        ok: true,
        questions: extraction.questions,
        previewText: doc.text,
        pageCount: doc.pageCount,
        sections: extraction.detectedSections,
        quotaUsed: quotaRes.used,
        quotaRemaining: quotaRes.remaining,
        quotaLimit: quotaRes.limit,
      });
    } catch (err: any) {
      req.log.error(err, "Document import error");
      return reply.status(500).send({ error: err.message || "Failed to parse document text." });
    }
  });
}
