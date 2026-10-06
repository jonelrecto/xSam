import { eq, inArray } from "drizzle-orm";
import { db, examSessions, examClasses, classMembers, user as userTable } from "@xsam/db";
import { getOwnedExam } from "../exams";

export interface ExamAnalyticsData {
  exam: {
    id: string;
    title: string;
    passingPercent: number;
    durationMinutes: number;
    status: string;
  };
  participation: {
    totalSessions: number;
    submitted: number;
    inProgress: number;
    timedOut: number;
    pendingManualGrading: number;
    notTaken: number | null;
    totalEnrolled: number | null;
  };
  performance: {
    passCount: number;
    failCount: number;
    passRate: number;
    averageScore: number;
    medianScore: number;
    highScore: number;
    lowScore: number;
    maxScore: number;
    scoreHistogram: Array<{ bin: string; count: number }>;
  };
  integrity: {
    totalViolations: number;
    studentsWithViolations: number;
    violationBreakdown: Record<string, number>;
  };
  actionLists: {
    pendingGradingStudents: Array<{
      sessionId: string;
      studentName: string;
      studentNumber: string | null;
      submittedAt: string | null;
    }>;
    notTakenStudents: Array<{
      studentId: string;
      name: string;
      email: string;
      studentNumber: string | null;
    }>;
  };
}

export async function getExamAnalytics(
  examId: string,
  user: { id: string; role?: string }
): Promise<ExamAnalyticsData | null> {
  const exam = await getOwnedExam(examId, user);
  if (!exam) return null;

  // 1. All sessions for this exam
  const sessions = await db
    .select({
      id: examSessions.id,
      studentId: examSessions.studentId,
      status: examSessions.status,
      submitReason: examSessions.submitReason,
      score: examSessions.score,
      maxScore: examSessions.maxScore,
      fullyGraded: examSessions.fullyGraded,
      violationSummary: examSessions.violationSummary,
      submittedAt: examSessions.submittedAt,
      studentName: userTable.name,
      studentEmail: userTable.email,
      studentNumber: userTable.studentNumber,
    })
    .from(examSessions)
    .innerJoin(userTable, eq(examSessions.studentId, userTable.id))
    .where(eq(examSessions.examId, examId));

  // 2. Class Roster check for "Not Taken"
  const assignedClasses = await db
    .select({ classId: examClasses.classId })
    .from(examClasses)
    .where(eq(examClasses.examId, examId));

  let enrolledStudents: Array<{
    studentId: string;
    name: string;
    email: string;
    studentNumber: string | null;
  }> = [];

  let notTakenCount: number | null = null;
  let notTakenStudents: typeof enrolledStudents = [];

  if (assignedClasses.length > 0) {
    const classIds = assignedClasses.map((c) => c.classId);
    const members = await db
      .select({
        studentId: userTable.id,
        name: userTable.name,
        email: userTable.email,
        studentNumber: userTable.studentNumber,
      })
      .from(classMembers)
      .innerJoin(userTable, eq(classMembers.studentId, userTable.id))
      .where(inArray(classMembers.classId, classIds));

    const memberMap = new Map<string, (typeof members)[0]>();
    members.forEach((m) => memberMap.set(m.studentId, m));
    enrolledStudents = Array.from(memberMap.values());

    const studentIdsWithSession = new Set(sessions.map((s) => s.studentId));
    notTakenStudents = enrolledStudents.filter(
      (m) => !studentIdsWithSession.has(m.studentId)
    );
    notTakenCount = notTakenStudents.length;
  }

  // 3. Participation Metrics
  let submitted = 0;
  let inProgress = 0;
  let timedOut = 0;
  let pendingManualGrading = 0;
  const pendingGradingList: any[] = [];

  for (const s of sessions) {
    if (s.status === "submitted") {
      submitted++;
      if (s.submitReason === "timeout") {
        timedOut++;
      }
      if (!s.fullyGraded) {
        pendingManualGrading++;
        pendingGradingList.push({
          sessionId: s.id,
          studentName: s.studentName,
          studentNumber: s.studentNumber,
          submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
        });
      }
    } else {
      inProgress++;
    }
  }

  // 4. Performance Metrics
  const scores: number[] = [];
  let maxScoreVal = 0;
  let passCount = 0;
  let failCount = 0;

  const histogramBins = [
    { bin: "0-19%", min: 0, max: 19.99, count: 0 },
    { bin: "20-39%", min: 20, max: 39.99, count: 0 },
    { bin: "40-59%", min: 40, max: 59.99, count: 0 },
    { bin: "60-79%", min: 60, max: 79.99, count: 0 },
    { bin: "80-100%", min: 80, max: 100, count: 0 },
  ];

  for (const s of sessions) {
    if (s.score !== null && s.maxScore !== null) {
      const score = Number(s.score);
      const max = Number(s.maxScore);
      scores.push(score);
      if (max > maxScoreVal) maxScoreVal = max;

      const pct = max > 0 ? (score / max) * 100 : 0;
      if (pct >= (exam.passingPercent || 60)) {
        passCount++;
      } else {
        failCount++;
      }

      for (const b of histogramBins) {
        if (pct >= b.min && pct <= b.max) {
          b.count++;
          break;
        }
      }
    }
  }

  scores.sort((a, b) => a - b);
  const totalGraded = scores.length;
  const averageScore =
    totalGraded > 0
      ? Number((scores.reduce((a, b) => a + b, 0) / totalGraded).toFixed(2))
      : 0;

  const medianScore =
    totalGraded > 0
      ? totalGraded % 2 === 0
        ? Number(((scores[totalGraded / 2 - 1] + scores[totalGraded / 2]) / 2).toFixed(2))
        : scores[Math.floor(totalGraded / 2)]
      : 0;

  const highScore = totalGraded > 0 ? scores[totalGraded - 1] : 0;
  const lowScore = totalGraded > 0 ? scores[0] : 0;
  const passRate =
    totalGraded > 0 ? Math.round((passCount / totalGraded) * 100) : 0;

  // 5. Integrity Metrics
  let totalViolations = 0;
  let studentsWithViolations = 0;
  const violationBreakdown: Record<string, number> = {};

  for (const s of sessions) {
    const summary = (s.violationSummary || {}) as Record<string, number>;
    const studentEvents = Object.values(summary).reduce((a, b) => a + Number(b), 0);
    if (studentEvents > 0) {
      studentsWithViolations++;
      totalViolations += studentEvents;
    }
    for (const [k, v] of Object.entries(summary)) {
      violationBreakdown[k] = (violationBreakdown[k] || 0) + Number(v);
    }
  }

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      passingPercent: exam.passingPercent || 60,
      durationMinutes: exam.durationMinutes,
      status: exam.status,
    },
    participation: {
      totalSessions: sessions.length,
      submitted,
      inProgress,
      timedOut,
      pendingManualGrading,
      notTaken: notTakenCount,
      totalEnrolled: assignedClasses.length > 0 ? enrolledStudents.length : null,
    },
    performance: {
      passCount,
      failCount,
      passRate,
      averageScore,
      medianScore,
      highScore,
      lowScore,
      maxScore: maxScoreVal,
      scoreHistogram: histogramBins.map((b) => ({ bin: b.bin, count: b.count })),
    },
    integrity: {
      totalViolations,
      studentsWithViolations,
      violationBreakdown,
    },
    actionLists: {
      pendingGradingStudents: pendingGradingList,
      notTakenStudents,
    },
  };
}
