import { renderTiptapHtml } from "./editor/converters";

export type Layout = {
  order: string[];
  options: Record<string, number[]>;
};

export type BaseQuestion = {
  id: string;
  type: string;
  prompt: string;
  promptJson?: any;
  options?: string[] | null;
  points: string | number;
  context?: string | null;
  instructions?: string | null;
  underlined?: string | null;
  [key: string]: any;
};

const ANCHOR_REGEX =
  /(all|none|both) of the above|wala sa nabanggit|lahat ng nabanggit|parehong|\b[A-F]\s*(and|at|&|,)\s*[A-F]\b/i;

export const keepsOptionOrder = (opts: string[]): boolean =>
  opts.some((o) => ANCHOR_REGEX.test(o));

function pseudoRandomShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeLayout(
  exam: { shuffleQuestions: boolean; shuffleOptions: boolean },
  qs: BaseQuestion[]
): Layout {
  // 1. Group questions sharing a passage context into unbreakable units
  const units: BaseQuestion[][][] = [];
  let currentUnit: BaseQuestion[] = [];

  for (const q of qs) {
    if (
      currentUnit.length > 0 &&
      currentUnit[0].context &&
      q.context === currentUnit[0].context
    ) {
      currentUnit.push(q);
    } else {
      if (currentUnit.length > 0) {
        addToSections(units, currentUnit);
      }
      currentUnit = [q];
    }
  }
  if (currentUnit.length > 0) {
    addToSections(units, currentUnit);
  }

  function addToSections(sections: BaseQuestion[][][], unit: BaseQuestion[]) {
    const lastSection = sections[sections.length - 1];
    const unitInstructions = unit[0].instructions || "";
    if (
      lastSection &&
      lastSection.length > 0 &&
      (lastSection[0][0].instructions || "") === unitInstructions
    ) {
      lastSection.push(unit);
    } else {
      sections.push([unit]);
    }
  }

  // 2. Shuffle units within their respective sections
  const order: string[] = [];
  for (const section of units) {
    const sectionUnits = exam.shuffleQuestions ? pseudoRandomShuffle(section) : section;
    for (const unit of sectionUnits) {
      for (const q of unit) {
        order.push(q.id);
      }
    }
  }

  // 3. Permute options for multiple choice questions
  const options: Record<string, number[]> = {};
  for (const q of qs) {
    if (q.type === "multiple_choice" && q.options && q.options.length > 0) {
      const indices = q.options.map((_, i) => i);
      options[q.id] =
        exam.shuffleOptions && !keepsOptionOrder(q.options)
          ? pseudoRandomShuffle(indices)
          : indices;
    }
  }

  return { order, options };
}

export type StudentQuestion = {
  id: string;
  number: number;
  type: "multiple_choice" | "true_false" | "identification" | "essay";
  prompt: string;
  promptHtml: string;
  options: string[] | null;
  points: number;
  context: string | null;
  instructions: string | null;
  underlined: string | null;
};

/**
 * Zero-Knowledge Student Paper Serializer
 * Strips answer keys, validation warnings, and inference metadata.
 */
export function buildPaper(qs: BaseQuestion[], layout: Layout): StudentQuestion[] {
  const byId = new Map(qs.map((q) => [q.id, q]));

  return layout.order.flatMap((id, i) => {
    const q = byId.get(id);
    if (!q) return [];

    const perm = layout.options[id];
    let sanitizedOptions: string[] | null = null;

    if (q.options && perm) {
      sanitizedOptions = perm.map((k) => q.options![k]);
    } else if (q.options) {
      sanitizedOptions = q.options;
    }

    return [
      {
        id: q.id,
        number: i + 1,
        type: q.type as any,
        prompt: q.prompt,
        promptHtml: renderTiptapHtml(q.promptJson || q.prompt),
        options: sanitizedOptions,
        points: Number(q.points),
        context: q.context ?? null,
        instructions: q.instructions ?? null,
        underlined: q.underlined ?? null,
      },
    ];
  });
}
