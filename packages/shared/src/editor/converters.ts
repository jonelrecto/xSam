import { generateHTML as browserGenerateHTML } from "@tiptap/html";
import { editorExtensions, ALLOWED_NODES, ALLOWED_MARKS } from "./tiptap-config";

export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  text?: string;
}

export interface TiptapDoc {
  type: "doc";
  content: TiptapNode[];
}

/**
 * Converts a raw plain-text string into a valid Tiptap JSON document.
 * If `underlinedTerm` is provided and exists in the text, it marks that substring with an underline mark.
 */
export function plainTextToTiptap(
  text: string,
  underlinedTerm?: string | null
): TiptapDoc {
  if (!text || text.trim() === "") {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  const lines = text.split(/\r?\n/);
  const content: TiptapNode[] = [];

  for (const line of lines) {
    if (!line.trim()) {
      content.push({ type: "paragraph" });
      continue;
    }

    if (underlinedTerm && line.includes(underlinedTerm)) {
      const parts = line.split(underlinedTerm);
      const paragraphNodes: TiptapNode[] = [];

      parts.forEach((part, idx) => {
        if (part) {
          paragraphNodes.push({ type: "text", text: part });
        }
        if (idx < parts.length - 1) {
          paragraphNodes.push({
            type: "text",
            text: underlinedTerm,
            marks: [{ type: "underline" }],
          });
        }
      });

      content.push({
        type: "paragraph",
        content: paragraphNodes.length > 0 ? paragraphNodes : undefined,
      });
    } else {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: line }],
      });
    }
  }

  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
}

/**
 * Extracts plain text from a Tiptap JSON document.
 */
export function tiptapToPlainText(doc: any): string {
  if (!doc) return "";
  if (typeof doc === "string") return doc;

  if (doc.text) {
    return doc.text;
  }

  if (Array.isArray(doc.content)) {
    const textPieces = doc.content.map((child: any) => tiptapToPlainText(child));
    if (doc.type === "doc" || doc.type === "bulletList" || doc.type === "orderedList") {
      return textPieces.filter(Boolean).join("\n");
    }
    if (doc.type === "paragraph" || doc.type === "listItem") {
      return textPieces.join("");
    }
    return textPieces.join(" ");
  }

  return "";
}

/**
 * Validates a Tiptap JSON document against the allowlist of allowed nodes and marks.
 */
export function validateTiptapJson(doc: any): boolean {
  if (!doc || typeof doc !== "object") return false;
  if (doc.type !== "doc" || !Array.isArray(doc.content)) return false;

  function validateNode(node: any): boolean {
    if (!node || typeof node !== "object" || typeof node.type !== "string") {
      return false;
    }

    if (!ALLOWED_NODES.has(node.type)) {
      return false;
    }

    if (node.marks) {
      if (!Array.isArray(node.marks)) return false;
      for (const m of node.marks) {
        if (!m || typeof m.type !== "string" || !ALLOWED_MARKS.has(m.type)) {
          return false;
        }
      }
    }

    if (node.content) {
      if (!Array.isArray(node.content)) return false;
      for (const child of node.content) {
        if (!validateNode(child)) return false;
      }
    }

    return true;
  }

  for (const node of doc.content) {
    if (!validateNode(node)) return false;
  }

  return true;
}

/**
 * Renders safe HTML string from a valid Tiptap JSON document using the extension set.
 */
export function renderTiptapHtml(doc: any): string {
  if (!doc) return "";
  if (typeof doc === "string") {
    // If already raw HTML or plain text, convert to tiptap first
    doc = plainTextToTiptap(doc);
  }

  try {
    if (typeof window === "undefined") {
      try {
        const { generateHTML: serverGenerateHTML } = require("@tiptap/html/server");
        return serverGenerateHTML(doc, editorExtensions);
      } catch {
        // Fall back to browserGenerateHTML
      }
    }
    return browserGenerateHTML(doc, editorExtensions);
  } catch (err) {
    console.error("Failed to generate HTML from Tiptap JSON:", err);
    return tiptapToPlainText(doc);
  }
}
