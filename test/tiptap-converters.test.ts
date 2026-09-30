import { describe, it, expect } from "vitest";
import {
  plainTextToTiptap,
  tiptapToPlainText,
  validateTiptapJson,
  renderTiptapHtml,
} from "../src/lib/editor/converters";

describe("Tiptap Rich-Text Converters & Validation", () => {
  it("converts simple plain text to a valid Tiptap JSON document", () => {
    const text = "What is the mitochondria?";
    const doc = plainTextToTiptap(text);

    expect(doc.type).toBe("doc");
    expect(doc.content).toBeDefined();
    expect(doc.content[0].type).toBe("paragraph");
    expect(doc.content[0].content?.[0].text).toBe(text);
    expect(validateTiptapJson(doc)).toBe(true);
  });

  it("converts multiline text into multiple paragraphs", () => {
    const text = "Line 1\nLine 2\nLine 3";
    const doc = plainTextToTiptap(text);

    expect(doc.content.length).toBe(3);
    expect(tiptapToPlainText(doc)).toBe("Line 1\nLine 2\nLine 3");
  });

  it("converts underlined segments into underline marks", () => {
    const text = "The capital of France is Paris.";
    const doc = plainTextToTiptap(text, "Paris");

    expect(validateTiptapJson(doc)).toBe(true);
    const paragraph = doc.content[0];
    const textNodes = paragraph.content || [];

    // "The capital of France is " + "Paris" (underlined) + "."
    expect(textNodes.length).toBe(3);
    expect(textNodes[0].text).toBe("The capital of France is ");
    expect(textNodes[1].text).toBe("Paris");
    expect(textNodes[1].marks).toEqual([{ type: "underline" }]);
    expect(textNodes[2].text).toBe(".");

    const html = renderTiptapHtml(doc);
    expect(html).toContain("<u>Paris</u>");
  });

  it("validates allowed nodes and rejects disallowed node types", () => {
    const validDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello", marks: [{ type: "bold" }] }],
        },
      ],
    };
    expect(validateTiptapJson(validDoc)).toBe(true);

    const invalidDocWithHeading = {
      type: "doc",
      content: [
        {
          type: "heading", // Heading is not in allowlist
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
      ],
    };
    expect(validateTiptapJson(invalidDocWithHeading)).toBe(false);

    const invalidDocWithScript = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "script", text: "alert(1)" }],
        },
      ],
    };
    expect(validateTiptapJson(invalidDocWithScript)).toBe(false);
  });
});
