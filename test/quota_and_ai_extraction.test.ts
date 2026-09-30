import { describe, it, expect } from "vitest";
import { extractQuestionsFromText } from "../src/lib/ai/extract-questions";
import { extractDocumentText } from "../src/lib/ai/extract-text";
import { DAILY_IMPORT_LIMIT } from "../src/lib/quota";

describe("Phase 3: AI Document Question Extraction Engine", () => {
  it("should extract multiple choice questions with instructions, options, and keys", () => {
    const rawDocumentText = `
Part I: General Knowledge
Directions: Read each question carefully and select the best answer.

1. Which planet is known as the Red Planet?
A. Venus
B. Mars
C. Jupiter
D. Saturn
Answer: B

2. What is the chemical symbol for Gold?
A. Ag
B. Au
C. Fe
D. Cu
Answer: Au
`;

    const result = extractQuestionsFromText(rawDocumentText);

    expect(result.totalExtracted).toBe(2);
    expect(result.questions.length).toBe(2);

    // First question assertions
    const q1 = result.questions[0];
    expect(q1.order).toBe(1);
    expect(q1.type).toBe("multiple_choice");
    expect(q1.prompt).toBe("Which planet is known as the Red Planet?");
    expect(q1.options).toEqual(["Venus", "Mars", "Jupiter", "Saturn"]);
    expect(q1.answers).toEqual(["Mars"]); // Resolved B to 'Mars'
    expect(q1.answerSource).toBe("ai_inferred");
    expect(q1.confirmed).toBe(false);
    expect(q1.instructions).toContain("Part I: General Knowledge");

    // Second question assertions
    const q2 = result.questions[1];
    expect(q2.order).toBe(2);
    expect(q2.type).toBe("multiple_choice");
    expect(q2.prompt).toBe("What is the chemical symbol for Gold?");
    expect(q2.answers).toEqual(["Au"]);
    expect(q2.answerSource).toBe("ai_inferred");
  });

  it("should detect reading comprehension passages and attach context to questions", () => {
    const passageText = `
Part II: Reading Comprehension
Questions 1-2 refer to the following passage:
Photosynthesis is the biological process by which green plants convert light energy into chemical energy stored in glucose. Chlorophyll absorbs sunlight while carbon dioxide is absorbed via stomata.

1. What pigment in plants absorbs sunlight?
A. Hemoglobin
B. Chlorophyll
C. Carotenoid
Answer: B

2. Explain how carbon dioxide enters the plant cells.
`;

    const result = extractQuestionsFromText(passageText);

    expect(result.totalExtracted).toBe(2);

    const q1 = result.questions[0];
    expect(q1.context).toContain("Photosynthesis is the biological process");
    expect(q1.type).toBe("multiple_choice");

    const q2 = result.questions[1];
    expect(q2.type).toBe("essay");
    expect(q2.answerSource).toBe("missing");
    expect(q2.confirmed).toBe(true);
  });

  it("should extract identification and true/false questions", () => {
    const text = `
Part III: Identification & True/False

1. What is the national flower of the Philippines?
Answer: Sampaguita|Jasminum sambac

2. The Pacific Ocean is the largest ocean on Earth. True / False
Answer: true
`;

    const result = extractQuestionsFromText(text);

    expect(result.totalExtracted).toBe(2);

    const q1 = result.questions[0];
    expect(q1.type).toBe("identification");
    expect(q1.answers).toEqual(["Sampaguita", "Jasminum sambac"]);

    const q2 = result.questions[1];
    expect(q2.type).toBe("true_false");
    expect(q2.answers).toEqual(["true"]);
  });
});

describe("Phase 3: Multi-Format Document Parser", () => {
  it("should extract plain text from buffer", async () => {
    const buffer = Buffer.from("1. Sample Question\nA. Choice 1\nB. Choice 2", "utf-8");
    const doc = await extractDocumentText(buffer, "test.txt", "text/plain");

    expect(doc.format).toBe("txt");
    expect(doc.text).toContain("Sample Question");
  });

  it("should throw for unsupported document extensions", async () => {
    const buffer = Buffer.from("fake binary", "utf-8");
    await expect(
      extractDocumentText(buffer, "archive.zip", "application/zip")
    ).rejects.toThrow("Unsupported document format '.zip'");
  });
});

describe("Phase 3: Quota Architecture Rules", () => {
  it("should configure standard daily limit of 20 imports per teacher", () => {
    expect(DAILY_IMPORT_LIMIT).toBe(20);
  });
});
