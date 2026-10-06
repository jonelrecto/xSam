import { z } from "zod";
import { validateTiptapJson } from "@/lib/editor/converters";

export const questionTypeEnum = z.enum([
  "multiple_choice",
  "true_false",
  "identification",
  "essay",
]);

export type QuestionType = z.infer<typeof questionTypeEnum>;

export const examDetailsSchema = z
  .object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(255),
    description: z.string().trim().max(2000).optional(),
    durationMinutes: z.number().int().min(5, "Duration must be at least 5 minutes").max(480, "Maximum 8 hours"),
    passingPercent: z.number().int().min(1, "Passing percentage must be between 1 and 100").max(100).default(60),
    categoryId: z.string().uuid().optional().nullable(),
    scheduledStart: z.string().optional().nullable(),
    scheduledEnd: z.string().min(1, "Closing date and time is required"),
    shuffleQuestions: z.boolean().default(true),
    shuffleOptions: z.boolean().default(true),
    requireCamera: z.boolean().default(false),
    showScoreOnSubmit: z.boolean().default(false),
    enforceFullscreen: z.boolean().default(true),
    restrictInput: z.boolean().default(false),
  })
  .refine(
    (v) => {
      if (v.scheduledStart && v.scheduledEnd) {
        return new Date(v.scheduledEnd) > new Date(v.scheduledStart);
      }
      return true;
    },
    { path: ["scheduledEnd"], message: "Scheduled end time must be after start time" }
  )
  .refine(
    (v) => {
      if (v.scheduledStart && v.scheduledEnd) {
        const start = new Date(v.scheduledStart).getTime();
        const end = new Date(v.scheduledEnd).getTime();
        const windowMinutes = (end - start) / 60000;
        return windowMinutes >= v.durationMinutes;
      }
      return true;
    },
    {
      path: ["scheduledEnd"],
      message: "Scheduled availability window is shorter than the exam duration",
    }
  );

export type ExamDetailsInput = z.infer<typeof examDetailsSchema>;

// Lenient draft schema for in-progress autosaving
export const draftQuestionSchema = z.object({
  id: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val ? val : undefined)), // Real database UUID if existing
  tempId: z.string(), // Stable client identification key
  bankQuestionId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val ? val : undefined)),
  categoryId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val ? val : undefined)),
  order: z.coerce.number().int().min(0),
  type: questionTypeEnum,
  prompt: z.string().max(10000),
  promptJson: z.any().optional().nullable(),
  options: z.array(z.string().max(1000)).max(6).nullable().optional(),
  answers: z.array(z.string().max(1000)).max(20).default([]),
  answerSource: z.enum(["provided", "ai_inferred", "missing"]).default("provided"),
  points: z.coerce.number().min(0).max(100).default(1),
  sourcePage: z.coerce.number().int().min(0).optional().nullable().or(z.literal("")).transform((val) => (typeof val === "number" ? val : undefined)),
  warnings: z.array(z.string().max(300)).max(20).default([]),
  tags: z.array(z.string().max(50)).default([]),
  confirmed: z.boolean().default(false),
  context: z.string().max(10000).optional().nullable(),
  contextJson: z.any().optional().nullable(),
  instructions: z.string().max(5000).optional().nullable(),
  instructionsJson: z.any().optional().nullable(),
  underlined: z.string().max(500).optional().nullable(),
});

export type DraftQuestion = z.infer<typeof draftQuestionSchema>;

export const saveDraftSchema = z.array(draftQuestionSchema).max(200);

// Strict schema used by the publish gate and live validation checklist
export const publishableQuestionSchema = draftQuestionSchema.superRefine((q, ctx) => {
  const fail = (message: string, path: string[] = ["answers"]) =>
    ctx.addIssue({ code: "custom", message, path });

  if (!q.prompt.trim()) {
    fail("Question text is required", ["prompt"]);
  }

  // Validate Tiptap JSON allowlist if JSON document is provided
  if (q.promptJson && typeof q.promptJson === "object") {
    if (!validateTiptapJson(q.promptJson)) {
      fail("Rich text format contains disallowed nodes or marks", ["prompt"]);
    }
  }

  if (q.type !== "essay" && !q.confirmed) {
    fail("Answer must be confirmed before publishing", ["confirmed"]);
  }

  switch (q.type) {
    case "multiple_choice": {
      const opts = (q.options ?? []).map((o) => o.trim());
      if (opts.length < 2 || opts.some((o) => !o)) {
        return fail("Multiple choice questions require at least 2 non-empty options", ["options"]);
      }
      const uniqueOpts = new Set(opts.map((o) => o.toLowerCase()));
      if (uniqueOpts.size !== opts.length) {
        return fail("All options must be unique", ["options"]);
      }
      if (q.answers.length !== 1 || !opts.includes(q.answers[0].trim())) {
        fail("Please select one correct option from the choices", ["answers"]);
      }
      break;
    }
    case "true_false": {
      if (
        q.answers.length !== 1 ||
        !["true", "false"].includes(q.answers[0].toLowerCase().trim())
      ) {
        fail("Please choose either True or False as the answer key", ["answers"]);
      }
      break;
    }
    case "identification": {
      if (!q.answers.some((a) => a.trim())) {
        fail("Add at least one accepted identification answer", ["answers"]);
      }
      break;
    }
    case "essay":
      // Essays are manually graded, no answer key is required
      break;
  }
});
