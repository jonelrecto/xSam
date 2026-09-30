import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth-server";
import { getTeacherExams } from "@/app/actions/exam";
import { ExamStatusBadge } from "@/components/teacher/ExamStatusBadge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-2xl border border-slate-800 bg-gradient-to-r from-indigo-950/50 via-slate-900/80 to-slate-900/40 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2">
            <Badge variant="default">Teacher Studio</Badge>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Instructor Console
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Welcome, {user?.name || "Teacher"}. Author exams, manage question drafts, grade student submissions, and monitor test sessions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/teacher/exams/new">
            <Button size="lg" className="font-semibold gap-2 shadow-lg shadow-indigo-500/20">
              <PlusCircle className="w-4 h-4" />
              Create New Exam
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-1">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Draft Exams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-black text-white">{draftExams.length}</span>
            <p className="text-[11px] text-slate-500 mt-1">
              In-progress drafts
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1">
              <Activity className="w-4 h-4" />
            </div>
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Live & Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {ongoingExams.length + publishedExams.length}
              </span>
              <span className="text-xs text-slate-400">
                ({ongoingExams.length} live)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ongoing & published tests
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-1">
              <Clock className="w-4 h-4" />
            </div>
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              For Checking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-black text-purple-400">{forCheckingExams.length}</span>
            <p className="text-[11px] text-slate-500 mt-1">
              Requires manual grading
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-1">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Completed Exams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-black text-teal-400">{completedExams.length}</span>
            <p className="text-[11px] text-slate-500 mt-1">
              Finished & graded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Exam List */}
      <Card className="border-slate-800 bg-slate-900/80 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Examinations</CardTitle>
            <CardDescription>
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
        <CardContent>
          {examList.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
              <p className="text-sm font-semibold text-slate-300">No exams created yet.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Get started by clicking &quot;Create New Exam&quot; to configure time limits, import CSV questions, and generate student access codes.
              </p>
              <div className="pt-2">
                <Link href="/teacher/exams/new">
                  <Button size="sm">Create First Exam</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {examList.map((exam) => (
                <div
                  key={exam.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 px-3 rounded-xl transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-base">
                        {exam.title}
                      </span>
                      <ExamStatusBadge status={exam.displayStatus} />
                      {exam.accessCode && (
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">
                          Code: {exam.accessCode}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>Duration: <strong>{exam.durationMinutes} mins</strong></span>
                      <span>•</span>
                      {exam.scheduledEnd ? (
                        <span>
                          Closes: <strong>{new Date(exam.scheduledEnd).toLocaleString()}</strong>
                        </span>
                      ) : (
                        <span>Created: {new Date(exam.createdAt).toLocaleDateString()}</span>
                      )}
                      {exam.totalSessions > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <Users className="w-3.5 h-3.5 text-indigo-400" />
                            {exam.totalSessions} {exam.totalSessions === 1 ? "student" : "students"}
                          </span>
                        </>
                      )}
                      {exam.ungradedSessions > 0 && (
                        <span className="text-[11px] font-semibold text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded">
                          {exam.ungradedSessions} to grade
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {exam.status === "draft" ? (
                      <Link href={`/teacher/exams/${exam.id}/questions`}>
                        <Button size="sm" className="gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white">
                          <Edit3 className="w-3.5 h-3.5" />
                          Draft Studio
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/teacher/exams/${exam.id}`}>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs border-slate-700 hover:border-indigo-500 text-slate-200 hover:text-white">
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

