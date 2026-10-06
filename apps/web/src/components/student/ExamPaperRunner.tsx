import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { StudentQuestion } from "@xsam/shared";
import { useWebSocketAnswerSync } from "../../hooks/use-websocket-answer-sync";
import { studentApi } from "../../lib/api";
import { ExamTimer } from "./ExamTimer";
import { QuestionNavigator } from "./QuestionNavigator";
import { QuestionDrawingUploader } from "./QuestionDrawingUploader";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  RefreshCw,
  Send,
  AlertCircle,
  FileText,
  CheckCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface ExamPaperRunnerProps {
  sessionId: string;
  exam: {
    id?: string;
    title?: string;
    durationMinutes?: number;
    requireCamera?: boolean;
    enforceFullscreen?: boolean;
    restrictInput?: boolean;
    showScoreOnSubmit?: boolean;
  };
  paper: StudentQuestion[];
  savedAnswers: { questionId: string; answerText: string; clientTs?: number }[];
  deadlineAt: string;
}

export function ExamPaperRunner({
  sessionId,
  exam,
  paper,
  savedAnswers,
  deadlineAt,
}: ExamPaperRunnerProps) {
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const {
    answers,
    setAnswer,
    syncStatus,
    flushSync,
    sendIntegrityEvent,
  } = useWebSocketAnswerSync({
    sessionId,
    initialAnswers: savedAnswers,
  });

  const currentQuestion = paper[currentIndex];
  const totalQuestions = paper.length;

  const toggleFlag = (qId: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Anti-cheat fullscreen & visibility monitoring
  useEffect(() => {
    const handleFsChange = () => {
      const fsActive = Boolean(document.fullscreenElement);
      setIsFullscreen(fsActive);
      if (!fsActive && exam.enforceFullscreen) {
        sendIntegrityEvent("FULLSCREEN_EXIT", exam.id);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sendIntegrityEvent("TAB_SWITCH", exam.id);
      }
    };

    const handleWindowBlur = () => {
      sendIntegrityEvent("WINDOW_BLUR", exam.id);
    };

    // Input restriction & shortcut protection
    const handleCopyCut = (e: ClipboardEvent) => {
      if (exam.restrictInput) {
        e.preventDefault();
      }
      sendIntegrityEvent("COPY_CUT", exam.id);
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (exam.restrictInput) {
        e.preventDefault();
      }
      sendIntegrityEvent("PASTE", exam.id);
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (exam.restrictInput) {
        e.preventDefault();
        sendIntegrityEvent("CONTEXT_MENU", exam.id);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isDevTools =
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
        ((e.ctrlKey || e.metaKey) && (e.key === "U" || e.key === "u"));

      if (isDevTools) {
        if (exam.restrictInput) {
          e.preventDefault();
        }
        sendIntegrityEvent("SHORTCUT_ATTEMPT", exam.id);
      }
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("copy", handleCopyCut);
    document.addEventListener("cut", handleCopyCut);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("copy", handleCopyCut);
      document.removeEventListener("cut", handleCopyCut);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [exam.enforceFullscreen, exam.restrictInput, exam.id, sendIntegrityEvent]);

  // Handle final submission
  const handleSubmitExam = useCallback(
    async (reason: "student" | "timeout" = "student") => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        await flushSync();
        const res = await studentApi.submitSession(sessionId, reason);
        if (res.ok) {
          navigate(`/student/sessions/${sessionId}/done`);
        } else {
          alert("Submission failed. Please check your connection and try again.");
          setIsSubmitting(false);
        }
      } catch (err) {
        console.error("Submission failed:", err);
        setIsSubmitting(false);
      }
    },
    [sessionId, isSubmitting, flushSync, navigate]
  );

  const answeredCount = paper.filter(
    (q) => answers[q.id] && answers[q.id].trim() !== ""
  ).length;
  const unansweredCount = totalQuestions - answeredCount;

  const renderPrompt = (q: StudentQuestion) => {
    if (q.promptHtml) {
      return (
        <div
          className="prose prose-invert max-w-none text-white leading-relaxed [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-slate-700 [&_td]:p-2 [&_th]:border [&_th]:border-slate-700 [&_th]:p-2 [&_th]:bg-slate-800/60"
          dangerouslySetInnerHTML={{ __html: q.promptHtml }}
        />
      );
    }

    if (!q.underlined || !q.prompt.includes(q.underlined)) {
      return <span>{q.prompt}</span>;
    }

    const parts = q.prompt.split(q.underlined);
    return (
      <span>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="underline decoration-indigo-400 decoration-2 font-semibold text-indigo-200 underline-offset-4">
                {q.underlined}
              </span>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white pb-12">
      {/* Top Fixed Sticky Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-lg px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 font-bold text-sm">
              {currentIndex + 1}/{totalQuestions}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-white truncate">
                {exam.title || "Examination"}
              </h1>
              <p className="text-xs text-slate-400">
                Question {currentIndex + 1} of {totalQuestions}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Sync Status Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-medium">
              {syncStatus === "syncing" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-300">Syncing...</span>
                </>
              ) : syncStatus === "offline" ? (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-400">Offline (Cached)</span>
                </>
              ) : syncStatus === "error" ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-rose-400">Sync Warning</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  <span className="text-slate-300">All Answers Saved</span>
                </>
              )}
            </div>

            {/* Countdown Timer */}
            <ExamTimer
              deadlineAt={deadlineAt}
              onExpire={() => handleSubmitExam("timeout")}
            />

            {/* Fullscreen Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="hidden md:flex border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>

            {/* Submit Button */}
            <Button
              onClick={() => setIsSubmitModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm px-4 shadow-lg shadow-indigo-950"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Finish & Submit
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Question Area) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Instructions Header if present */}
          {currentQuestion?.instructions && (
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-indigo-300 flex items-start gap-2">
              <FileText className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400 block text-[10px]">
                  Section Instructions
                </span>
                <span>{currentQuestion.instructions}</span>
              </div>
            </div>
          )}

          {/* Context / Reading Passage Panel */}
          {currentQuestion?.context && (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-md space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Reference Context / Passage
                </h3>
              </div>
              <div className="max-h-60 overflow-y-auto pr-2 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap custom-scrollbar font-serif">
                {currentQuestion.context}
              </div>
            </div>
          )}

          {/* Main Question Card */}
          <Card className="border-slate-800 bg-slate-900/80 shadow-xl relative overflow-hidden">
            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Question Meta Header */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Question {currentIndex + 1}</Badge>
                  <Badge variant="outline" className="border-slate-700 text-slate-400">
                    {currentQuestion?.points || 1}{" "}
                    {(currentQuestion?.points || 1) === 1 ? "point" : "points"}
                  </Badge>
                  <span className="text-xs uppercase font-mono text-slate-500">
                    {currentQuestion?.type.replace("_", " ")}
                  </span>
                </div>

                {/* Flag for Review Button */}
                <button
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    flaggedIds.has(currentQuestion.id)
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      flaggedIds.has(currentQuestion.id) ? "fill-amber-400 text-amber-400" : ""
                    }`}
                  />
                  <span>
                    {flaggedIds.has(currentQuestion.id) ? "Flagged" : "Flag for review"}
                  </span>
                </button>
              </div>

              {/* Prompt Text */}
              <div className="text-base sm:text-lg font-medium text-white leading-relaxed">
                {renderPrompt(currentQuestion)}
              </div>

              {/* Response Inputs */}
              <div className="pt-2 space-y-4">
                {/* 1. Multiple Choice */}
                {currentQuestion?.type === "multiple_choice" && currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((opt, optIdx) => {
                      const optLabel = String.fromCharCode(65 + optIdx);
                      const isSelected = answers[currentQuestion.id] === opt;

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => setAnswer(currentQuestion.id, opt)}
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-start gap-3.5 ${
                            isSelected
                              ? "bg-indigo-600/20 border-indigo-500 text-white ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-950/50"
                              : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {optLabel}
                          </div>
                          <span className="text-sm font-medium pt-0.5 leading-snug">
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. True / False */}
                {currentQuestion?.type === "true_false" && (
                  <div className="grid grid-cols-2 gap-4">
                    {["True", "False"].map((choice) => {
                      const isSelected =
                        (answers[currentQuestion.id] || "").toLowerCase() ===
                        choice.toLowerCase();

                      return (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => setAnswer(currentQuestion.id, choice)}
                          className={`p-6 rounded-2xl border text-center transition-all duration-150 flex flex-col items-center justify-center gap-2 ${
                            isSelected
                              ? "bg-indigo-600/20 border-indigo-500 text-white ring-2 ring-indigo-500/40 shadow-lg"
                              : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700"
                          }`}
                        >
                          <span className="text-lg font-bold tracking-wider">
                            {choice.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">Select this statement</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3. Identification */}
                {currentQuestion?.type === "identification" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Your Answer
                    </label>
                    <input
                      type="text"
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                      placeholder="Type the exact term or answer here..."
                      className="w-full h-12 px-4 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 text-white placeholder:text-slate-600 outline-none text-base font-medium transition-all"
                    />
                  </div>
                )}

                {/* 4. Essay */}
                {currentQuestion?.type === "essay" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Written Response
                      </label>
                      <span className="text-xs text-slate-500 font-mono">
                        {(answers[currentQuestion.id] || "").trim().split(/\s+/).filter(Boolean).length}{" "}
                        words
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                      placeholder="Write your detailed explanation or answer here..."
                      className="w-full p-4 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 text-white placeholder:text-slate-600 outline-none text-sm font-sans leading-relaxed resize-y transition-all"
                    />

                    {/* QR Code Paper Drawing Upload Component */}
                    <div className="pt-2">
                      <QuestionDrawingUploader
                        examSessionId={sessionId}
                        questionId={currentQuestion.id}
                        onImageSynced={(imageUrl) => {
                          const existing = answers[currentQuestion.id] || "";
                          const updated = existing ? `${existing}\n\n[Drawing Attachment]: ${imageUrl}` : `[Drawing Attachment]: ${imageUrl}`;
                          setAnswer(currentQuestion.id, updated);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bottom Navigation Controls */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <Button
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
              className="border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            {currentIndex < totalQuestions - 1 ? (
              <Button
                onClick={() => setCurrentIndex((idx) => Math.min(totalQuestions - 1, idx + 1))}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                Next Question
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => setIsSubmitModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                Review & Submit
                <Send className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Right Column (Navigator Sidebar) */}
        <div className="lg:col-span-4">
          <div className="sticky top-20">
            <QuestionNavigator
              questions={paper}
              currentIndex={currentIndex}
              answers={answers}
              flaggedIds={flaggedIds}
              onSelect={(idx) => setCurrentIndex(idx)}
            />
          </div>
        </div>
      </main>

      {/* Final Submission Confirmation Dialog */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Submit Examination?</h2>
              <p className="text-xs text-slate-400">
                Please verify your answers before submitting. Once submitted, you will not be able to modify your answers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-base font-bold text-white">{answeredCount}</div>
                  <div className="text-[11px] text-slate-400">Answered</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unansweredCount > 0 ? (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-slate-500" />
                )}
                <div>
                  <div className={`text-base font-bold ${unansweredCount > 0 ? "text-amber-400" : "text-white"}`}>
                    {unansweredCount}
                  </div>
                  <div className="text-[11px] text-slate-400">Unanswered</div>
                </div>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>You have {unansweredCount} unanswered questions remaining!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsSubmitModalOpen(false)}
                className="border-slate-800 text-slate-300 hover:text-white"
              >
                Back to Exam
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={() => handleSubmitExam("student")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Confirm & Submit"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
