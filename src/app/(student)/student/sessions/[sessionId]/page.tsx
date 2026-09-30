import React from "react";
import { notFound, redirect } from "next/navigation";
import { getPaper } from "@/app/actions/session";
import { ExamPaperRunner } from "@/components/student/ExamPaperRunner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function ExamRunnerPage({ params }: Props) {
  const { sessionId } = await params;

  const result = await getPaper(sessionId);

  if (!result.ok) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-slate-800 bg-slate-900/90 text-center p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-bold text-white">Access Denied</CardTitle>
          <p className="text-xs text-slate-400 leading-relaxed">
            {result.error || "Unable to load examination paper."}
          </p>
          <div className="pt-2">
            <Link href="/student">
              <Button variant="outline" className="border-slate-700 text-slate-300">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // If already submitted or timed out, redirect to completion page
  if (result.session.status !== "in_progress") {
    redirect(`/student/sessions/${sessionId}/done`);
  }

  return (
    <ExamPaperRunner
      sessionId={result.session.id}
      exam={result.exam}
      paper={result.paper}
      savedAnswers={result.savedAnswers}
      deadlineAt={result.session.deadlineAt}
    />
  );
}
