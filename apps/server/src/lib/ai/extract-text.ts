import pdf from "pdf-parse";
import mammoth from "mammoth";

export interface ExtractedDocument {
  text: string;
  pageCount?: number;
  format: "pdf" | "docx" | "txt" | "unknown";
}

const SUPPORTED_TEXT_EXTS = ["txt", "text", "md", "markdown", "csv"];

export async function extractDocumentText(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<ExtractedDocument> {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (ext === "pdf" || mimeType === "application/pdf") {
    try {
      const data = await pdf(buffer);
      return {
        text: data.text.trim(),
        pageCount: data.numpages,
        format: "pdf",
      };
    } catch (err: any) {
      throw new Error(`Failed to parse PDF document: ${err.message}`);
    }
  }

  if (
    ext === "docx" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const res = await mammoth.extractRawText({ buffer });
      return {
        text: res.value.trim(),
        format: "docx",
      };
    } catch (err: any) {
      throw new Error(`Failed to parse Word document: ${err.message}`);
    }
  }

  if (SUPPORTED_TEXT_EXTS.includes(ext) || mimeType?.startsWith("text/")) {
    return {
      text: buffer.toString("utf-8").trim(),
      format: "txt",
    };
  }

  throw new Error(`Unsupported document format '.${ext}'. Please upload a PDF, DOCX, or TXT file.`);
}
