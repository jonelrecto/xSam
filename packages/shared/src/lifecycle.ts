export type ExamDisplayStatus =
  | "draft"
  | "published"
  | "ongoing"
  | "postponed"
  | "for_checking"
  | "completed";

export function computeExamDisplayStatus(
  exam: {
    status: string;
    scheduledStart?: Date | string | null;
    scheduledEnd?: Date | string | null;
    totalSessions?: number;
    submittedSessions?: number;
    ungradedSessions?: number;
  },
  now: Date = new Date()
): ExamDisplayStatus {
  if (exam.status === "draft") {
    return "draft";
  }

  if (exam.status === "postponed") {
    return "postponed";
  }

  if (exam.status === "archived") {
    return "completed";
  }

  const end = exam.scheduledEnd ? new Date(exam.scheduledEnd) : null;
  const start = exam.scheduledStart ? new Date(exam.scheduledStart) : null;

  // 1. If exam has ended (past closing date/time)
  if (end && now > end) {
    // If there are submitted sessions that still need manual grading
    if ((exam.ungradedSessions ?? 0) > 0) {
      return "for_checking";
    }
    return "completed";
  }

  // 2. If scheduled start date is strictly in the future
  if (start && now < start) {
    return "published";
  }

  // 3. Exam is actively running within the window
  return "ongoing";
}

/**
 * Exam Lifecycle Lock Rule Helper
 * Defines whether an exam's questions or core settings can be edited.
 *
 * Rules:
 * 1. Draft exams are always editable.
 * 2. Published exams are editable ONLY IF:
 *    - Zero student sessions exist, AND
 *    - The scheduled start time is null OR strictly in the future.
 * 3. Archived and postponed exams are not editable if sessions exist.
 */
export function canEditExam(
  exam: {
    status: string;
    scheduledStart?: Date | string | null;
  },
  sessionCount: number
): boolean {
  if (exam.status === "draft") {
    return true;
  }

  if (exam.status === "published" || exam.status === "postponed") {
    // If any student has started a session, lock immediately
    if (sessionCount > 0) {
      return false;
    }

    // If scheduled start date has arrived or passed, lock immediately
    if (exam.scheduledStart) {
      const start = new Date(exam.scheduledStart);
      if (start <= new Date()) {
        return false;
      }
    }

    return true;
  }

  return false;
}
