export type AvailabilityStatus =
  | "open"
  | "not_yet"
  | "ended"
  | "closed"
  | "postponed"
  | "unpublished"
  | "not_found";

export function evaluateAvailability(
  exam: {
    status: string;
    scheduledStart: Date | string | null;
    scheduledEnd: Date | string | null;
  } | null,
  now: Date = new Date()
): AvailabilityStatus {
  if (!exam) return "not_found";

  if (exam.status === "postponed") return "postponed";
  if (exam.status === "archived") return "closed";
  if (exam.status !== "published") return "unpublished";

  if (exam.scheduledStart) {
    const start = new Date(exam.scheduledStart);
    if (now < start) return "not_yet";
  }

  if (exam.scheduledEnd) {
    const end = new Date(exam.scheduledEnd);
    if (now > end) return "ended";
  }

  return "open";
}
