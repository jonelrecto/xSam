"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getGradingQueue,
  gradeStudentAnswerAction,
  type PendingGradingItem,
} from "@/app/actions/grading";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Save,
  Check,
} from "lucide-react";

export default function GradingQueuePage() {
  const params = useParams();
  const examId = params.examId as string;

  const [isPending, startTransition] = useTransition();
  const [queue, setQueue] = useState<PendingGradingItem[]>([]);
  const [viewMode, setViewMode] = useState<"by_question" | "by_student">("by_question");
  const [selectedQuestionOrder, setSelectedQuestionOrder] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Active scoring state
  const [scores, setScores] = useState<Record<string, number>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadQueue = () => {
    startTransition(async () => {
      const data = await getGradingQueue(examId);
      setQueue(data);

      const initScores: Record<string, number> = {};
      data.forEach((item) => {
        if (item.pointsAwarded !== null) {
          initScores[`${item.sessionId}_${item.questionId}`] = item.pointsAwarded;
        }
      });
      setScores(initScores);

      // Default question order
      if (data.length > 0 && selectedQuestionOrder === null) {
        setSelectedQuestionOrder(data[0].questionOrder);
      }
    });
  };

  useEffect(() => {
    if (examId) loadQueue();
  }, [examId]);

  // Unique questions in queue
  const availableQuestions = React.useMemo(() => {
    const map = new Map<number, { order: number; prompt: string; count: number }>();
    queue.forEach((item) => {
      const existing = map.get(item.questionOrder);
      if (existing) {
        existing.count++;
      } else {
        map.set(item.questionOrder, {
          order: item.questionOrder,
          prompt: item.prompt,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [queue]);

  // Unique students in queue
  const availableStudents = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; number: string | null; count: number }>();
    queue.forEach((item) => {
      const existing = map.get(item.studentId);
      if (existing) {
        existing.count++;
      } else {
        map.set(item.studentId, {
          id: item.studentId,
          name: item.studentName,
          number: item.studentNumber,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [queue]);

  const activeItems = React.useMemo(() => {
    if (viewMode === "by_question") {
      return queue.filter((i) => i.questionOrder === selectedQuestionOrder);
    }
    return queue.filter((i) => i.studentId === selectedStudentId);
  }, [queue, viewMode, selectedQuestionOrder, selectedStudentId]);

  const gradedCount = queue.filter((i) => i.pointsAwarded !== null && i.manualGrade).length;
  const progressPercent = queue.length > 0 ? Math.round((gradedCount / queue.length) * 100) : 100;

  const handleSaveGrade = async (item: PendingGradingItem, points: number) => {
    const key = `${item.sessionId}_${item.questionId}`;
    setSavingKey(key);

    const res = await gradeStudentAnswerAction(
      item.sessionId,
      item.questionId,
      points,
      points > 0
    );

    if (res.ok) {
      setQueue((prev) =>
        prev.map((q) =>
          q.sessionId === item.sessionId && q.questionId === item.questionId
            ? { ...q, pointsAwarded: points, manualGrade: true }
            : q
        )
      );
    }
    setSavingKey(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/teacher/exams/${examId}`} className="text-muted-foreground hover:text-foreground p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-primary" />
              Grading Queue
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review and score essays and subjective student answers
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border">
          <button
            type="button"
            onClick={() => {
              setViewMode("by_question");
              if (availableQuestions.length > 0) {
                setSelectedQuestionOrder(availableQuestions[0].order);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === "by_question"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Question
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("by_student");
              if (availableStudents.length > 0) {
                setSelectedStudentId(availableStudents[0].id);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === "by_student"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Student
          </button>
        </div>
      </div>

      {/* Live Grading Progress Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 w-full sm:w-auto">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Evaluation Progress: {gradedCount} of {queue.length} items checked
            </span>
            <div className="w-full sm:w-72 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <Badge variant={progressPercent === 100 ? "success" : "default"} className="font-mono">
            {progressPercent}% Complete
          </Badge>
        </CardContent>
      </Card>

      {/* Horizontal Category / Selector Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {viewMode === "by_question"
          ? availableQuestions.map((q) => {
              const isSelected = selectedQuestionOrder === q.order;
              return (
                <button
                  key={q.order}
                  type="button"
                  onClick={() => setSelectedQuestionOrder(q.order)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 border transition-all flex items-center gap-2 ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                  }`}
                >
                  <span>Question #{q.order}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-mono">
                    {q.count}
                  </span>
                </button>
              );
            })
          : availableStudents.map((s) => {
              const isSelected = selectedStudentId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStudentId(s.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 border transition-all flex items-center gap-2 ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
                  }`}
                >
                  <span>{s.name}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-mono">
                    {s.count}
                  </span>
                </button>
              );
            })}
      </div>

      {/* Main Grading Stream */}
      {isPending ? (
        <div className="py-20 text-center text-muted-foreground animate-pulse">
          Loading submission answers...
        </div>
      ) : activeItems.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-muted/20 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-foreground">All Items Graded!</h3>
          <p className="text-xs text-muted-foreground">
            There are no pending subjective answers requiring manual review for this selection.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeItems.map((item) => {
            const key = `${item.sessionId}_${item.questionId}`;
            const currentScore = scores[key] ?? item.pointsAwarded ?? 0;
            const isSaved = item.pointsAwarded !== null && item.manualGrade;
            const isSaving = savingKey === key;

            return (
              <Card
                key={key}
                className="shadow-sm hover:border-primary/50 transition-all"
              >
                <CardHeader className="p-4 bg-muted/30 border-b border-border flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px] font-mono">
                      #{item.questionOrder}
                    </Badge>
                    <span className="text-xs font-bold text-foreground">{item.studentName}</span>
                    {item.studentNumber && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        ({item.studentNumber})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isSaved && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Graded ({item.pointsAwarded}/{item.maxPoints} pts)
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {/* Prompt Text */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-foreground/90">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                      Prompt Statement:
                    </span>
                    <p>{item.prompt}</p>
                  </div>

                  {/* Student's Written Response */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Student Response:
                    </span>
                    <div className="p-4 rounded-xl bg-muted/20 border border-border text-sm text-foreground font-sans leading-relaxed whitespace-pre-wrap">
                      {item.answerText ? item.answerText : <em className="text-muted-foreground">No response provided</em>}
                    </div>
                  </div>

                  {/* Rubric Score Assign Bar */}
                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        Assign Score (Max {item.maxPoints} pts):
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={item.maxPoints}
                        step={0.5}
                        value={currentScore}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setScores((prev) => ({ ...prev, [key]: val }));
                        }}
                        className="w-20 h-8 text-xs font-mono bg-background text-right"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quick Full / Zero Score buttons */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScores((prev) => ({ ...prev, [key]: item.maxPoints }));
                          handleSaveGrade(item, item.maxPoints);
                        }}
                        className="h-8 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                      >
                        Full Credit ({item.maxPoints})
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScores((prev) => ({ ...prev, [key]: 0 }));
                          handleSaveGrade(item, 0);
                        }}
                        className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                      >
                        Zero (0)
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        disabled={isSaving}
                        onClick={() => handleSaveGrade(item, currentScore)}
                        className="h-8 text-xs font-semibold gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? "Saving..." : "Save Score"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
