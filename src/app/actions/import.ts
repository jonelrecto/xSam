"use server";

import { getOwnedExam } from "@/lib/exams";
import { checkAndIncrementQuota, getTeacherQuota } from "@/lib/quota";
import { extractDocumentText } from "@/lib/ai/extract-text";
import { extractQuestionsFromText } from "@/lib/ai/extract-questions";

export async function importDocumentAction(examId: string, formData: FormData) {
  const exam = await getOwnedExam(examId);

  if (exam.status !== "draft") {
    return {
      ok: false as const,
      error: "This exam is already published and cannot be modified.",
    };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { ok: false as const, error: "No document file was uploaded." };
  }

  // 1. Quota Check & Increment
  const quotaRes = await checkAndIncrementQuota(exam.teacherId);
  if (!quotaRes.allowed) {
    return { ok: false as const, error: quotaRes.error };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Extract Document Text
    const doc = await extractDocumentText(buffer, file.name, file.type);

    // 3. AI & Heuristic Question Extraction
    const extraction = extractQuestionsFromText(doc.text);

    return {
      ok: true as const,
      questions: extraction.questions,
      previewText: doc.text,
      pageCount: doc.pageCount,
      sections: extraction.detectedSections,
      quotaUsed: quotaRes.used,
      quotaRemaining: quotaRes.remaining,
      quotaLimit: quotaRes.limit,
    };
  } catch (err: any) {
    console.error("Document import error:", err);
    return {
      ok: false as const,
      error: err.message || "Failed to parse document text.",
    };
  }
}

export async function getQuotaAction() {
  const session = await (await import("@/lib/auth-server")).requireRole(["teacher", "admin"]);
  return await getTeacherQuota(session.user.id);
}
