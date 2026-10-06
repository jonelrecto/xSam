import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { teacherApi } from "../../lib/api";
import { DraftStudio } from "../../components/teacher/DraftStudio";
import { Button } from "../../components/ui/button";
import { ArrowLeft } from "lucide-react";

export function DraftStudioPage() {
  const { examId } = useParams<{ examId: string }>();
  const [data, setData] = useState<{
    exam: any;
    isEditable: boolean;
    sessionCount: number;
    questions: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!examId) return;
    setLoading(true);
    teacherApi
      .getExam(examId)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load exam draft");
      })
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-24 text-center text-muted-foreground animate-pulse text-sm">
        Loading draft questions studio...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <h2 className="text-lg font-bold text-foreground">Error Loading Studio</h2>
        <p className="text-xs text-destructive">{error || "Exam draft not found"}</p>
        <Link to="/teacher">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const initialQuestions = (data.questions || []).map((q: any) => ({
    tempId: q.id,
    id: q.id,
    order: q.orderIndex,
    type: q.type,
    prompt: q.prompt,
    promptJson: q.promptJson,
    options: q.options,
    answers: q.answers || [],
    answerSource: q.answerSource || "provided",
    confirmed: Boolean(q.confirmed),
    points: Number(q.points) || 1,
    warnings: q.warnings || [],
    tags: q.tags || [],
    sourcePage: q.sourcePage,
    categoryId: q.categoryId,
    bankQuestionId: q.bankQuestionId,
    context: q.context,
    contextJson: q.contextJson,
    instructions: q.instructions,
    instructionsJson: q.instructionsJson,
    underlined: q.underlined,
  }));

  return (
    <div className="animate-fade-in">
      <DraftStudio
        exam={data.exam}
        initialQuestions={initialQuestions}
        initialVersion={data.exam.draftVersion || 0}
        isEditable={data.isEditable}
        sessionCount={data.sessionCount}
      />
    </div>
  );
}
