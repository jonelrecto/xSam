import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth-server";
import { getTeacherExams } from "@/app/actions/exam";
import { ExamStatusBadge } from "@/components/teacher/ExamStatusBadge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardStat } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  FileSpreadsheet,
  BookOpen,
  Clock,
  Activity,
  Edit3,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Sparkles,
} from "lucide-react";

export default async function TeacherDashboard() {
  const session = await getSession();
  const user = session?.user;
  const examList = await getTeacherExams();

  const draftExams = examList.filter((e) => e.displayStatus === "draft");
  const ongoingExams = examList.filter((e) => e.displayStatus === "ongoing");
  const publishedExams = examList.filter((e) => e.displayStatus === "published");
  const forCheckingExams = examList.filter((e) => e.displayStatus === "for_checking");
  const completedExams = examList.filter((e) => e.displayStatus === "completed");
  const postponedExams = examList.filter((e) => e.displayStatus === "postponed");

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-card to-card shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Teacher Studio
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Instructor Console
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Welcome, <strong className="text-foreground">{user?.name || "Teacher"}</strong>. Author exams, manage question drafts, grade student submissions, and monitor test sessions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/teacher/exams/new">
            <Button size="lg" className="font-semibold gap-2 shadow-md shadow-primary/20">
              <PlusCircle className="w-4 h-4" />
              Create New Exam
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CardStat
          title="Draft Exams"
          value={draftExams.length}
          caption="In-progress drafts"
          icon={FileSpreadsheet}
        />
        <CardStat
          title="Live & Scheduled"
          value={ongoingExams.length + publishedExams.length}
          change={ongoingExams.length > 0 ? `${ongoingExams.length} live` : undefined}
          trend={ongoingExams.length > 0 ? "up" : "neutral"}
          caption="Ongoing & published tests"
          icon={Activity}
        />
        <CardStat
          title="For Checking"
          value={forCheckingExams.length}
          caption="Pending manual grading"
          icon={Clock}
        />
        <CardStat
          title="Completed"
          value={completedExams.length}
          caption="Archived & finalized"
          icon={Users}
        />
      </div>

      {/* Exam List */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-card-foreground">Your Examinations</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Author drafts, monitor ongoing sessions, and review completed exams
            </CardDescription>
          </div>
          <Link href="/teacher/exams/new">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <PlusCircle className="w-3.5 h-3.5" />
              New Exam
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="pt-4">
          {examList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">No exams created yet.</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Get started by clicking &quot;Create New Exam&quot; to configure time limits, import CSV questions, and generate student access codes.
              </p>
              <div className="pt-2">
                <Link href="/teacher/exams/new">
                  <Button size="sm">Create First Exam</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {examList.map((exam) => (
                <div
                  key={exam.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/40 px-3 rounded-xl transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground text-base">
                        {exam.title}
                      </span>
                      <ExamStatusBadge status={exam.displayStatus} />
                      {exam.accessCode && (
                        <span className="text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                          Code: {exam.accessCode}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Duration: <strong className="text-foreground">{exam.durationMinutes} mins</strong></span>
                      <span>•</span>
                      {exam.scheduledEnd ? (
                        <span>
                          Closes: <strong className="text-foreground">{new Date(exam.scheduledEnd).toLocaleString()}</strong>
                        </span>
                      ) : (
                        <span>Created: {new Date(exam.createdAt).toLocaleDateString()}</span>
                      )}
                      {exam.totalSessions > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-foreground font-medium">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            {exam.totalSessions} {exam.totalSessions === 1 ? "student" : "students"}
                          </span>
                        </>
                      )}
                      {exam.ungradedSessions > 0 && (
                        <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded">
                          {exam.ungradedSessions} to grade
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {exam.status === "draft" ? (
                      <Link href={`/teacher/exams/${exam.id}/questions`}>
                        <Button size="sm" className="gap-1.5 text-xs font-semibold">
                          <Edit3 className="w-3.5 h-3.5" />
                          Draft Studio
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/teacher/exams/${exam.id}`}>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                          <ExternalLink className="w-3.5 h-3.5" />
                          {exam.displayStatus === "for_checking" ? "Grade & View Details" : "View Details"}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

