# XSAM / SEPE: Master System Architecture & Implementation Roadmap

> **System Title:** Secure Exam & Proctoring Environment (SEPE / XSAM)  
> **Document Version:** 1.0.0 (Initial Architecture Specification)  
> **Target Framework:** Next.js (App Router / React 19 / TypeScript), PostgreSQL (via Drizzle ORM), Better Auth, Dexie.js, Shadcn/UI, Tailwind/Vanilla CSS  
> **Source Reference:** `implementation_planv1.txt`

---

## 1. System Overview & Core Architectural Principles

XSAM (Secure Exam & Proctoring Environment) is an end-to-end examination platform designed for strict academic integrity, resilient offline-first student test execution, flexible exam creation (manual, CSV, and AI document parsing), automated and manual hybrid grading, and privacy-conscious non-punitive proctoring.

```
                  ┌───────────────────────────────────────────────────────────┐
                  │                      USER PLATFORMS                       │
                  └───────┬───────────────────────────┬───────────────────┬───┘
                          │                           │                   │
                  ┌───────▼─────────┐         ┌───────▼─────────┐ ┌───────▼─────────┐
                  │ Student Runner  │         │ Teacher Studio  │ │ Admin Console   │
                  │ (Offline-First) │         │ (Author & Review│ │ (System & Seed) │
                  └───────┬─────────┘         └───────┬─────────┘ └───────┬─────────┘
                          │                           │                   │
  ════════════════════════╪═══════════════════════════╪═══════════════════╪═════════════════════════
  CLIENT STORAGE          │ (Dexie.js / IndexedDB)    │ (Zustand Store)   │
  ════════════════════════╪═══════════════════════════╪═══════════════════╪═════════════════════════
                          │                           │                   │
                  ┌───────▼───────────────────────────▼───────────────────▼───┐
                  │                   NEXT.JS APP ROUTER                      │
                  │   Route Handlers, Server Actions, Layout Guards, Cron     │
                  └───────┬───────────────────────────┬───────────────────┬───┘
                          │                           │                   │
                  ┌───────▼─────────┐         ┌───────▼─────────┐ ┌───────▼─────────┐
                  │   Better Auth   │         │ Security & Role │ │ Grading Engine  │
                  │ (Drizzle Adapt) │         │ Server Guards   │ │ & Normalizer    │
                  └───────┬─────────┘         └───────┬─────────┘ └───────┬─────────┘
                          │                           │                   │
  ════════════════════════╪═══════════════════════════╪═══════════════════╪═════════════════════════
  PERSISTENCE             │ (PostgreSQL / Neon via Drizzle ORM)           │
  ════════════════════════╪═══════════════════════════╪═══════════════════╪═════════════════════════
                          │                           │                   │
                  ┌───────▼───────────────────────────▼───────────────────▼───┐
                  │ PostgreSQL Schema: Auth, Exams, Questions, Sessions,     │
                  │ Student Answers, Audit Logs, Usage Quotas                 │
                  └───────────────────────────────────────────────────────────┘
```

### Core Architectural Principles
1. **Server Owns Truth & Time:** Deadlines, active availability windows, question randomization, answer scoring, and security event classification are strictly computed on the server. The client clock is never trusted.
2. **Zero-Leak Paper Delivery:** Student client endpoints (`getPaper`) never receive answer keys, AI notes, confidence metrics, or internal validation flags.
3. **Offline-Safe Local-First Execution:** Student answers are immediately written to browser IndexedDB before attempting network sync, ensuring zero data loss during network blips or disconnections.
4. **Non-Punitive Evidence Collection:** Integrity events (tab switches, fullscreen exits, connection drops) are logged as neutral observational data. The platform provides transparent review metrics to educators rather than making opaque algorithmic disqualifications.
5. **Strict Role Escalation Prevention:** Database hooks explicitly strip role manipulation attempts from user-facing auth APIs; administrative privileges are provisioned solely through secure direct database channels or seed tasks.

---

## 2. Phase-by-Phase Architecture Matrix

---

### Phase 1: Foundation, Authentication & Role-Based Access Control

#### 1. Database Architecture
- **Schema Management:** Drizzle ORM with PostgreSQL (`drizzle-kit`).
- **Core Entities:**
  - `user`: Managed via Better Auth with an additional `role` text column (default `'student'`). ID is `TEXT`.
  - `session`, `account`, `verification`: Standard Better Auth tables.
  - `import_usage`: Per-teacher rate limiting and quota tracking.
    ```sql
    CREATE TABLE import_usage (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      day DATE NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT unique_user_day UNIQUE (user_id, day)
    );
    ```

#### 2. Back-End & Auth Engine
- **Auth Engine:** `betterAuth` configured with `drizzleAdapter` and `nextCookies()` plugin.
- **Security Hooks:**
  - `user.create.before`: Restricts self-signup roles to `['student', 'teacher']`. Any other payload defaults safely to `'student'`.
  - `user.update.before`: Strips `role` from update inputs to prevent client-side privilege escalation.
- **Role Guards (`src/lib/auth-server.ts`):**
  - `getSession()`: Extracts session securely using `next/headers`.
  - `requireRole(allowed: Role[])`: Validates caller permissions, redirecting unauthorized users to their designated role home (`/student`, `/teacher`, `/admin`).
  - Guards are implemented across three tiers:
    1. Route group layouts (`src/app/(teacher)/teacher/layout.tsx`, `src/app/(student)/student/layout.tsx`).
    2. Route handlers (`/api/...`).
    3. Server actions (`"use server"`).
- **Email Delivery:** Resend integration (`src/lib/email.ts`) with development console-fallback logging when `RESEND_API_KEY` is absent. `REQUIRE_EMAIL_VERIFICATION` flag allows toggleable email gates.

#### 3. Front-End & UI
- **Components:** Shadcn/UI Form, Card, Input, RadioGroup, DropdownMenu, Avatar.
- **Validation:** Zod schemas (`signupSchema`) paired with `react-hook-form`.
- **Client Auth:** Better Auth React Client (`createAuthClient()`).
- **Pages:**
  - `/signup`: Role selector (Student / Teacher), email, password confirmation.
  - `/login`: Email & password with rate limiting.
  - `/forgot-password` & `/reset-password`: Token-based recovery.
  - `/verify-email`: Status screen when verification gate is enabled.
  - `/student`, `/teacher`, `/admin`: Role landing dashboards.

---

### Phase 2: Exam Authoring, CSV Validation & Draft Studio

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXAM CREATION WIZARD                             │
├──────────────────────────┬─────────────────────────────────┬────────────────┤
│ Step 1: Details Form     │ Step 2: Questions Draft Studio  │ Step 3: Publish│
│ Title, Duration, Window, │ CSV Import / Manual Entry / DnD │ Server Gate &  │
│ Shuffling, Integrity Sw  │ Optimistic Locking & Autosave   │ 6-Char Code Gen│
└──────────────────────────┴─────────────────────────────────┴────────────────┘
```

#### 1. Database Architecture
- **`exams` Table:**
  ```sql
  CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    status exam_status NOT NULL DEFAULT 'draft',
    draft_version INTEGER NOT NULL DEFAULT 0,
    access_code VARCHAR(8) UNIQUE,
    shuffle_questions BOOLEAN NOT NULL DEFAULT TRUE,
    shuffle_options BOOLEAN NOT NULL DEFAULT TRUE,
    require_camera BOOLEAN NOT NULL DEFAULT FALSE,
    show_score_on_submit BOOLEAN NOT NULL DEFAULT FALSE,
    enforce_fullscreen BOOLEAN NOT NULL DEFAULT TRUE,
    restrict_input BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- **`questions` Table:**
  ```sql
  CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    type question_type NOT NULL, -- multiple_choice, true_false, identification, essay
    prompt TEXT NOT NULL,
    options JSONB,               -- string[] | null
    answers JSONB NOT NULL DEFAULT '[]', -- string[]
    answer_source TEXT NOT NULL DEFAULT 'provided', -- provided, ai_inferred, missing
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    points NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    source_page INTEGER,
    warnings JSONB NOT NULL DEFAULT '[]',
    context TEXT,                -- shared passage / reading context
    instructions TEXT,           -- section-level instructions
    underlined TEXT,             -- target term to underline in prompt
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX idx_questions_exam ON questions(exam_id, order_index);
  ```

#### 2. Back-End & Authoring Server Actions
- **Ownership Verification (`src/lib/exams.ts`):** `getOwnedExam(examId)` guarantees non-admin teachers cannot view or mutate other teachers' exams.
- **Server Actions (`src/app/actions/exam.ts`):**
  - `createExam(input)`: Validates `examDetailsSchema` (verifies scheduled end > scheduled start and window >= duration), inserts draft exam.
  - `saveDraft(examId, baseVersion, input)`:
    - Verifies exam is in `draft` status (published exams are permanently locked).
    - Optimistic lock: checks `draft_version === baseVersion` and increments `draft_version`. Returns `CONFLICT` if mismatched.
    - Executes atomic delete & re-insert of questions via `db.batch()`.
  - `publishExam(examId)`:
    - Strictly validates all stored DB rows against `publishableQuestionSchema`.
    - Verifies all non-essay questions have answers and are `confirmed`.
    - Validates schedule is not in the past.
    - Generates unique 6-character access code (`[A-Z2-9]` excluding ambiguous characters `0/O/1/I`) with retry on conflict.
    - Transitions status to `published`.

#### 3. Front-End, CSV Engine & Draft Studio
- **CSV Validation Engine (`src/lib/csv/parse-exam-csv.ts`):**
  - Client-side parser with `Papa.parse` (UTF-8 BOM support, max 200 rows, max 1 MB).
  - Pure function `validateRows`: Comprehensive single-pass validation reporting row/column issues without file rejection.
  - Converts multiple-choice answers from letter (A–D) to exact option text (preserves integrity under option shuffling).
  - Pipe-delimited identification answers (`Manila|City of Manila`).
  - Automatic `answerSource: 'missing'` assignment for essays (exempt from answer key requirement).
- **Zustand Draft Store (`src/hooks/use-draft-store.ts`):**
  - Tracks `revision` vs `savedRevision` for precise dirty state calculation.
  - Maintains `DraftQuestion` items with full CRUD, renumbering, duplication, type conversions, and option re-indexing.
  - `confirmAllProvided()`: Bulk confirms CSV/manual answers while strictly preserving review requirements for AI-inferred keys.
- **Autosave Engine (`src/hooks/use-autosave.ts`):**
  - Debounced 1500ms auto-sync with `beforeunload` unsaved change alerts.
  - Conflict resolution dialog offering *Load Latest* vs *Overwrite with Mine*.
- **Draft Studio UI Components:**
  - Sticky header with Save Indicator, Points counter, Bulk Confirm, and Publish Action.
  - Question Card List powered by `@dnd-kit/core` and `@dnd-kit/sortable` (with pointer sensors and accessible Move Up / Move Down controls).
  - Dynamic Question Cards: Auto-growing textareas, reactive option inputs, status badges (*Confirmed*, *Needs confirmation*, *AI-guessed, verify*, *Missing answer*, *Manual grading*).
  - Live pre-publish checklist dialog preventing invalid submissions.

---

### Phase 3: Document Import & AI Extraction Pipeline

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│ Teacher Uploads   │───► │ Server Quota &    │───► │ AI Extraction &   │
│ PDF / Word / DOCX │     │ Rate-Limit Check  │     │ Schema Parsing    │
└───────────────────┘     └───────────────────┘     └─────────┬─────────┘
                                                              │
┌───────────────────┐     ┌───────────────────┐               │
│ Draft Studio      │◄─── │ Side-by-Side      │◄──────────────┘
│ Loaded & Verified │     │ Source Review UI  │
└───────────────────┘     └───────────────────┘
```

#### 1. Database & Quota Architecture
- `import_usage` table stores daily import counts per teacher.
- Daily quota limits enforced before file processing (e.g., 20 imports/day).

#### 2. Back-End Processing
- Multipart upload handler supporting `.pdf`, `.docx`, `.doc`.
- Text extraction pipeline preserving layout cues, shared reading passages, and cloze-test contexts.
- Structured AI extraction prompts returning validated `DraftQuestion[]` with:
  - Extracted prompt, question type, options, inferred answers.
  - `answerSource: "ai_inferred"`, `confirmed: false`.
  - Passage `context` and section `instructions` associations.
  - Confidence scoring and heuristic warning flags.

#### 3. Front-End Split-Screen Studio
- Side-by-side split screen rendering the source document (PDF page view) alongside generated editable question cards.
- Visual badge highlighting AI-inferred answers requiring individual educator confirmation.

---

### Phase 4: Student Exam Runner, Offline-First Sync & Grading Engine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OFFLINE-FIRST SYNC ENGINE                          │
│                                                                             │
│  Student UI Action ──► Dexie.js (IndexedDB) ──► Background Batch Sync       │
│                             │                          │                    │
│                        (Source of                      ▼                    │
│                         Truth in               Next.js Server Action        │
│                         Browser)               (saveAnswers / Heartbeat)    │
│                                                        │                    │
│                                                        ▼                    │
│                                                PostgreSQL Database          │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 1. Database Architecture
- **`exam_sessions` Table:**
  ```sql
  CREATE TYPE session_status AS ENUM ('in_progress', 'submitted');
  CREATE TABLE exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    attempt_no INTEGER NOT NULL DEFAULT 1,
    status session_status NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    submit_reason TEXT, -- student | timeout | teacher_force
    consent_at TIMESTAMPTZ,
    consent_version TEXT,
    layout JSONB NOT NULL, -- { order: string[], options: Record<string, number[]> }
    score NUMERIC(6, 2),
    max_score NUMERIC(6, 2),
    graded_at TIMESTAMPTZ,
    fully_graded BOOLEAN NOT NULL DEFAULT FALSE,
    last_heartbeat_at TIMESTAMPTZ,
    last_state JSONB,
    review_outcome TEXT NOT NULL DEFAULT 'unreviewed',
    review_note TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    CONSTRAINT unique_exam_student_attempt UNIQUE (exam_id, student_id, attempt_no)
  );
  CREATE INDEX idx_sessions_exam ON exam_sessions(exam_id);
  ```
- **`student_answers` Table:**
  ```sql
  CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessionId UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    questionId UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answerText TEXT,
    clientTs BIGINT NOT NULL DEFAULT 0,
    isCorrect BOOLEAN,
    pointsAwarded NUMERIC(5, 2),
    manualGrade BOOLEAN NOT NULL DEFAULT FALSE,
    updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_session_question UNIQUE (sessionId, questionId)
  );
  ```

#### 2. Back-End Session & Grading Engine
- **Access Code & Availability Check (`src/lib/exam/availability.ts`):**
  - Rate-limited code lookup (10 calls/min per user).
  - Status evaluation: `open`, `not_yet`, `ended`, `closed`, `not_found`.
- **Layout & Paper Generation (`src/lib/exam/paper.ts`):**
  - **Deterministic Shuffling:** Randomization generated once at session start and persisted in `session.layout`. Refreshing never alters order.
  - **Context-Aware Grouping:** Questions sharing passages or instructions stay grouped in sequence.
  - **Option Order Protection:** Automatically suppresses option shuffling for position-dependent choices (e.g., *"All of the above"*, *"None of the above"*, *"Wala sa nabanggit"*, *"A at B"*).
  - **Sanitized Paper Payload (`buildPaper`):** Completely omits `answers`, `aiNote`, `confidence`, `warnings`, and `answerSource`.
- **Session Lifecycle Server Actions (`src/app/actions/session.ts`):**
  - `startSession`: Enforces consent, calculates deadline (`LEAST(now + duration, scheduledEnd)`), creates session.
  - `getPaper`: Returns sanitized question set, persisted layout, and latest saved answer state.
  - `saveAnswers`: Validates active status and deadline (10s network grace period), upserts answers with `clientTs > student_answers.client_ts` guard (discards out-of-order writes).
  - `submitSession`: Finalizes session, triggers grading, returns score only if `showScoreOnSubmit` is enabled.
- **Grading Engine (`src/lib/exam/grade.ts`):**
  - **Text Normalizer:** NFKC normalization, diacritic removal, punctuation stripping, case folding, and whitespace collapsing.
  - **Auto-Evaluation:** Exact string matching for multiple choice and true/false; variant array evaluation for identification.
  - **Manual Grade Protection:** `manualGrade: true` rows are permanently preserved during re-grading cycles.
  - **Lazy Finalization:** Expired unsubmitted sessions are automatically finalized and graded when queried.

#### 3. Front-End Runner & Offline Sync Engine
- **IndexedDB Client Storage (`src/lib/exam/local-db.ts`):**
  - Dexie.js database (`sepe-exam`) with tables `answers` and `papers`.
- **Sync Engine Hook (`useAnswerSync`):**
  - Immediate local write to IndexedDB on user interaction.
  - Background batch sync (100 answers) with exponential backoff on failure.
  - Listens to `window.online` and `visibilitychange` to immediately flush pending queues.
- **Monotonic Server-Anchored Timer:**
  - Synchronizes to server timestamp and counts down using `performance.now()`.
  - System clock adjustments do not affect the remaining time.
  - Auto-submits upon deadline expiration.
- **Student Exam Screens:**
  - `/student`: Code entry with clear status messages & recent sessions list.
  - `/student/exams/[examId]/check`: Pre-flight check verifying browser APIs, IndexedDB, fullscreen capability, and camera consent.
  - `/student/sessions/[sessionId]`: Fullscreen test runner, passage split-views, flagged questions navigator, live sync indicator.
  - `/student/sessions/[sessionId]/done`: Submission confirmation and optional score display.

---

### Phase 5: Integrity Monitoring, Tamper Detection & Audit Review

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INTEGRITY MONITORING LAYER                         │
├───────────────────────────────┬─────────────────────────────┬───────────────┤
│ Browser Event Monitor         │ Server Heartbeat Tracker    │ Teacher Audit │
│ • Visibility & Tab Switches   │ • 150s Gap Detection        │ • Priority Lvl│
│ • Blur (>= 1.5s threshold)    │ • Offline Corroboration     │ • Timeline    │
│ • Fullscreen Gate (10s count) │ • 1500 Event Storm Cap      │ • Dismiss/Flag│
│ • Paste Length (No Content!)  │ • Tamper Classification     │ • Outcome Log │
└───────────────────────────────┴─────────────────────────────┴───────────────┘
```

#### 1. Database Architecture
- **`exam_audit_logs` Table:**
  ```sql
  CREATE TYPE violation_kind AS ENUM (
    'TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'PASTE', 'COPY_CUT',
    'CONTEXT_MENU', 'SHORTCUT_ATTEMPT', 'OFFLINE', 'SESSION_RESUMED', 'HEARTBEAT_GAP',
    'NO_FACE_DETECTED', 'MULTIPLE_FACES', 'SIDEWAYS_GAZE'
  );
  CREATE TYPE event_severity AS ENUM ('info', 'warning', 'critical');
  
  CREATE TABLE exam_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    client_event_id UUID NOT NULL,
    kind violation_kind NOT NULL,
    severity event_severity NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    duration_ms INTEGER,
    client_ts BIGINT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evidence_image_url TEXT,
    review_status TEXT NOT NULL DEFAULT 'unreviewed', -- unreviewed | dismissed | confirmed
    review_note TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    CONSTRAINT unique_session_event UNIQUE (session_id, client_event_id)
  );
  CREATE INDEX idx_audit_session_time ON exam_audit_logs(session_id, occurred_at);
  ```

#### 2. Back-End Classification & Audit Logic
- **Server-Side Event Classifier (`src/lib/exam/classify.ts`):**
  - `TAB_SWITCH`: `>= 60s` -> `critical`, `< 60s` -> `warning`.
  - `WINDOW_BLUR`: `>= 10s` -> `warning`, `< 10s` -> `info`.
  - `FULLSCREEN_EXIT`: Countdown expired or `>= 30s` -> `critical`, else `warning`.
  - `PASTE`: Length `>= 30` chars -> `warning`, else `info`.
  - `SHORTCUT_ATTEMPT`: DevTools keys (`F12`, `Ctrl+Shift+I`) -> `warning`.
- **Integrity Server Actions (`src/app/actions/integrity.ts`):**
  - `logEvents`: Ingests event batches (max 50 per batch), capped at 1500 total events per session to prevent DB flooding.
  - `heartbeat`: Updates `last_heartbeat_at` and UI state. Detects gaps `> 150s`. If an `OFFLINE` event exists in the window, marks gap as `info` ("explained by offline"); otherwise logs `warning`/`critical` `HEARTBEAT_GAP`.
- **Transparent Review Priority Algorithm (`src/lib/exam/priority.ts`):**
  - Computes explainable `high`, `medium`, or `low` priority based on active (non-dismissed) events.
  - Generates clear human-readable rationale (e.g., *"3 tab switches"*, *"45s away from exam"*, *"2 large pastes"*).
- **Audit Review Actions:** `reviewEvent` (dismiss/confirm with teacher notes) and `setSessionOutcome` (`cleared`, `concern`, `invalidated`).

#### 3. Front-End Integrity Monitor & Fullscreen Gate
- **Browser Monitor (`src/lib/exam/integrity-monitor.ts`):**
  - Uses `AbortController` for clean lifecycle teardown.
  - Settling delay (2500ms) ignores startup and fullscreen transition noise.
  - Privacy-preserving clipboard tracking: logs pasted string length only, never clipboard content.
  - Shortcut detection for DevTools, PrintScreen, and view-source commands.
- **Fullscreen Gate Hook (`useFullscreenGate`):**
  - Detects fullscreen exits and displays a 10-second countdown overlay.
  - If countdown expires, locks runner into an `inert` state and obscures test content until re-entry.
- **Teacher Review UI:**
  - Overview session table with review priority badges and filter chips.
  - Session Audit Timeline displaying chronological events, duration, severity, and dismiss/confirm controls.
  - 30-day retention notice banner.

---

### Phase 6: Live Proctoring, Real-Time Interventions & Device Locking (M8 Roadmap)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            LIVE PROCTORING GRID                             │
├────────────────────────────────┬────────────────────────────────────────────┤
│ Teacher Live Grid Dashboard    │ Real-Time WebSocket Channel                │
│ • Active student roster & tile │ • Broadcasts heartbeat & state             │
│ • Live heartbeat health beacon │ • Real-time event notifications            │
│ • Warn / Pause / Submit controls│ • Second-device takeover authorization    │
└────────────────────────────────┴────────────────────────────────────────────┘
```

1. **Real-Time Communication:** Fastify / WebSocket or Next.js Realtime gateway distributing real-time student presence and heartbeat metrics to teacher consoles.
2. **Teacher Command Suite:**
   - **Warn:** Displays an instantaneous modal warning on student screens.
   - **Pause:** Temporarily halts student runner interaction without expending time.
   - **Force-Submit:** Terminates active session immediately.
3. **Device Locking & Migration:**
   - Enforces single-device concurrency via session tokens.
   - Secondary device logins prompt a takeover request requiring educator approval.

---

### Phase 7: Computer Vision & Media Lifecycle (M9 Roadmap)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Client-Side Face │───► │ Violation Event  │───► │ Ephemeral S3     │
│ & Gaze Detector  │     │ Triggered        │     │ Snapshot Upload  │
└──────────────────┘     └──────────────────┘     └─────────┬────────┘
                                                            │
┌──────────────────┐     ┌──────────────────┐               │
│ 30-Day Auto Purge│◄─── │ Teacher Review   │◄──────────────┘
│ Cron Execution   │     │ Evidence Modal   │
└──────────────────┘     └──────────────────┘
```

1. **Client-Side Face & Gaze Tracking:** MediaPipe / TensorFlow.js running locally in browser to detect `NO_FACE_DETECTED`, `MULTIPLE_FACES`, and `SIDEWAYS_GAZE`.
2. **Ephemeral Snapshot Ingestion:** High-confidence violations trigger low-resolution webcam snapshots stored securely in S3/Cloud Storage.
3. **Automated Media Purge:** Integrated cron purge job ensuring evidence images and logs are deleted after 30 days.

---

### Phase 8: Deployment, Security Hardening & Operations

#### 1. Infrastructure Architecture
- **Web App:** Vercel / Next.js Serverless runtime.
- **Database:** Neon Serverless PostgreSQL / Supabase PostgreSQL.
- **Storage:** AWS S3 / Cloudflare R2 for ephemeral proctoring media.
- **Cron Jobs:** Vercel Cron calling `/api/cron/purge` daily with `CRON_SECRET` authorization.

#### 2. Automated Retention Purge Endpoint (`src/app/api/cron/purge/route.ts`)
```typescript
import { db } from "@/lib/db";
import { examAuditLogs, examSessions } from "@/lib/db/schema";
import { and, eq, inArray, lt, sql } from "drizzle-orm";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const days = Number(process.env.AUDIT_RETENTION_DAYS ?? 30);
  const oldSessions = db.select({ id: examSessions.id }).from(examSessions).where(
    and(
      eq(examSessions.status, "submitted"),
      lt(examSessions.submittedAt, sql`now() - (${days} * interval '1 day')`)
    )
  );
  const deleted = await db.delete(examAuditLogs)
    .where(inArray(examAuditLogs.sessionId, oldSessions))
    .returning({ id: examAuditLogs.id });

  return Response.json({ deletedCount: deleted.length });
}
```

#### 3. Security Hardening Checklist
- [x] **Privilege Escalation Prevention:** Stripped `role` updates in Better Auth hooks.
- [x] **Zero-Knowledge Paper Delivery:** Stripped answer keys, AI rationales, and validation flags in `getPaper`.
- [x] **Client-Side Data Privacy:** Strict clipboard character length recording without clipboard text payload storage.
- [x] **Rate Limiting:** IP and user-based throttling on auth endpoints, code lookup, and import actions.
- [x] **Audit Append-Only Rules:** Student role restricted from updating or deleting `exam_audit_logs`.
- [x] **Event Storm Protection:** Hard cap of 1500 log entries per exam session.

---

## 3. Directory & File Structure Blueprint

```
/
├── public/
│   └── templates/
│       └── exam-template.csv             # UTF-8 BOM CSV authoring template
├── src/
│   ├── app/
│   │   ├── (admin)/
│   │   │   └── admin/
│   │   │       └── page.tsx              # Admin dashboard
│   │   ├── (student)/
│   │   │   └── student/
│   │   │       ├── layout.tsx            # Student layout guard
│   │   │       ├── page.tsx              # Code entry & recent exams
│   │   │       ├── exams/[examId]/check/page.tsx # Pre-flight readiness check
│   │   │       └── sessions/[sessionId]/
│   │   │           ├── page.tsx          # Main exam runner
│   │   │           └── done/page.tsx     # Submission confirmation
│   │   ├── (teacher)/
│   │   │   └── teacher/
│   │   │       ├── layout.tsx            # Teacher layout guard
│   │   │       ├── page.tsx              # Teacher exam list
│   │   │       └── exams/
│   │   │           ├── new/page.tsx      # Step 1: Exam details wizard
│   │   │           └── [examId]/
│   │   │               ├── questions/page.tsx # Step 2: Draft Studio
│   │   │               ├── page.tsx      # Exam status & student roster
│   │   │               └── sessions/[sessionId]/page.tsx # Review & grading
│   │   ├── actions/
│   │   │   ├── exam.ts                   # createExam, saveDraft, publishExam
│   │   │   ├── integrity.ts              # logEvents, heartbeat
│   │   │   └── session.ts                # lookupExam, startSession, getPaper, submit
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts    # Better Auth route handler
│   │   │   └── cron/purge/route.ts       # 30-day retention purge
│   │   └── layout.tsx
│   ├── hooks/
│   │   ├── use-autosave.ts               # Debounced draft autosave engine
│   │   ├── use-draft-store.ts            # Zustand question draft state
│   │   ├── use-fullscreen-gate.ts        # 10s countdown fullscreen enforcer
│   │   └── use-answer-sync.ts            # Dexie.js offline-first sync hook
│   └── lib/
│       ├── auth.ts                       # Better Auth server configuration
│       ├── auth-client.ts                # Better Auth client export
│       ├── auth-server.ts                # requireRole, getSession helpers
│       ├── email.ts                      # Resend email handler with dev fallback
│       ├── exams.ts                      # getOwnedExam ownership verification
│       ├── csv/
│       │   └── parse-exam-csv.ts         # Papa Parse & pure validation engine
│       ├── db/
│       │   ├── index.ts                  # Drizzle database client instance
│       │   └── schema.ts                 # Full PostgreSQL schema definitions
│       ├── exam/
│       │   ├── availability.ts           # Exam status & schedule evaluator
│       │   ├── classify.ts               # Severity classifier for integrity events
│       │   ├── finalize.ts               # Idempotent session finalizer
│       │   ├── grade.ts                  # NFKC text normalization & auto-grader
│       │   ├── integrity-monitor.ts      # Browser-side event listeners
│       │   ├── local-db.ts               # Dexie.js IndexedDB schema
│       │   ├── paper.ts                  # Layout builder & shuffle logic
│       │   └── priority.ts               # Explainable review priority calculator
│       └── schemas/
│           └── exam.ts                   # Zod draft & publishable schemas
└── vercel.json                           # Cron schedule configuration
```

---

## 4. Verification & Testing Strategy

| Component / Layer | Test Scope & Assertions | Tool |
| :--- | :--- | :--- |
| **Auth & Security** | • Student cannot elevate to teacher/admin via `updateUser`<br>• Manual `role: admin` signup creates `student`<br>• Protected layouts redirect unauthorized roles | Vitest / Integration |
| **CSV Parser** | • Validates all 4 question types<br>• Catches duplicate options, bad keys, missing headers<br>• Normalizes A–D keys to text | Vitest (`parse-exam-csv.test.ts`) |
| **Draft Studio & Autosave** | • Optimistic lock handles concurrent edits<br>• Publish gate rejects unconfirmed non-essays<br>• Reordering updates order indices cleanly | Vitest & Component Tests |
| **Grading Normalizer** | • NFKC diacritic stripping (`T.` -> `t`, `R.A. 9003` -> `ra 9003`)<br>• Case & punctuation insensitivity<br>• Manual teacher grade override preserved | Vitest (`grade.test.ts`) |
| **Offline Sync Engine** | • Local DB stores answers immediately<br>• Stale `clientTs` writes are ignored by server<br>• Submissions with pending sync succeed | Integration / Playwright |
| **Integrity Monitor** | • Hidden tab logs `TAB_SWITCH`<br>• Window blur < 1.5s ignored<br>• Pasting logs length only, no content<br>• 150s gap triggers `HEARTBEAT_GAP` | Playwright / Browser Runner |
