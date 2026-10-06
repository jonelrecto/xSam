"use client";

import React from "react";
import { type ExamAnalyticsData } from "@/lib/exam/analytics";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Percent,
  Award,
  BookOpen,
} from "lucide-react";

interface PostExamDashboardProps {
  data: ExamAnalyticsData;
}

const HISTOGRAM_COLORS = ["#ef4444", "#f97316", "#eab308", "#6366f1", "#10b981"];

export function PostExamDashboard({ data }: PostExamDashboardProps) {
  const { participation, performance, integrity, actionLists, exam } = data;

  const passFailData = [
    { name: "Passed", value: performance.passCount, color: "#10b981" },
    { name: "Failed", value: performance.failCount, color: "#f43f5e" },
  ];

  const violationData = Object.entries(integrity.violationBreakdown).map(([k, v]) => ({
    name: k.replace(/_/g, " "),
    count: v,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pass Rate */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Pass Rate</span>
              <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground font-mono">
                {performance.passRate}%
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                ({performance.passCount}/{performance.passCount + performance.failCount})
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Benchmark: {exam.passingPercent}% passing score
            </p>
          </CardContent>
        </Card>

        {/* Average & Median Score */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Average Score</span>
              <TrendingUp className="w-4 h-4 text-primary" />
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground font-mono">
                {performance.averageScore}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                / {performance.maxScore}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Median: {performance.medianScore} • High: {performance.highScore}
            </p>
          </CardContent>
        </Card>

        {/* Submissions & Pending */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Submissions</span>
              <Users className="w-4 h-4 text-primary" />
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground font-mono">
                {participation.submitted}
              </span>
              {participation.totalEnrolled !== null && (
                <span className="text-xs text-muted-foreground font-mono">
                  / {participation.totalEnrolled} Enrolled
                </span>
              )}
            </div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3" />
              {participation.pendingManualGrading} pending manual grading
            </p>
          </CardContent>
        </Card>

        {/* Integrity Flags */}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Integrity Flags</span>
              <ShieldAlert className="w-4 h-4 text-destructive" />
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground font-mono">
                {integrity.totalViolations}
              </span>
              <span className="text-xs text-muted-foreground">
                in {integrity.studentsWithViolations} students
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Automated tab switch, fullscreen & focus events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Score Distribution Histogram */}
        <Card className="border-border bg-card shadow-sm lg:col-span-8">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-base text-card-foreground">Score Distribution Histogram</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Student performance clustered across percentage brackets
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance.scoreHistogram} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="bin"
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      color: "hsl(var(--card-foreground))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    cursor={{ fill: "hsl(var(--primary) / 0.1)" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {performance.scoreHistogram.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={HISTOGRAM_COLORS[index % HISTOGRAM_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Participation Breakdown Donut / Integrity Summary */}
        <Card className="border-border bg-card shadow-sm lg:col-span-4 flex flex-col justify-between">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="text-base text-card-foreground">Participation Summary</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Roster and attempt metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Submitted Sessions:</span>
                <span className="font-bold text-foreground font-mono">{participation.submitted}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">In Progress Sessions:</span>
                <span className="font-bold text-primary font-mono">{participation.inProgress}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Timed Out Submissions:</span>
                <span className="font-bold text-amber-700 dark:text-amber-300 font-mono">{participation.timedOut}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Not Taken (From Roster):</span>
                <span className="font-bold font-mono text-foreground">
                  {participation.notTaken !== null ? participation.notTaken : "N/A (Open Exam)"}
                </span>
              </div>
            </div>

            {violationData.length > 0 && (
              <div className="pt-3 border-t border-border">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Proctoring Event Breakdown:
                </span>
                <div className="space-y-1.5">
                  {violationData.map((v, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-foreground">{v.name}:</span>
                      <Badge variant="destructive" className="font-mono text-[10px]">
                        {v.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Lists: Unchecked Items & Not Taken Students */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Manual Grading Action List */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm text-card-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Unchecked Manual Submissions ({actionLists.pendingGradingStudents.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {actionLists.pendingGradingStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                All submitted student answers are fully graded.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-56 overflow-y-auto custom-scrollbar text-xs">
                {actionLists.pendingGradingStudents.map((s, idx) => (
                  <div key={idx} className="p-3 px-4 flex items-center justify-between hover:bg-muted/40">
                    <div>
                      <span className="font-bold text-foreground block">{s.studentName}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {s.studentNumber || "No ID"}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-semibold">
                      Needs review
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Not Taken Roster Action List */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm text-card-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Enrolled Students Not Taken ({actionLists.notTakenStudents.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {actionLists.notTakenStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {participation.totalEnrolled !== null
                  ? "All enrolled roster students have started or submitted."
                  : "No class assigned to this exam (Open Exam)."}
              </div>
            ) : (
              <div className="divide-y divide-border max-h-56 overflow-y-auto custom-scrollbar text-xs">
                {actionLists.notTakenStudents.map((st, idx) => (
                  <div key={idx} className="p-3 px-4 flex items-center justify-between hover:bg-muted/40">
                    <div>
                      <span className="font-bold text-foreground block">{st.name}</span>
                      <span className="text-[10px] text-muted-foreground">{st.email}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {st.studentNumber || "Not taken"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
