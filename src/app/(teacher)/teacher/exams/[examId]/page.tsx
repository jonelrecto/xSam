import React from "react";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { questions, examSessions } from "@/lib/db/schema";
import { getOwnedExam } from "@/lib/exams";
import { getExamResults } from "@/app/actions/grading";
import { getExamAnalytics } from "@/lib/exam/analytics";
import { getCategoriesAction } from "@/app/actions/exam";
import {
  getExamAssignedClasses,
  getTeacherClasses,
} from "@/app/actions/classes";
import { canEditExam, computeExamDisplayStatus } from "@/lib/exam/lifecycle";
import { ExamDetailsTabs } from "@/components/teacher/ExamDetailsTabs";
import { ExamStatusBadge } from "@/components/teacher/ExamStatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit3, Lock } from "lucide-react";

interface PageProps {
  params: Promise<{
    examId: string;
  }>;
}

export default async function ExamOverviewPage({ params }: PageProps) {
  const { examId } = await params;
  const exam = await getOwnedExam(examId);

  const [qCountRes, sessionCountRes, results, analytics, categories, assignedClasses, allClasses] =
    await Promise.all([
      db
        .select({ total: count() })
        .from(questions)
        .where(eq(questions.examId, examId)),
      db
        .select({ total: count() })
        .from(examSessions)
        .where(eq(examSessions.examId, examId)),
      getExamResults(examId),
      getExamAnalytics(examId),
      getCategoriesAction(),
      getExamAssignedClasses(examId),
      getTeacherClasses(),
    ]);

  const qCount = Number(qCountRes[0]?.total || 0);
  const sessionCount = Number(sessionCountRes[0]?.total || 0);
  const isEditable = canEditExam(exam, sessionCount);
  const isPublished = exam.status === "published";

  const ungradedCount = results.filter((r) => !r.fullyGraded).length;
  const displayStatus = computeExamDisplayStatus({
    status: exam.status,
    scheduledStart: exam.scheduledStart,
    scheduledEnd: exam.scheduledEnd,
    totalSessions: sessionCount,
    submittedSessions: results.length,
    ungradedSessions: ungradedCount,
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/teacher" className="text-muted-foreground hover:text-foreground p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ExamStatusBadge status={displayStatus} />
              {exam.accessCode && (
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/25 px-2 py-0.5 rounded">
                  Code: {exam.accessCode}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {exam.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditable ? (
            <Link href={`/teacher/exams/${exam.id}/questions`}>
              <Button className="font-semibold gap-2">
                <Edit3 className="w-4 h-4" />
                {isPublished ? "Edit Questions (Pre-Start)" : "Open Draft Studio"}
              </Button>
            </Link>
          ) : (
            <Link href={`/teacher/exams/${exam.id}/questions`}>
              <Button variant="outline" className="font-semibold gap-2 border-border text-foreground">
                <Lock className="w-4 h-4 text-amber-500" />
                View Question Paper
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Details and Tabbed Interface */}
      <ExamDetailsTabs
        exam={exam}
        qCount={qCount}
        isEditable={isEditable}
        sessionCount={sessionCount}
        results={results}
        analytics={analytics}
        categories={categories}
        assignedClasses={assignedClasses}
        allClasses={allClasses}
      />
    </div>
  );
}
