import { describe, it, expect } from "vitest";
import { computeQuestionHash } from "../src/lib/exam/bank-hash";

describe("Question Bank Deduplication Hashing", () => {
  it("produces identical hashes for identical questions", () => {
    const hash1 = computeQuestionHash(
      "What is 2 + 2?",
      ["3", "4", "5"],
      ["4"]
    );
    const hash2 = computeQuestionHash(
      "What is 2 + 2?",
      ["3", "4", "5"],
      ["4"]
    );
    expect(hash1).toBe(hash2);
  });

  it("is case-insensitive and punctuation/whitespace-insensitive", () => {
    const hash1 = computeQuestionHash(
      "What is the capital of France?",
      ["Paris", "London", "Rome"],
      ["Paris"]
    );
    const hash2 = computeQuestionHash(
      "what is the capital of france? ",
      ["paris", "london", "rome"],
      ["paris"]
    );
    expect(hash1).toBe(hash2);
  });

  it("is permutation-invariant for multiple-choice options", () => {
    const hash1 = computeQuestionHash(
      "Select the prime number",
      ["4", "6", "7", "8"],
      ["7"]
    );
    const hash2 = computeQuestionHash(
      "Select the prime number",
      ["8", "7", "4", "6"],
      ["7"]
    );
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different question prompts or keys", () => {
    const hash1 = computeQuestionHash("Question A", ["1", "2"], ["1"]);
    const hash2 = computeQuestionHash("Question B", ["1", "2"], ["1"]);
    const hash3 = computeQuestionHash("Question A", ["1", "2"], ["2"]);

    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });
});
