import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { studentApi } from "../../lib/api";
import { PreflightForm } from "../../components/student/PreflightForm";
import { Button } from "../../components/ui/button";
import { ArrowLeft } from "lucide-react";

export function PreflightCheckPage() {
  const { examId } = useParams<{ examId: string }>();
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!examId) return;
    studentApi
      .lookupExam({ examId })
      .then((data) => {
        if (data.ok && data.exam) {
          setExam(data.exam);
        } else {
          setError("Exam not found or not available.");
        }
      })
      .catch((err) => setError(err.message || "Failed to load exam."))
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center text-slate-400 animate-pulse text-sm">
        Checking exam parameters & environment...
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <h2 className="text-lg font-bold text-white">Cannot Enter Exam</h2>
        <p className="text-xs text-rose-400">{error || "Exam is unavailable."}</p>
        <Link to="/student">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 animate-fade-in">
      <PreflightForm exam={exam} />
    </div>
  );
}
