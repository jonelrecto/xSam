import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { studentApi } from "../../lib/api";
import { ExamPaperRunner } from "../../components/student/ExamPaperRunner";
import { Card, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { AlertCircle } from "lucide-react";

export function ExamRunnerPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    studentApi
      .getPaper(sessionId)
      .then((res) => {
        if (!res.ok) {
          setError("Unable to load examination paper.");
        } else if (res.session.status !== "in_progress") {
          navigate(`/student/sessions/${sessionId}/done`, { replace: true });
        } else {
          setData(res);
        }
      })
      .catch((err) => {
        setError(err?.message || "Failed to load examination paper.");
      })
      .finally(() => setLoading(false));
  }, [sessionId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs">Connecting to Secure Monolithic Exam Engine...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-slate-800 bg-slate-900/90 text-center p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold text-white">Access Denied</CardTitle>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || "Unable to load examination paper."}
          </p>
          <div className="pt-2">
            <Link to="/student">
              <Button variant="outline" className="border-slate-700 text-slate-300">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <ExamPaperRunner
      sessionId={data.session.id}
      exam={data.exam}
      paper={data.paper}
      savedAnswers={data.savedAnswers}
      deadlineAt={data.session.deadlineAt}
    />
  );
}
