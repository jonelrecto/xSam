import { describe, it, expect } from "vitest";
import { normalizeAnswer, evaluateQuestion } from "../src/lib/exam/grade";
import { keepsOptionOrder, makeLayout, buildPaper, type StudentQuestion } from "../src/lib/exam/paper";
import { evaluateAvailability } from "../src/lib/exam/availability";
import { type Question } from "../src/lib/db/schema";

describe("Phase 4: NFKC Normalizer Engine", () => {
  it("should strip punctuation and special characters from answers", () => {
    expect(normalizeAnswer("R.A. 9003")).toBe("ra 9003");
    expect(normalizeAnswer("St. Luke's Medical Center")).toBe("st lukes medical center");
    expect(normalizeAnswer("Republic Act No. 10173!")).toBe("republic act no 10173");
    expect(normalizeAnswer("Hello, World; (2026)?")).toBe("hello world 2026");
  });

  it("should strip diacritics and accents cleanly", () => {
    expect(normalizeAnswer("Resumé")).toBe("resume");
    expect(normalizeAnswer("El Niño")).toBe("el nino");
    expect(normalizeAnswer("Café con Leche")).toBe("cafe con leche");
  });

  it("should collapse multiple whitespace sequences and trim", () => {
    expect(normalizeAnswer("   Photosynthesis    is   great   ")).toBe("photosynthesis is great");
    expect(normalizeAnswer("\t\nCarbon   Dioxide\n")).toBe("carbon dioxide");
  });

  it("should handle null and undefined safely", () => {
    expect(normalizeAnswer(null)).toBe("");
    expect(normalizeAnswer(undefined)).toBe("");
    expect(normalizeAnswer("")).toBe("");
  });
});

describe("Phase 4: Question Evaluation Engine", () => {
  const mockBaseQuestion: Question = {
    id: "q-1",
    examId: "exam-1",
    bankQuestionId: null,
    categoryId: null,
    orderIndex: 1,
    type: "multiple_choice",
    prompt: "Sample Prompt",
    promptJson: null,
    options: ["Option A", "Option B", "Option C"],
    answers: ["Option B"],
    points: "2.0",
    tags: [],
    context: null,
    contextJson: null,
    instructions: null,
    instructionsJson: null,
    underlined: null,
    answerSource: "provided",
    warnings: [],
    sourcePage: null,
    confirmed: true,
    createdAt: new Date(),
  };

  it("should grade multiple choice questions correctly", () => {
    // Correct
    const correctRes = evaluateQuestion(mockBaseQuestion, "Option B");
    expect(correctRes.isCorrect).toBe(true);
    expect(correctRes.pointsAwarded).toBe(2.0);

    // Incorrect
    const wrongRes = evaluateQuestion(mockBaseQuestion, "Option A");
    expect(wrongRes.isCorrect).toBe(false);
    expect(wrongRes.pointsAwarded).toBe(0);

    // Empty
    const emptyRes = evaluateQuestion(mockBaseQuestion, "");
    expect(emptyRes.isCorrect).toBe(false);
    expect(emptyRes.pointsAwarded).toBe(0);
  });

  it("should grade true/false questions case-insensitively", () => {
    const tfQuestion: Question = {
      ...mockBaseQuestion,
      type: "true_false",
      answers: ["true"],
      points: "1.0",
    };

    expect(evaluateQuestion(tfQuestion, "True").isCorrect).toBe(true);
    expect(evaluateQuestion(tfQuestion, "TRUE").pointsAwarded).toBe(1.0);
    expect(evaluateQuestion(tfQuestion, "false").isCorrect).toBe(false);
    expect(evaluateQuestion(tfQuestion, "false").pointsAwarded).toBe(0);
  });

  it("should grade identification questions with multi-variant keys and NFKC normalization", () => {
    const identQuestion: Question = {
      ...mockBaseQuestion,
      type: "identification",
      answers: ["Republic Act 9003", "R.A. 9003", "Ecological Solid Waste Management Act"],
      points: "3.0",
    };

    // Test exact key match
    expect(evaluateQuestion(identQuestion, "Republic Act 9003").isCorrect).toBe(true);
    expect(evaluateQuestion(identQuestion, "Republic Act 9003").pointsAwarded).toBe(3.0);

    // Test punctuation & case variance ("r.a. 9003" should match "R.A. 9003")
    expect(evaluateQuestion(identQuestion, "r.a. 9003").isCorrect).toBe(true);

    // Test alternate synonym with extra spaces
    expect(
      evaluateQuestion(identQuestion, "  ecological  solid   waste management act  ").isCorrect
    ).toBe(true);

    // Test incorrect answer
    expect(evaluateQuestion(identQuestion, "Clean Air Act").isCorrect).toBe(false);
    expect(evaluateQuestion(identQuestion, "Clean Air Act").pointsAwarded).toBe(0);
  });

  it("should defer grading for essay questions to manual instructor review", () => {
    const essayQuestion: Question = {
      ...mockBaseQuestion,
      type: "essay",
      answers: [],
      points: "5.0",
    };

    const res = evaluateQuestion(essayQuestion, "This is a thoughtful student essay.");
    expect(res.isCorrect).toBe(null);
    expect(res.pointsAwarded).toBe(null);
  });
});

describe("Phase 4: Anchor Detection and Shuffling Rules", () => {
  it("should detect anchor options that must preserve order", () => {
    expect(keepsOptionOrder(["Red", "Blue", "All of the above"])).toBe(true);
    expect(keepsOptionOrder(["Option A", "Option B", "None of the above"])).toBe(true);
    expect(keepsOptionOrder(["Opsyon 1", "Opsyon 2", "Wala sa nabanggit"])).toBe(true);
    expect(keepsOptionOrder(["Lahat ng nabanggit", "B", "C"])).toBe(true);
    expect(keepsOptionOrder(["Option A", "Option B", "Both A and B"])).toBe(true);

    // Standard options should not trigger anchor protection
    expect(keepsOptionOrder(["Oxygen", "Hydrogen", "Nitrogen", "Helium"])).toBe(false);
  });
});

describe("Phase 4: Zero-Knowledge Student Paper Delivery", () => {
  const sampleQuestions: Question[] = [
    {
      id: "q-1",
      examId: "exam-1",
      bankQuestionId: null,
      categoryId: null,
      orderIndex: 1,
      type: "multiple_choice",
      prompt: "What is the primary gas in the atmosphere?",
      promptJson: null,
      options: ["Nitrogen", "Oxygen", "Argon", "Carbon Dioxide"],
      answers: ["Nitrogen"],
      points: "1.0",
      tags: [],
      context: null,
      contextJson: null,
      instructions: "Choose the single best answer",
      instructionsJson: null,
      underlined: "primary gas",
      answerSource: "provided",
      warnings: ["Check spelling"],
      sourcePage: 1,
      confirmed: true,
      createdAt: new Date(),
    },
    {
      id: "q-2",
      examId: "exam-1",
      bankQuestionId: null,
      categoryId: null,
      orderIndex: 2,
      type: "identification",
      prompt: "State Newton's first law concept.",
      promptJson: null,
      options: null,
      answers: ["Inertia"],
      points: "2.0",
      tags: [],
      context: "Physics mechanics section",
      contextJson: null,
      instructions: null,
      instructionsJson: null,
      underlined: null,
      answerSource: "ai_inferred",
      warnings: [],
      sourcePage: null,
      confirmed: true,
      createdAt: new Date(),
    },
  ];

  it("should build sanitized student paper with zero answers or AI notes", () => {
    const layout = makeLayout(
      { shuffleQuestions: false, shuffleOptions: false },
      sampleQuestions
    );

    const paper = buildPaper(sampleQuestions, layout);

    expect(paper.length).toBe(2);

    const q1 = paper[0];
    expect(q1.id).toBe("q-1");
    expect(q1.number).toBe(1);
    expect(q1.prompt).toBe("What is the primary gas in the atmosphere?");
    expect(q1.options).toEqual(["Nitrogen", "Oxygen", "Argon", "Carbon Dioxide"]);
    expect(q1.points).toBe(1.0);
    expect(q1.underlined).toBe("primary gas");
    expect(q1.instructions).toBe("Choose the single best answer");

    // CRITICAL: Verify zero leaks
    expect((q1 as any).answers).toBeUndefined();
    expect((q1 as any).aiNote).toBeUndefined();
    expect((q1 as any).answerSource).toBeUndefined();
    expect((q1 as any).validationWarnings).toBeUndefined();

    const q2 = paper[1];
    expect(q2.id).toBe("q-2");
    expect(q2.number).toBe(2);
    expect((q2 as any).answers).toBeUndefined();
    expect((q2 as any).aiNote).toBeUndefined();
  });
});

describe("Phase 4: Exam Availability Evaluator", () => {
  const baseExam = {
    status: "published" as const,
    scheduledStart: null,
    scheduledEnd: null,
  };

  it("should return 'unpublished' for draft exams", () => {
    expect(evaluateAvailability({ ...baseExam, status: "draft" })).toBe("unpublished");
  });

  it("should return 'closed' for archived exams", () => {
    expect(evaluateAvailability({ ...baseExam, status: "archived" })).toBe("closed");
  });

  it("should return 'open' for published exams with no schedule constraints", () => {
    expect(evaluateAvailability(baseExam)).toBe("open");
  });

  it("should return 'not_yet' if scheduled start is in the future", () => {
    const futureDate = new Date(Date.now() + 3600 * 1000);
    expect(
      evaluateAvailability({ ...baseExam, scheduledStart: futureDate })
    ).toBe("not_yet");
  });

  it("should return 'ended' if scheduled end is in the past", () => {
    const pastDate = new Date(Date.now() - 3600 * 1000);
    expect(
      evaluateAvailability({ ...baseExam, scheduledEnd: pastDate })
    ).toBe("ended");
  });

  it("should return 'open' when current time falls within scheduled window", () => {
    const pastDate = new Date(Date.now() - 1000 * 60);
    const futureDate = new Date(Date.now() + 1000 * 3600);
    expect(
      evaluateAvailability({
        ...baseExam,
        scheduledStart: pastDate,
        scheduledEnd: futureDate,
      })
    ).toBe("open");
  });
});
