import type { DraftQuestion, QuestionType } from "@/lib/schemas/exam";

export interface ExtractionResult {
  questions: DraftQuestion[];
  detectedSections: string[];
  totalExtracted: number;
}

/**
 * Intelligent Document & Heuristic Question Extractor
 * Parses multi-part exams, instructions, passages, question numbers, options, and keys.
 */
export function extractQuestionsFromText(rawText: string): ExtractionResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const questions: DraftQuestion[] = [];
  const detectedSections: string[] = [];

  let currentInstruction: string | undefined = undefined;
  let currentContext: string | undefined = undefined;

  let currentPrompt: string = "";
  let currentType: QuestionType = "multiple_choice";
  let currentOptions: string[] = [];
  let currentAnswers: string[] = [];
  let currentWarnings: string[] = [];

  const flushCurrent = () => {
    if (!currentPrompt.trim()) return;

    // Detect / finalize question type
    let finalType: QuestionType = currentType;
    let finalOptions: string[] | null = null;
    let finalAnswers = [...currentAnswers];
    let answerSource: "provided" | "ai_inferred" | "missing" = "ai_inferred";

    if (currentOptions.length >= 2) {
      finalType = "multiple_choice";
      finalOptions = currentOptions;
      if (finalAnswers.length === 0) {
        // AI heuristic: first choice as default guess, flagged for verification
        finalAnswers = [currentOptions[0]];
        currentWarnings.push("AI inferred first option as answer key placeholder. Verify before publishing.");
      }
    } else if (
      /true\s*\/\s*false|tama\s*o\s*mali/i.test(currentPrompt) ||
      (currentAnswers.length === 1 && ["true", "false"].includes(currentAnswers[0].toLowerCase())) ||
      (/^true\s*\/\s*false$/i.test((currentInstruction || "").trim()))
    ) {
      finalType = "true_false";
      finalOptions = null;
      if (finalAnswers.length === 0) {
        finalAnswers = ["true"];
        currentWarnings.push("AI guessed 'True'. Verify answer key against source material.");
      }
    } else if (
      /explain|describe|discuss|ipaliwanag|magbigay ng sanaysay/i.test(currentPrompt) ||
      currentPrompt.length > 250
    ) {
      finalType = "essay";
      finalOptions = null;
      finalAnswers = [];
      answerSource = "missing";
    } else {
      finalType = "identification";
      finalOptions = null;
      if (finalAnswers.length === 0) {
        currentWarnings.push("Identification question needs accepted answer key.");
      }
    }

    questions.push({
      tempId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      order: questions.length + 1,
      type: finalType,
      prompt: currentPrompt.trim(),
      options: finalOptions,
      answers: finalAnswers,
      answerSource,
      points: finalType === "essay" ? 5 : 1,
      warnings: currentWarnings,
      confirmed: finalType === "essay", // essays are exempt
      tags: [],
      context: currentContext,
      instructions: currentInstruction,
    });

    // Reset accumulator
    currentPrompt = "";
    currentOptions = [];
    currentAnswers = [];
    currentWarnings = [];
  };

  const sectionRegex =
    /^(part|section|test|bahagi|unit)\s+[IVX0-9]+[:\.\-]?\s*(.*)$/i;
  const directionRegex =
    /^(directions|instructions|panuto|mga tagubilin)[:\.\-]?\s*(.*)$/i;
  const passageStartRegex =
    /^(questions?\s+\d+[\-\d]*\s+(refer|based)\s+to|basahin ang sumusunod|read the following)/i;
  const questionNumberRegex = /^(\d+)[\.\)\-\:]\s+(.*)$/;
  const optionRegex = /^([A-Fa-f])[\.\)\-\:]\s+(.*)$/;
  const answerKeyRegex =
    /^(answer|ans|key|tamang sagot)[:\.\-]?\s*([A-Za-z0-9\s\|\,\.\-\'\"\’]+)$/i;

  let inPassage = false;
  let passageBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Detect Section Header
    const sectionMatch = line.match(sectionRegex);
    if (sectionMatch) {
      flushCurrent();
      currentInstruction = line;
      detectedSections.push(line);
      inPassage = false;
      continue;
    }

    // 2. Detect Directions
    const directionMatch = line.match(directionRegex);
    if (directionMatch) {
      flushCurrent();
      currentInstruction = currentInstruction
        ? `${currentInstruction} — ${line}`
        : line;
      inPassage = false;
      continue;
    }

    // 3. Detect Reading Passage block
    if (passageStartRegex.test(line)) {
      flushCurrent();
      inPassage = true;
      passageBuffer = [line];
      continue;
    }

    // 4. Detect Question start
    const qMatch = line.match(questionNumberRegex);
    if (qMatch) {
      flushCurrent();
      if (inPassage && passageBuffer.length > 0) {
        currentContext = passageBuffer.join("\n");
        inPassage = false;
      }
      currentPrompt = qMatch[2];
      currentType = "multiple_choice";
      continue;
    }

    // 5. If collecting passage lines
    if (inPassage) {
      passageBuffer.push(line);
      continue;
    }

    // 6. Detect Option line (e.g. A. Oxygen)
    const optMatch = line.match(optionRegex);
    if (optMatch && currentPrompt) {
      currentOptions.push(optMatch[2].trim());
      continue;
    }

    // 7. Detect Answer Key line (e.g. Answer: B or Answer: Manila)
    const ansMatch = line.match(answerKeyRegex);
    if (ansMatch && currentPrompt) {
      const rawAns = ansMatch[2].trim();
      const letterMatch = rawAns.match(/^[A-Fa-f]$/);
      if (letterMatch) {
        const letterIdx = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
        if (letterIdx < currentOptions.length) {
          currentAnswers = [currentOptions[letterIdx]];
        } else {
          currentAnswers = [rawAns];
        }
      } else {
        currentAnswers = rawAns
          .split("|")
          .map((a) => a.trim())
          .filter(Boolean);
      }
      continue;
    }

    // 8. Continuation line for prompt or passage
    if (currentPrompt) {
      currentPrompt += " " + line;
    }
  }

  flushCurrent();

  return {
    questions,
    detectedSections,
    totalExtracted: questions.length,
  };
}
