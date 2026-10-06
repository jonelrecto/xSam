import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  Users,
  Clock,
  TrendingUp,
  ShieldAlert,
  Percent,
} from "lucide-react";

interface PostExamDashboardProps {
  data: any;
}

const HISTOGRAM_COLORS = ["#ef4444", "#f97316", "#eab308", "#6366f1", "#10b981"];

export function PostExamDashboard({ data }: PostExamDashboardProps) {
  if (!data) return null;
  const { participation, performance, integrity, actionLists, exam } = data;

  const violationData = Object.entries(integrity?.violationBreakdown || {}).map(([k, v]) => ({
    name: k.replace(/_/g, " "),
    count: Number(v),
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
                {performance?.passRate ?? 0}%
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                ({performance?.passCount ?? 0}/{(performance?.passCount ?? 0) + (performance?.failCount ?? 0)})
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Benchmark: {exam?.passingPercent ?? 60}% passing score
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
                {performance?.averageScore ?? 0}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                / {performance?.maxScore ?? 0}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Median: {performance?.medianScore ?? 0} • High: {performance?.highScore ?? 0}
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
                {participation?.submitted ?? 0}
              </span>
              {participation?.totalEnrolled !== null && participation?.totalEnrolled !== undefined && (
                <span className="text-xs text-muted-foreground font-mono">
                  / {participation.totalEnrolled} Enrolled
                </span>
              )}
            </div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3" />
              {participation?.pendingManualGrading ?? 0} pending manual grading
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
                {integrity?.totalViolations ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">
                in {integrity?.studentsWithViolations ?? 0} students
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
                <BarChart data={performance?.scoreHistogram || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    {(performance?.scoreHistogram || []).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={HISTOGRAM_COLORS[index % HISTOGRAM_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Participation Breakdown / Integrity Summary */}
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
                <span className="font-bold text-foreground font-mono">{participation?.submitted ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">In Progress Sessions:</span>
                <span className="font-bold text-primary font-mono">{participation?.inProgress ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border">
                <span className="text-muted-foreground">Timed Out Submissions:</span>
                <span className="font-bold text-amber-700 dark:text-amber-300 font-mono">{participation?.timedOut ?? 0}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Not Taken (From Roster):</span>
                <span className="font-bold font-mono text-foreground">
                  {participation?.notTaken !== null && participation?.notTaken !== undefined ? participation.notTaken : "N/A (Open Exam)"}
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
                Unchecked Manual Submissions ({actionLists?.pendingGradingStudents?.length || 0})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(!actionLists?.pendingGradingStudents || actionLists.pendingGradingStudents.length === 0) ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                All submitted student answers are fully graded.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-56 overflow-y-auto custom-scrollbar text-xs">
                {actionLists.pendingGradingStudents.map((s: any, idx: number) => (
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
                Enrolled Students Not Taken ({actionLists?.notTakenStudents?.length || 0})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {(!actionLists?.notTakenStudents || actionLists.notTakenStudents.length === 0) ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {participation?.totalEnrolled !== null
                  ? "All enrolled roster students have started or submitted."
                  : "No class assigned to this exam (Open Exam)."}
              </div>
            ) : (
              <div className="divide-y divide-border max-h-56 overflow-y-auto custom-scrollbar text-xs">
                {actionLists.notTakenStudents.map((st: any, idx: number) => (
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
