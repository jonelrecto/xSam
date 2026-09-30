import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  uuid,
  date,
  integer,
  numeric,
  jsonb,
  bigint,
  unique,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const examStatusEnum = pgEnum("exam_status", [
  "draft",
  "published",
  "archived",
  "postponed",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "multiple_choice",
  "true_false",
  "identification",
  "essay",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "in_progress",
  "submitted",
]);

export type Layout = {
  order: string[];
  options: Record<string, number[]>;
};

// 1. Better Auth: User table with role and student number extension
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("student"),
  studentNumber: varchar("student_number", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 2. Better Auth: Session table
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

// 3. Better Auth: Account table
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 4. Better Auth: Verification table
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 5. Quota & Import Usage table
export const importUsage = pgTable(
  "import_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [unique("unique_user_day").on(t.userId, t.day)]
);

// 6. Categories Table (Teacher-Owned)
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 30 }).notNull().default("#6366f1"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 7. Exams table
export const exams = pgTable("exams", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull(),
  passingPercent: integer("passing_percent").notNull().default(60),
  status: examStatusEnum("status").notNull().default("draft"),
  draftVersion: integer("draft_version").notNull().default(0),
  accessCode: varchar("access_code", { length: 8 }).unique(),
  shuffleQuestions: boolean("shuffle_questions").notNull().default(true),
  shuffleOptions: boolean("shuffle_options").notNull().default(true),
  requireCamera: boolean("require_camera").notNull().default(false),
  showScoreOnSubmit: boolean("show_score_on_submit").notNull().default(false),
  enforceFullscreen: boolean("enforce_fullscreen").notNull().default(true),
  restrictInput: boolean("restrict_input").notNull().default(false),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 8. Question Bank Table (Teacher-Owned with dedupe hash)
export const questionBank = pgTable(
  "question_bank",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    type: questionTypeEnum("type").notNull(),
    prompt: text("prompt").notNull(),
    promptJson: jsonb("prompt_json"),
    options: jsonb("options").$type<string[] | null>(),
    answers: jsonb("answers").$type<string[]>().notNull().default([]),
    points: numeric("points", { precision: 5, scale: 2 })
      .notNull()
      .default("1.00"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    hash: varchar("hash", { length: 64 }).notNull(),
    context: text("context"),
    contextJson: jsonb("context_json"),
    instructions: text("instructions"),
    instructionsJson: jsonb("instructions_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_bank_teacher_cat").on(t.teacherId, t.categoryId),
    index("idx_bank_dedupe_hash").on(t.teacherId, t.hash),
  ]
);

// 9. Questions table
export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    bankQuestionId: uuid("bank_question_id").references(() => questionBank.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    orderIndex: integer("order_index").notNull(),
    type: questionTypeEnum("type").notNull(),
    prompt: text("prompt").notNull(),
    promptJson: jsonb("prompt_json"),
    options: jsonb("options").$type<string[] | null>(),
    answers: jsonb("answers").$type<string[]>().notNull().default([]),
    answerSource: text("answer_source").notNull().default("provided"),
    confirmed: boolean("confirmed").notNull().default(false),
    points: numeric("points", { precision: 5, scale: 2 })
      .notNull()
      .default("1.00"),
    sourcePage: integer("source_page"),
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    context: text("context"),
    contextJson: jsonb("context_json"),
    instructions: text("instructions"),
    instructionsJson: jsonb("instructions_json"),
    underlined: text("underlined"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_questions_exam").on(t.examId, t.orderIndex)]
);

// 10. Exam Sessions table
export const examSessions = pgTable(
  "exam_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    attemptNo: integer("attempt_no").notNull().default(1),
    status: sessionStatusEnum("status").notNull().default("in_progress"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submitReason: text("submit_reason"), // student | timeout | teacher_force
    consentAt: timestamp("consent_at", { withTimezone: true }),
    consentVersion: text("consent_version"),
    layout: jsonb("layout").$type<Layout>().notNull(),
    score: numeric("score", { precision: 6, scale: 2 }),
    maxScore: numeric("max_score", { precision: 6, scale: 2 }),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    fullyGraded: boolean("fully_graded").notNull().default(false),
    violationSummary: jsonb("violation_summary")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    lastState: jsonb("last_state"),
    reviewOutcome: text("review_outcome").notNull().default("unreviewed"),
    reviewNote: text("review_note"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (t) => [
    unique("unique_exam_student_attempt").on(
      t.examId,
      t.studentId,
      t.attemptNo
    ),
    index("idx_sessions_exam").on(t.examId),
  ]
);

// 11. Student Answers table
export const studentAnswers = pgTable(
  "student_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => examSessions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    answerText: text("answer_text"),
    clientTs: bigint("client_ts", { mode: "number" }).notNull().default(0),
    isCorrect: boolean("is_correct"),
    pointsAwarded: numeric("points_awarded", { precision: 5, scale: 2 }),
    manualGrade: boolean("manual_grade").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("unique_session_question").on(t.sessionId, t.questionId)]
);

// 12. Classes & Class Members
export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: text("teacher_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  section: varchar("section", { length: 50 }),
  subject: varchar("subject", { length: 100 }),
  academicYear: varchar("academic_year", { length: 30 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const classMembers = pgTable(
  "class_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("unique_class_student").on(t.classId, t.studentId)]
);

export const examClasses = pgTable(
  "exam_classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
  },
  (t) => [unique("unique_exam_class").on(t.examId, t.classId)]
);

// 13. Exam Edit Audit Log
export const examEditLog = pgTable("exam_edit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  action: varchar("action", { length: 50 }).notNull(), // 'draft_save' | 'published_edit' | 'settings_update'
  changesSummary: text("changes_summary"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type ImportUsage = typeof importUsage.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type QuestionBankItem = typeof questionBank.$inferSelect;
export type NewQuestionBankItem = typeof questionBank.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type ExamSession = typeof examSessions.$inferSelect;
export type NewExamSession = typeof examSessions.$inferInsert;
export type StudentAnswer = typeof studentAnswers.$inferSelect;
export type NewStudentAnswer = typeof studentAnswers.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
export type ClassMember = typeof classMembers.$inferSelect;
export type NewClassMember = typeof classMembers.$inferInsert;
export type ExamClass = typeof examClasses.$inferSelect;
export type NewExamClass = typeof examClasses.$inferInsert;
export type ExamEditLog = typeof examEditLog.$inferSelect;
export type NewExamEditLog = typeof examEditLog.$inferInsert;
