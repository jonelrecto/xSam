"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDraftStore } from "@/hooks/use-draft-store";
import { useAutosave } from "@/hooks/use-autosave";
import type { DraftQuestion, QuestionType } from "@/lib/schemas/exam";
import { QuestionCard } from "./QuestionCard";
import { CsvUploader } from "./CsvUploader";
import { PublishDialog } from "./PublishDialog";
import { ConflictDialog } from "./ConflictDialog";
import { DocumentImportModal } from "./DocumentImportModal";
import { QuestionBankPicker } from "./QuestionBankPicker";
import { WizardSteps } from "./WizardSteps";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Sparkles,
  Lock,
  ArrowLeft,
  FileQuestion,
  Upload,
  BookOpen,
  Info,
} from "lucide-react";

interface DraftStudioProps {
  exam: any;
  initialQuestions: DraftQuestion[];
  initialVersion: number;
  isEditable?: boolean;
  sessionCount?: number;
}

export function DraftStudio({
  exam,
  initialQuestions,
  initialVersion,
  isEditable = true,
  sessionCount = 0,
}: DraftStudioProps) {
  const {
    hydrated,
    init,
    questions,
    add,
    move,
    confirmAllProvided,
  } = useDraftStore();

  const { status, save, flush, setStatus } = useAutosave(exam.id);
  const [publishOpen, setPublishOpen] = useState(false);
  const [docImportOpen, setDocImportOpen] = useState(false);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);

  useEffect(() => {
    init(exam.id, initialQuestions, initialVersion);
  }, [exam.id, initialQuestions, initialVersion, init]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const stats = useMemo(() => {
    let totalPoints = 0;
    let confirmedCount = 0;
    let needsReviewCount = 0;
    let missingAnswerCount = 0;

    questions.forEach((q) => {
      totalPoints += Number(q.points) || 1;
      if (q.type === "essay" || q.confirmed) {
        confirmedCount++;
      } else if (q.answers.length === 0) {
        missingAnswerCount++;
      } else {
        needsReviewCount++;
      }
    });

    return {
      totalQuestions: questions.length,
      totalPoints,
      confirmedCount,
      needsReviewCount,
      missingAnswerCount,
    };
  }, [questions]);

  if (!hydrated) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center text-muted-foreground animate-pulse">
        <p>Loading Exam Draft Studio...</p>
      </div>
    );
  }

  if (!isEditable) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              This exam is <strong>LOCKED</strong>. {sessionCount > 0 ? `${sessionCount} student sessions have already started.` : "The scheduled availability window has opened."} Questions cannot be modified to protect scoring integrity.
            </span>
          </div>
          <Link href={`/teacher/exams/${exam.id}`}>
            <Button variant="outline" size="sm" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
              Exam Details
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">{exam.title}</h2>
          <p className="text-xs text-muted-foreground">
            Access Code: <code className="font-mono text-primary font-bold">{exam.accessCode}</code> • {questions.length} Questions
          </p>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <QuestionCard key={q.tempId} question={q} index={idx} total={questions.length} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <WizardSteps currentStep={2} examId={exam.id} />

      {exam.status === "published" && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-xs text-primary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>
              <strong>Pre-Start Published Edit Mode:</strong> This exam is published (Code: <code>{exam.accessCode}</code>). You can edit questions before sessions start. Strict validation is enforced on save.
            </span>
          </div>
          <Badge variant="default" className="text-[10px]">Active Access Code Preserved</Badge>
        </div>
      )}

      {/* Sticky Action Header */}
      <div className="sticky top-16 z-30 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-xl border-y border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/teacher" className="text-muted-foreground hover:text-foreground p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground truncate max-w-xs sm:max-w-md">
              {exam.title}
            </h2>
            <div className="flex items-center gap-2">
              {status === "saved" && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Saved
                </span>
              )}
              {status === "saving" && (
                <span className="text-[11px] text-primary flex items-center gap-1 animate-pulse font-medium">
                  <RotateCcw className="w-3 h-3 animate-spin" /> Saving draft...
                </span>
              )}
              {status === "dirty" && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" /> Unsaved changes
                </span>
              )}
              {status === "error" && (
                <button
                  type="button"
                  onClick={() => save()}
                  className="text-[11px] text-destructive hover:underline flex items-center gap-1 font-medium"
                >
                  <AlertTriangle className="w-3 h-3" /> Save failed (Click to retry)
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={confirmAllProvided}
            className="text-xs"
            title="Confirm all provided CSV/manual answers"
          >
            Confirm Provided Keys
          </Button>

          {exam.status === "draft" ? (
            <Button
              size="sm"
              onClick={() => setPublishOpen(true)}
              className="font-semibold gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Publish Exam
            </Button>
          ) : (
            <Link href={`/teacher/exams/${exam.id}`}>
              <Button size="sm" variant="default" className="font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Done Editing
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Import & Bank Repository Bars */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-card-foreground flex items-center gap-2">
                  AI Document Import
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Parse questions from PDF / Word documents
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDocImportOpen(true)}
              className="text-xs"
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              Import File
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-card-foreground flex items-center gap-2">
                  Question Bank
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Insert items from your verified question library
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBankPickerOpen(true)}
              className="text-xs"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1" />
              Open Bank
            </Button>
          </div>
        </div>

        <CsvUploader />
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-card border border-border text-xs shadow-sm">
        <div className="text-center sm:border-r border-border">
          <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Items</span>
          <span className="font-mono text-lg font-black text-card-foreground">{stats.totalQuestions}</span>
        </div>
        <div className="text-center sm:border-r border-border">
          <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Points</span>
          <span className="font-mono text-lg font-black text-card-foreground">{stats.totalPoints}</span>
        </div>
        <div className="text-center sm:border-r border-border">
          <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase font-bold">Confirmed</span>
          <span className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.confirmedCount}</span>
        </div>
        <div className="text-center sm:border-r border-border">
          <span className="text-primary block text-[10px] uppercase font-bold">Needs Review</span>
          <span className="font-mono text-lg font-black text-primary">{stats.needsReviewCount}</span>
        </div>
        <div className="text-center col-span-2 sm:col-span-1">
          <span className="text-destructive block text-[10px] uppercase font-bold">Missing Key</span>
          <span className="font-mono text-lg font-black text-destructive">{stats.missingAnswerCount}</span>
        </div>
      </div>

      {/* Questions DnD List */}
      {questions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
          <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
          <h3 className="text-base font-bold text-card-foreground">Your Question Draft is Empty</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Upload a PDF / Word document, CSV spreadsheet, insert from your Question Bank, or add questions manually below.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return;
            const from = questions.findIndex((q) => q.tempId === active.id);
            const to = questions.findIndex((q) => q.tempId === over.id);
            move(from, to);
          }}
        >
          <SortableContext
            items={questions.map((q) => q.tempId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <QuestionCard
                  key={q.tempId}
                  question={q}
                  index={idx}
                  total={questions.length}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Quick Add Question Bar */}
      <div className="p-4 rounded-xl border border-border bg-card flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          + Add Question Manually:
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => add("multiple_choice")}
            className="text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Multiple Choice
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => add("true_false")}
            className="text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> True / False
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => add("identification")}
            className="text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Identification
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => add("essay")}
            className="text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Essay
          </Button>
        </div>
      </div>

      <PublishDialog
        exam={exam}
        isOpen={publishOpen}
        onClose={() => setPublishOpen(false)}
        onFlush={flush}
      />

      <ConflictDialog
        examId={exam.id}
        isOpen={status === "conflict"}
        onResolved={() => setStatus("saved")}
        onSave={save}
      />

      <DocumentImportModal
        examId={exam.id}
        isOpen={docImportOpen}
        onClose={() => setDocImportOpen(false)}
      />

      <QuestionBankPicker
        isOpen={bankPickerOpen}
        onClose={() => setBankPickerOpen(false)}
      />
    </div>
  );
}
