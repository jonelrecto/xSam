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
        <Card className="border-slate-800 bg-slate-900/80 shadow-lg">
          <CardContent className="p-5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Pass Rate</span>
              <Percent className="w-4 h-4 text-emerald-400" />
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">
                {performance.passRate}%
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ({performance.passCount}/{performance.passCount + performance.failCount})
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Benchmark: {exam.passingPercent}% passing score
            </p>
          </CardContent>
        </Card>

        {/* Average & Median Score */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-lg">
          <CardContent className="p-5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Average Score</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">
                {performance.averageScore}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                / {performance.maxScore}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Median: {performance.medianScore} • High: {performance.highScore}
            </p>
          </CardContent>
        </Card>

        {/* Submissions & Pending */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-lg">
          <CardContent className="p-5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Submissions</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">
                {participation.submitted}
              </span>
              {participation.totalEnrolled !== null && (
                <span className="text-xs text-slate-400 font-mono">
                  / {participation.totalEnrolled} Enrolled
                </span>
              )}
            </div>
            <p className="text-[10px] text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {participation.pendingManualGrading} pending manual grading
            </p>
          </CardContent>
        </Card>

        {/* Integrity Flags */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-lg">
          <CardContent className="p-5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Integrity Flags</span>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">
                {integrity.totalViolations}
              </span>
              <span className="text-xs text-slate-400">
                in {integrity.studentsWithViolations} students
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              Automated tab switch, fullscreen & focus events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Score Distribution Histogram */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-lg lg:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white">Score Distribution Histogram</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Student performance clustered across percentage brackets
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance.scoreHistogram} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="bin"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    cursor={{ fill: "rgba(99, 102, 241, 0.1)" }}
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
        <Card className="border-slate-800 bg-slate-900/80 shadow-lg lg:col-span-4 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white">Participation Summary</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Roster and attempt metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Submitted Sessions:</span>
                <span className="font-bold text-white font-mono">{participation.submitted}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">In Progress Sessions:</span>
                <span className="font-bold text-indigo-300 font-mono">{participation.inProgress}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Timed Out Submissions:</span>
                <span className="font-bold text-amber-300 font-mono">{participation.timedOut}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Not Taken (From Roster):</span>
                <span className="font-bold font-mono text-white">
                  {participation.notTaken !== null ? participation.notTaken : "N/A (Open Exam)"}
                </span>
              </div>
            </div>

            {violationData.length > 0 && (
              <div className="pt-3 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Proctoring Event Breakdown:
                </span>
                <div className="space-y-1.5">
                  {violationData.map((v, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-slate-300">{v.name}:</span>
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
        <Card className="border-slate-800 bg-slate-900/80 shadow-lg">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Unchecked Manual Submissions ({actionLists.pendingGradingStudents.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {actionLists.pendingGradingStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                All submitted student answers are fully graded.
              </div>
            ) : (
              <div className="divide-y divide-slate-800 max-h-56 overflow-y-auto custom-scrollbar text-xs">
                {actionLists.pendingGradingStudents.map((s, idx) => (
                  <div key={idx} className="p-3 px-4 flex items-center justify-between hover:bg-slate-800/40">
                    <div>
                      <span className="font-bold text-white block">{s.studentName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {s.studentNumber || "No ID"}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">
                      Needs review
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Not Taken Roster Action List */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-lg">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                Enrolled Students Not Taken ({actionLists.notTakenStudents.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {actionLists.notTakenStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {participation.totalEnrolled !== null
                  ? "All enrolled roster students have started or submitted."
                  : "No class assigned to this exam (Open Exam)."}
              </div>
            ) : (
              <div className="divide-y divide-slate-800 max-h-56 overflow-y-auto custom-scrollbar text-xs">
                {actionLists.notTakenStudents.map((st, idx) => (
                  <div key={idx} className="p-3 px-4 flex items-center justify-between hover:bg-slate-800/40">
                    <div>
                      <span className="font-bold text-white block">{st.name}</span>
                      <span className="text-[10px] text-slate-400">{st.email}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
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
