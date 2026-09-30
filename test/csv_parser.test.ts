import { describe, it, expect } from "vitest";
import { validateRows } from "../src/lib/csv/parse-exam-csv";

describe("Phase 2: CSV Validation Engine", () => {
  const standardHeaders = [
    "order",
    "type",
    "prompt",
    "opt_a",
    "opt_b",
    "opt_c",
    "opt_d",
    "answer",
    "points",
  ];

  it("should parse and validate all 4 question types correctly", () => {
    const rows: Record<string, string>[] = [
      {
        order: "1",
        type: "multiple_choice",
        prompt: "What is 2 + 2?",
        opt_a: "3",
        opt_b: "4",
        opt_c: "5",
        opt_d: "6",
        answer: "B",
        points: "1",
      },
      {
        order: "2",
        type: "true_false",
        prompt: "Earth is flat.",
        answer: "false",
        points: "1",
      },
      {
        order: "3",
        type: "identification",
        prompt: "Capital of France",
        answer: "Paris|City of Paris",
        points: "2",
      },
      {
        order: "4",
        type: "essay",
        prompt: "Describe gravity.",
        answer: "",
        points: "5",
      },
    ];

    const result = validateRows(rows, standardHeaders);

    expect(result.invalidRows).toBe(0);
    expect(result.questions.length).toBe(4);

    // Multiple Choice: converted letter B to '4'
    expect(result.questions[0].type).toBe("multiple_choice");
    expect(result.questions[0].answers).toEqual(["4"]);
    expect(result.questions[0].options).toEqual(["3", "4", "5", "6"]);
    expect(result.questions[0].confirmed).toBe(true);

    // True/False
    expect(result.questions[1].type).toBe("true_false");
    expect(result.questions[1].answers).toEqual(["false"]);
    expect(result.questions[1].confirmed).toBe(true);

    // Identification: pipe-separated
    expect(result.questions[2].type).toBe("identification");
    expect(result.questions[2].answers).toEqual(["Paris", "City of Paris"]);
    expect(result.questions[2].points).toBe(2);

    // Essay: manual grading
    expect(result.questions[3].type).toBe("essay");
    expect(result.questions[3].answers).toEqual([]);
    expect(result.questions[3].answerSource).toBe("missing");
    expect(result.questions[3].confirmed).toBe(true);
  });

  it("should accept direct text match for multiple choice answers", () => {
    const rows = [
      {
        order: "1",
        type: "multiple_choice",
        prompt: "Which gas do plants absorb?",
        opt_a: "Oxygen",
        opt_b: "Carbon Dioxide",
        opt_c: "Nitrogen",
        answer: "Carbon Dioxide",
      },
    ];

    const result = validateRows(rows, standardHeaders);
    expect(result.invalidRows).toBe(0);
    expect(result.questions[0].answers).toEqual(["Carbon Dioxide"]);
  });

  it("should report errors when required headers are missing", () => {
    const badHeaders = ["order", "prompt", "answer"]; // missing 'type'
    const rows = [{ order: "1", prompt: "Test", answer: "A" }];

    const result = validateRows(rows, badHeaders);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].message).toContain("Missing required column(s): type");
  });

  it("should report error when multiple choice answer letter is out of range", () => {
    const rows = [
      {
        order: "1",
        type: "multiple_choice",
        prompt: "Sample",
        opt_a: "First",
        opt_b: "Second",
        answer: "D", // only A and B exist
      },
    ];

    const result = validateRows(rows, standardHeaders);
    expect(result.invalidRows).toBe(1);
    expect(result.issues.some((i) => i.column === "answer")).toBe(true);
  });
});
