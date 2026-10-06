import { createHash } from "node:crypto";
import { normalizeAnswer } from "./grade";

export function computeQuestionHash(
  prompt: string,
  options?: string[] | null,
  answers?: string[] | null
): string {
  const normPrompt = normalizeAnswer(prompt);
  const normOptions = (options || [])
    .map((o) => normalizeAnswer(o))
    .sort()
    .join("::");
  const normAnswers = (answers || [])
    .map((a) => normalizeAnswer(a))
    .sort()
    .join("::");

  const payload = `${normPrompt}|${normOptions}|${normAnswers}`;
  return createHash("sha256").update(payload).digest("hex");
}
