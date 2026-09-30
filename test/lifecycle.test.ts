import { describe, it, expect } from "vitest";
import { canEditExam } from "../src/lib/exam/lifecycle";

describe("Exam Lifecycle Lock Rule", () => {
  it("allows editing draft exams regardless of session count or clock", () => {
    expect(canEditExam({ status: "draft" }, 0)).toBe(true);
    expect(canEditExam({ status: "draft" }, 5)).toBe(true);
    expect(
      canEditExam(
        { status: "draft", scheduledStart: new Date(Date.now() - 10000) },
        0
      )
    ).toBe(true);
  });

  it("allows editing published exams if 0 sessions and start time is null", () => {
    expect(canEditExam({ status: "published", scheduledStart: null }, 0)).toBe(
      true
    );
  });

  it("allows editing published exams if 0 sessions and start time is in the future", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000); // 1 hour ahead
    expect(
      canEditExam({ status: "published", scheduledStart: future }, 0)
    ).toBe(true);
  });

  it("strictly locks published exams if 1 or more student sessions exist", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    expect(
      canEditExam({ status: "published", scheduledStart: future }, 1)
    ).toBe(false);
    expect(canEditExam({ status: "published", scheduledStart: null }, 3)).toBe(
      false
    );
  });

  it("strictly locks published exams if scheduled start time has arrived or passed", () => {
    const past = new Date(Date.now() - 60 * 1000); // 1 minute ago
    expect(canEditExam({ status: "published", scheduledStart: past }, 0)).toBe(
      false
    );
  });

  it("strictly locks archived exams", () => {
    expect(canEditExam({ status: "archived" }, 0)).toBe(false);
  });
});
