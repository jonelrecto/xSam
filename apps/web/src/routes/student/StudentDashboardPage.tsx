import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth-client";
import { studentApi } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { StudentJoinExamForm } from "../../components/student/StudentJoinExamForm";
import { BookOpen, ArrowRight } from "lucide-react";

export function StudentDashboardPage() {
  const { data: session } = useAuth();
  const user = session?.user;
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi
      .getSessionsHistory()
      .then((data) => setRecentSessions(data || []))
      .catch((err) => console.error("Failed to load sessions:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-16">
      {/* Welcome Banner */}
      <div className="p-8 rounded-2xl border border-slate-800 bg-gradient-to-r from-indigo-950/50 via-slate-900/80 to-slate-900/40 relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2">
            <Badge variant="success">Student Terminal</Badge>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Welcome back, {user?.name || "Student"}!
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Ready for your examination? Enter your 6-character access code provided by your instructor to begin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Join Exam Card */}
        <div className="lg:col-span-2">
          <StudentJoinExamForm />
        </div>

        {/* System & Session Status */}
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/80 shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Recent Sessions</CardTitle>
              <CardDescription>Completed or in-progress exams</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500 text-xs animate-pulse">
                  Loading attempts history...
                </div>
              ) : recentSessions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                  <p className="text-xs">No active exam attempts found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSessions.map((s) => {
                    const isInProgress = s.status === "in_progress";
                    const showScore = s.showScoreOnSubmit && s.score !== null;

                    return (
                      <div
                        key={s.id}
                        className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2 transition-all hover:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white line-clamp-1">
                            {s.examTitle}
                          </h4>
                          <Badge
                            variant={isInProgress ? "warning" : "success"}
                            className="text-[10px] uppercase font-mono"
                          >
                            {s.status.replace("_", " ")}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            {new Date(s.startedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {showScore && (
                            <span className="font-bold text-emerald-400">
                              Score: {s.score} / {s.maxScore}
                            </span>
                          )}
                        </div>

                        <div className="pt-1">
                          {isInProgress ? (
                            <Link to={`/student/sessions/${s.id}`}>
                              <Button
                                size="sm"
                                className="w-full h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium"
                              >
                                Resume Exam
                                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                              </Button>
                            </Link>
                          ) : (
                            <Link to={`/student/sessions/${s.id}/done`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-8 text-xs border-slate-700 text-slate-300 hover:text-white"
                              >
                                View Receipt
                                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
