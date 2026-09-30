"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDraftStore } from "@/hooks/use-draft-store";
import { publishExam } from "@/app/actions/exam";
import { publishableQuestionSchema } from "@/lib/schemas/exam";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Clock,
} from "lucide-react";

interface PublishDialogProps {
  exam: any;
  isOpen: boolean;
  onClose: () => void;
  onFlush: () => Promise<boolean>;
}

export function PublishDialog({
  exam,
  isOpen,
  onClose,
  onFlush,
}: PublishDialogProps) {
  const router = useRouter();
  const questions = useDraftStore((s) => s.questions);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    accessCode?: string;
    issues?: string[];
  } | null>(null);

  // Compute live pre-publish validation checklist
  const checklist = useMemo(() => {
    const issues: { qIndex?: number; message: string }[] = [];

    if (questions.length === 0) {
      issues.push({ message: "Add at least one question to the exam." });
    }

    questions.forEach((q, idx) => {
      const res = publishableQuestionSchema.safeParse(q);
      if (!res.success) {
        issues.push({
          qIndex: idx + 1,
          message: `Question #${idx + 1}: ${res.error.issues[0].message}`,
        });
      }
    });

    if (exam.scheduledEnd && new Date(exam.scheduledEnd) <= new Date()) {
      issues.push({ message: "Scheduled availability end time is in the past." });
    }

    return {
      isValid: issues.length === 0,
      issues,
      totalPoints: questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0),
    };
  }, [questions, exam]);

  if (!isOpen) return null;

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishResult(null);

    try {
      const flushed = await onFlush();
      if (!flushed) {
        setPublishResult({
          success: false,
          issues: ["Unable to auto-save latest edits before publishing. Please try again."],
        });
        setIsPublishing(false);
        return;
      }

      const res = await publishExam(exam.id);
      if (res.ok) {
        setPublishResult({
          success: true,
          accessCode: res.accessCode,
        });
      } else {
        setPublishResult({
          success: false,
          issues: (res.issues as string[]) || ["Failed to publish exam."],
        });
      }
    } catch (err: any) {
      setPublishResult({
        success: false,
        issues: [err?.message || "An unexpected error occurred during publishing."],
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-lg w-full space-y-5 shadow-2xl">
        {publishResult?.success ? (
          /* Success Screen with Access Code */
          <div className="text-center space-y-5 py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Exam Published Successfully!</h3>
              <p className="text-xs text-slate-400 mt-1">
                The answer key is now securely locked. Students can join using the access code below:
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40 text-center space-y-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
                STUDENT ACCESS CODE
              </span>
              <span className="text-3xl font-black font-mono tracking-widest text-indigo-300">
                {publishResult.accessCode}
              </span>
            </div>

            <Button
              className="w-full font-semibold"
              onClick={() => {
                onClose();
                router.push("/teacher");
                router.refresh();
              }}
            >
              Return to Teacher Dashboard
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        ) : (
          /* Pre-Publish Checklist Screen */
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Publish Examination</h3>
              </div>
              <p className="text-xs text-slate-400">
                Review the pre-publish checklist. Publishing locks questions and issues an access code.
              </p>
            </div>

            {/* Summary Strip */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Questions</span>
                <span className="font-bold text-white text-sm">{questions.length}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Total Points</span>
                <span className="font-bold text-white text-sm">{checklist.totalPoints}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Duration</span>
                <span className="font-bold text-white text-sm">{exam.durationMinutes}m</span>
              </div>
            </div>

            {/* Checklist Results */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                System Verification Checklist:
              </h5>

              {checklist.isValid ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    All {questions.length} questions have valid, confirmed answer keys and meet publishing criteria.
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs space-y-2 max-h-48 overflow-y-auto">
                  <div className="flex items-center gap-2 font-bold text-red-300">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Please resolve the following before publishing:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-red-200/90 pl-1">
                    {checklist.issues.map((issue, idx) => (
                      <li key={idx}>
                        {issue.qIndex ? (
                          <a
                            href={`#question-card-${questions[issue.qIndex - 1]?.tempId}`}
                            onClick={onClose}
                            className="underline hover:text-white"
                          >
                            {issue.message}
                          </a>
                        ) : (
                          issue.message
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Server Error Issues if any */}
            {publishResult?.issues && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 text-xs space-y-1">
                <span className="font-bold">Server validation rejected publish:</span>
                <ul className="list-disc list-inside text-[11px]">
                  {publishResult.issues.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isPublishing}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!checklist.isValid || isPublishing}
                isLoading={isPublishing}
                onClick={handlePublish}
                className="font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Confirm & Publish
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
