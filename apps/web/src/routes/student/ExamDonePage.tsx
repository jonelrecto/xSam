import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { studentApi } from "../../lib/api";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  CheckCircle2,
  Award,
  ArrowRight,
  ShieldCheck,
  Calendar,
  FileCheck2,
} from "lucide-react";

export function ExamDonePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    studentApi
      .getPaper(sessionId)
      .then((res) => {
        if (res.ok) {
          setSession(res.session);
          setExam(res.exam);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-slate-400 text-xs animate-pulse">
        Generating submission receipt...
      </div>
    );
  }

  const formattedDate = session?.submittedAt
    ? new Date(session.submittedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Recently";

  const showScore = Boolean(exam?.showScoreOnSubmit);
  const scoreNum = session?.score ? parseFloat(session.score) : 0;
  const maxScoreNum = session?.maxScore ? parseFloat(session.maxScore) : 0;
  const percentage =
    maxScoreNum > 0 ? Math.round((scoreNum / maxScoreNum) * 100) : 0;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in max-w-2xl mx-auto">
      <Card className="w-full border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden text-center">
        {/* Top Header Glow */}
        <div className="p-8 bg-gradient-to-b from-indigo-950/60 to-slate-900 border-b border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/40">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <Badge variant="success">Examination Completed</Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {exam?.title || "Examination"}
            </h1>
            <p className="text-xs text-slate-400">
              Session ID: <span className="font-mono text-slate-300">{sessionId}</span>
            </p>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6 text-left">
          {/* Score or Receipt Card */}
          {showScore ? (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-950/80 to-slate-900 border border-indigo-500/30 shadow-lg text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                <Award className="w-3.5 h-3.5 text-indigo-400" />
                Score Summary
              </div>
              <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {scoreNum} <span className="text-xl text-slate-400 font-medium">/ {maxScoreNum}</span>
              </div>
              <p className="text-sm font-semibold text-emerald-400">
                {percentage}% Final Grade
              </p>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Submission Receipt Confirmed
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your examination answers have been securely signed and submitted. Your instructor will release final marks and review feedback once all evaluations are finalized.
              </p>
            </div>
          )}

          {/* Submission Details List */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5" /> Submitted At
              </span>
              <p className="text-slate-200 font-semibold">{formattedDate}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <FileCheck2 className="w-3.5 h-3.5" /> Status
              </span>
              <p className="text-emerald-400 font-semibold capitalize">
                {session?.status ? session.status.replace("_", " ") : "Submitted"}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Link to="/student" className="block">
              <Button
                size="lg"
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-950"
              >
                Return to Student Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
