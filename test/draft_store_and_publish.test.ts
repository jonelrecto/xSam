import { describe, it, expect, beforeEach } from "vitest";
import { useDraftStore, blankQuestion } from "../src/hooks/use-draft-store";
import {
  publishableQuestionSchema,
  examDetailsSchema,
  type DraftQuestion,
} from "../src/lib/schemas/exam";

describe("Phase 2: Zustand Draft Store Mechanics", () => {
  beforeEach(() => {
    useDraftStore.getState().init("test-exam", [], 0);
  });

  it("should add a new question and assign sequential order numbers", () => {
    const store = useDraftStore.getState();
    store.add("multiple_choice");
    store.add("true_false");

    const state = useDraftStore.getState();
    expect(state.questions.length).toBe(2);
    expect(state.questions[0].order).toBe(1);
    expect(state.questions[1].order).toBe(2);
  });

  it("should synchronize answers when the selected option is renamed", () => {
    const store = useDraftStore.getState();
    store.add("multiple_choice");
    const qId = useDraftStore.getState().questions[0].tempId;

    // Set options
    store.setOption(qId, 0, "Mercury");
    store.setOption(qId, 1, "Venus");

    // Select 'Mercury' as correct answer
    store.setAnswers(qId, ["Mercury"]);
    expect(useDraftStore.getState().questions[0].answers).toEqual(["Mercury"]);
    expect(useDraftStore.getState().questions[0].confirmed).toBe(true);

    // Rename 'Mercury' to 'Planet Mercury'
    store.setOption(qId, 0, "Planet Mercury");
    expect(useDraftStore.getState().questions[0].answers).toEqual(["Planet Mercury"]);
  });

  it("should clear answers and un-confirm question if the correct option is deleted", () => {
    const store = useDraftStore.getState();
    store.add("multiple_choice");
    const qId = useDraftStore.getState().questions[0].tempId;

    store.addOption(qId); // 3 options total
    store.setOption(qId, 0, "Option A");
    store.setOption(qId, 1, "Option B");
    store.setOption(qId, 2, "Option C");

    store.setAnswers(qId, ["Option B"]);
    expect(useDraftStore.getState().questions[0].confirmed).toBe(true);

    // Remove Option B (index 1)
    store.removeOption(qId, 1);
    const updated = useDraftStore.getState().questions[0];
    expect(updated.options).toEqual(["Option A", "Option C"]);
    expect(updated.answers).toEqual([]);
    expect(updated.confirmed).toBe(false);
  });

  it("should reset options and answers when question type is switched", () => {
    const store = useDraftStore.getState();
    store.add("multiple_choice");
    const qId = useDraftStore.getState().questions[0].tempId;

    store.patch(qId, { prompt: "Explain concept", points: 5 });
    store.setOption(qId, 0, "Choice 1");
    store.setAnswers(qId, ["Choice 1"]);

    // Switch to Essay
    store.setType(qId, "essay");
    const updated = useDraftStore.getState().questions[0];

    expect(updated.type).toBe("essay");
    expect(updated.prompt).toBe("Explain concept");
    expect(updated.points).toBe(5);
    expect(updated.options).toBeNull();
    expect(updated.answers).toEqual([]);
  });

  it("should renumber questions sequentially when items are moved or deleted", () => {
    const store = useDraftStore.getState();
    store.add("multiple_choice"); // Q1
    store.add("true_false"); // Q2
    store.add("identification"); // Q3

    const q2Id = useDraftStore.getState().questions[1].tempId;

    // Delete Q2
    store.remove(q2Id);
    let state = useDraftStore.getState();
    expect(state.questions.length).toBe(2);
    expect(state.questions[0].order).toBe(1);
    expect(state.questions[1].order).toBe(2);

    // Move Q2 to Q1
    store.move(1, 0);
    state = useDraftStore.getState();
    expect(state.questions[0].type).toBe("identification");
    expect(state.questions[0].order).toBe(1);
    expect(state.questions[1].type).toBe("multiple_choice");
    expect(state.questions[1].order).toBe(2);
  });

  it("should confirm only provided questions with answers during confirmAllProvided()", () => {
    const store = useDraftStore.getState();
    store.add("multiple_choice"); // Provided, with answer
    store.add("multiple_choice"); // Provided, without answer
    store.add("multiple_choice"); // AI inferred, with answer

    const [q1, q2, q3] = useDraftStore.getState().questions;

    store.setAnswers(q1.tempId, ["Opt 1"]);
    store.setConfirmed(q1.tempId, false);

    store.patch(q3.tempId, {
      answers: ["Opt 1"],
      answerSource: "ai_inferred",
      confirmed: false,
    });

    store.confirmAllProvided();

    const state = useDraftStore.getState();
    expect(state.questions[0].confirmed).toBe(true); // provided with answer -> confirmed
    expect(state.questions[1].confirmed).toBe(false); // no answer -> unconfirmed
    expect(state.questions[2].confirmed).toBe(false); // ai_inferred -> stays unconfirmed
  });
});

describe("Phase 2: Strict Publish Gate Validation", () => {
  it("should reject question with blank prompt", () => {
    const q: DraftQuestion = {
      tempId: "1",
      order: 1,
      type: "multiple_choice",
      prompt: "   ",
      options: ["A", "B"],
      answers: ["A"],
      answerSource: "provided",
      points: 1,
      warnings: [],
      tags: [],
      confirmed: true,
    };
    const res = publishableQuestionSchema.safeParse(q);
    expect(res.success).toBe(false);
  });

  it("should reject multiple choice with duplicate options", () => {
    const q: DraftQuestion = {
      tempId: "1",
      order: 1,
      type: "multiple_choice",
      prompt: "Valid prompt",
      options: ["Duplicate", "duplicate"],
      answers: ["Duplicate"],
      answerSource: "provided",
      points: 1,
      warnings: [],
      tags: [],
      confirmed: true,
    };
    const res = publishableQuestionSchema.safeParse(q);
    expect(res.success).toBe(false);
  });

  it("should reject multiple choice when answer is not in options", () => {
    const q: DraftQuestion = {
      tempId: "1",
      order: 1,
      type: "multiple_choice",
      prompt: "Valid prompt",
      options: ["Option 1", "Option 2"],
      answers: ["Option 3"],
      answerSource: "provided",
      points: 1,
      warnings: [],
      tags: [],
      confirmed: true,
    };
    const res = publishableQuestionSchema.safeParse(q);
    expect(res.success).toBe(false);
  });

  it("should reject unconfirmed non-essay questions", () => {
    const q: DraftQuestion = {
      tempId: "1",
      order: 1,
      type: "true_false",
      prompt: "The sky is blue",
      options: null,
      answers: ["true"],
      answerSource: "provided",
      points: 1,
      warnings: [],
      tags: [],
      confirmed: false, // Unconfirmed
    };
    const res = publishableQuestionSchema.safeParse(q);
    expect(res.success).toBe(false);
  });

  it("should accept valid essay without answers", () => {
    const q: DraftQuestion = {
      tempId: "1",
      order: 1,
      type: "essay",
      prompt: "Discuss the architectural trade-offs of offline-first databases.",
      options: null,
      answers: [],
      answerSource: "missing",
      points: 10,
      warnings: [],
      tags: [],
      confirmed: true,
    };
    const res = publishableQuestionSchema.safeParse(q);
    expect(res.success).toBe(true);
  });
});

describe("Phase 2: Exam Details Schema Validation", () => {
  it("should reject scheduledEnd when it is before scheduledStart", () => {
    const res = examDetailsSchema.safeParse({
      title: "Sample Exam",
      durationMinutes: 30,
      scheduledStart: "2026-10-01T10:00:00.000Z",
      scheduledEnd: "2026-10-01T09:00:00.000Z",
      shuffleQuestions: true,
      shuffleOptions: true,
    });
    expect(res.success).toBe(false);
  });

  it("should reject schedule window that is shorter than exam duration", () => {
    const res = examDetailsSchema.safeParse({
      title: "Sample Exam",
      durationMinutes: 60, // 60 minutes
      scheduledStart: "2026-10-01T10:00:00.000Z",
      scheduledEnd: "2026-10-01T10:30:00.000Z", // only 30 minutes window
      shuffleQuestions: true,
      shuffleOptions: true,
    });
    expect(res.success).toBe(false);
  });
});
