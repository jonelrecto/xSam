import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { teacherApi } from "../../lib/api";
import { computeExamDisplayStatus } from "@xsam/shared";
import { ExamDetailsTabs } from "../../components/teacher/ExamDetailsTabs";
import { ExamStatusBadge } from "../../components/teacher/ExamStatusBadge";
import { Button } from "../../components/ui/button";
import { ArrowLeft, Edit3, Lock } from "lucide-react";

export function ExamDetailPage() {
  const { examId } = useParams<{ examId: string }>();
  const [examData, setExamData] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!examId) return;
    try {
      const [exRes, resRes, analRes, catsRes, asClsRes, allClsRes] = await Promise.all([
        teacherApi.getExam(examId),
        teacherApi.getResults(examId).catch(() => []),
        teacherApi.getAnalytics(examId).catch(() => null),
        teacherApi.getCategories().catch(() => []),
        teacherApi.getAssignedClasses(examId).catch(() => []),
        teacherApi.getClasses().catch(() => []),
      ]);

      setExamData(exRes);
      setResults(resRes || []);
      setAnalytics(analRes);
      setCategories(catsRes || []);
      setAssignedClasses(asClsRes || []);
      setAllClasses(allClsRes || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load exam details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [examId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-24 text-center text-muted-foreground animate-pulse text-sm">
        Loading exam details & metrics...
      </div>
    );
  }

  if (error || !examData) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <h2 className="text-lg font-bold text-foreground">Error Loading Exam</h2>
        <p className="text-xs text-destructive">{error || "Exam not found"}</p>
        <Link to="/teacher">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const { exam, isEditable, sessionCount, questions } = examData;
  const qCount = questions ? questions.length : 0;
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
          <Link to="/teacher" className="text-muted-foreground hover:text-foreground p-1 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ExamStatusBadge status={displayStatus} />
              {exam.accessCode && (
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
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
            <Link to={`/teacher/exams/${exam.id}/studio`}>
              <Button className="font-semibold gap-2">
                <Edit3 className="w-4 h-4" />
                {isPublished ? "Edit Questions (Pre-Start)" : "Open Draft Studio"}
              </Button>
            </Link>
          ) : (
            <Link to={`/teacher/exams/${exam.id}/studio`}>
              <Button variant="outline" className="font-semibold gap-2">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
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
        onRefresh={loadData}
      />
    </div>
  );
}
