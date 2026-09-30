import { create } from "zustand";
import type { DraftQuestion, QuestionType } from "@/lib/schemas/exam";
import { plainTextToTiptap } from "@/lib/editor/converters";

const renumber = (qs: DraftQuestion[]) =>
  qs.map((q, i) => ({ ...q, order: i + 1 }));

export const blankQuestion = (type: QuestionType): DraftQuestion => ({
  tempId:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 9),
  order: 0,
  type,
  prompt: "",
  promptJson: plainTextToTiptap(""),
  options: type === "multiple_choice" ? ["", ""] : null,
  answers: [],
  answerSource: type === "essay" ? "missing" : "provided",
  points: 1,
  warnings: [],
  tags: [],
  confirmed: type === "essay", // essays are exempt from confirmation
});

type DraftState = {
  examId: string | null;
  hydrated: boolean;
  version: number;
  revision: number;
  savedRevision: number;
  questions: DraftQuestion[];
  init: (examId: string, qs: DraftQuestion[], version: number) => void;
  load: (qs: DraftQuestion[], mode: "replace" | "append") => void;
  add: (type: QuestionType) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  move: (from: number, to: number) => void;
  patch: (id: string, p: Partial<DraftQuestion>) => void;
  setType: (id: string, type: QuestionType) => void;
  setPrompt: (id: string, promptJson: any, plainText: string) => void;
  setOption: (id: string, idx: number, text: string) => void;
  addOption: (id: string) => void;
  removeOption: (id: string, idx: number) => void;
  setAnswers: (id: string, answers: string[]) => void;
  setConfirmed: (id: string, v: boolean) => void;
  confirmAllProvided: () => void;
  markSaved: (version: number, revision: number) => void;
};

export const useDraftStore = create<DraftState>((set) => {
  const mutate = (fn: (qs: DraftQuestion[]) => DraftQuestion[]) =>
    set((s) => ({
      questions: renumber(fn(s.questions)),
      revision: s.revision + 1,
    }));

  const mapQ = (id: string, fn: (q: DraftQuestion) => DraftQuestion) =>
    mutate((qs) => qs.map((q) => (q.tempId === id ? fn(q) : q)));

  return {
    examId: null,
    hydrated: false,
    version: 0,
    revision: 0,
    savedRevision: 0,
    questions: [],

    init: (examId, qs, version) =>
      set({
        examId,
        hydrated: true,
        version,
        questions: renumber(
          qs.map((q) => ({
            ...q,
            promptJson:
              q.promptJson || plainTextToTiptap(q.prompt, q.underlined),
          }))
        ),
        revision: 0,
        savedRevision: 0,
      }),

    load: (qs, mode) =>
      mutate((cur) =>
        mode === "append"
          ? [
              ...cur,
              ...qs.map((q) => ({
                ...q,
                promptJson:
                  q.promptJson || plainTextToTiptap(q.prompt, q.underlined),
              })),
            ]
          : qs.map((q) => ({
              ...q,
              promptJson:
                q.promptJson || plainTextToTiptap(q.prompt, q.underlined),
            }))
      ),

    add: (type) => mutate((qs) => [...qs, blankQuestion(type)]),

    remove: (id) => mutate((qs) => qs.filter((q) => q.tempId !== id)),

    duplicate: (id) =>
      mutate((qs) => {
        const i = qs.findIndex((q) => q.tempId === id);
        if (i < 0) return qs;
        const copy = {
          ...structuredClone(qs[i]),
          id: undefined, // Fresh UUID on save
          tempId:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).substring(2, 9),
        };
        return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)];
      }),

    move: (from, to) =>
      mutate((qs) => {
        if (to < 0 || to >= qs.length) return qs;
        const next = [...qs];
        const [m] = next.splice(from, 1);
        next.splice(to, 0, m);
        return next;
      }),

    patch: (id, p) => mapQ(id, (q) => ({ ...q, ...p })),

    setType: (id, type) =>
      mapQ(id, (q) => ({
        ...blankQuestion(type),
        id: q.id,
        tempId: q.tempId,
        prompt: q.prompt,
        promptJson: q.promptJson,
        points: q.points,
        tags: q.tags,
        categoryId: q.categoryId,
      })),

    setPrompt: (id, promptJson, plainText) =>
      mapQ(id, (q) => ({
        ...q,
        promptJson,
        prompt: plainText,
      })),

    setOption: (id, idx, text) =>
      mapQ(id, (q) => {
        const options = [...(q.options ?? [])];
        const old = options[idx];
        options[idx] = text;
        // Keep answer key in sync if the modified option was the selected answer
        const answers =
          q.answers[0] === old && old !== "" ? [text] : q.answers;
        return { ...q, options, answers };
      }),

    addOption: (id) =>
      mapQ(id, (q) =>
        (q.options?.length ?? 0) >= 6
          ? q
          : { ...q, options: [...(q.options ?? []), ""] }
      ),

    removeOption: (id, idx) =>
      mapQ(id, (q) => {
        const options = [...(q.options ?? [])];
        if (options.length <= 2) return q;
        const [removed] = options.splice(idx, 1);
        const wasKey = q.answers[0] === removed;
        return {
          ...q,
          options,
          answers: wasKey ? [] : q.answers,
          confirmed: wasKey ? false : q.confirmed,
        };
      }),

    setAnswers: (id, answers) =>
      mapQ(id, (q) => ({
        ...q,
        answers,
        answerSource: "provided",
        confirmed: answers.length > 0,
      })),

    setConfirmed: (id, v) => mapQ(id, (q) => ({ ...q, confirmed: v })),

    confirmAllProvided: () =>
      mutate((qs) =>
        qs.map((q) =>
          q.answerSource === "provided" && q.answers.length > 0
            ? { ...q, confirmed: true }
            : q
        )
      ),

    markSaved: (version, revision) =>
      set({ version, savedRevision: revision }),
  };
});
