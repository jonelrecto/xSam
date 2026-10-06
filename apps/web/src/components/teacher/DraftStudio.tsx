import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useDraftStore } from "../../hooks/use-draft-store";
import { useAutosave } from "../../hooks/use-autosave";
import { teacherApi } from "../../lib/api";
import type { DraftQuestion } from "@xsam/shared";
import { QuestionCard } from "./QuestionCard";
import { CsvUploader } from "./CsvUploader";
import { PublishDialog } from "./PublishDialog";
import { ConflictDialog } from "./ConflictDialog";
import { DocumentImportModal } from "./DocumentImportModal";
import { QuestionBankPicker } from "./QuestionBankPicker";
import { WizardSteps } from "./WizardSteps";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
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
  Settings,
  Trash2,
  Camera,
  Shield,
  Shuffle,
  Award,
  AlertCircle,
  Percent,
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
  const navigate = useNavigate();
  const [currentExam, setCurrentExam] = useState(exam);

  useEffect(() => {
    setCurrentExam(exam);
  }, [exam]);

  const {
    hydrated,
    init,
    questions,
    add,
    move,
    confirmAllProvided,
  } = useDraftStore();

  const { status, save, flush, setStatus } = useAutosave(currentExam.id);
  const [publishOpen, setPublishOpen] = useState(false);
  const [docImportOpen, setDocImportOpen] = useState(false);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);

  // Configuration Modal State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configTitle, setConfigTitle] = useState(currentExam.title);
  const [configDescription, setConfigDescription] = useState(currentExam.description || "");
  const [configDuration, setConfigDuration] = useState(currentExam.durationMinutes);
  const [configPassingPercent, setConfigPassingPercent] = useState(currentExam.passingPercent || 60);
  const [configCategoryId, setConfigCategoryId] = useState(currentExam.categoryId || "");
  const [configStart, setConfigStart] = useState(
    currentExam.scheduledStart ? new Date(currentExam.scheduledStart).toISOString().slice(0, 16) : ""
  );
  const [configEnd, setConfigEnd] = useState(
    currentExam.scheduledEnd ? new Date(currentExam.scheduledEnd).toISOString().slice(0, 16) : ""
  );

  // Security & Integrity Policy states
  const [configShuffleQ, setConfigShuffleQ] = useState(Boolean(currentExam.shuffleQuestions));
  const [configShuffleOpt, setConfigShuffleOpt] = useState(Boolean(currentExam.shuffleOptions));
  const [configFullscreen, setConfigFullscreen] = useState(Boolean(currentExam.enforceFullscreen));
  const [configCamera, setConfigCamera] = useState(Boolean(currentExam.requireCamera));
  const [configRestrictInput, setConfigRestrictInput] = useState(Boolean(currentExam.restrictInput));
  const [configShowScore, setConfigShowScore] = useState(Boolean(currentExam.showScoreOnSubmit));

  const [categories, setCategories] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configError, setConfigError] = useState("");

  // Category Quick Creation State
  const [isNewCatModalOpen, setIsNewCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#6366f1");
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Delete Exam State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeletingExam, setIsDeletingExam] = useState(false);
  const [deleteExamError, setDeleteExamError] = useState("");

  useEffect(() => {
    init(currentExam.id, initialQuestions, initialVersion);
  }, [currentExam.id, initialQuestions, initialVersion, init]);

  useEffect(() => {
    teacherApi.getCategories().then((res: any) => {
      if (Array.isArray(res)) {
        setCategories(res);
      } else if (res && res.categories) {
        setCategories(res.categories);
      }
    }).catch(() => {});
  }, []);

  const openConfigModal = () => {
    setConfigTitle(currentExam.title);
    setConfigDescription(currentExam.description || "");
    setConfigDuration(currentExam.durationMinutes);
    setConfigPassingPercent(currentExam.passingPercent || 60);
    setConfigCategoryId(currentExam.categoryId || "");
    setConfigStart(
      currentExam.scheduledStart ? new Date(currentExam.scheduledStart).toISOString().slice(0, 16) : ""
    );
    setConfigEnd(
      currentExam.scheduledEnd ? new Date(currentExam.scheduledEnd).toISOString().slice(0, 16) : ""
    );
    setConfigShuffleQ(Boolean(currentExam.shuffleQuestions));
    setConfigShuffleOpt(Boolean(currentExam.shuffleOptions));
    setConfigFullscreen(Boolean(currentExam.enforceFullscreen));
    setConfigCamera(Boolean(currentExam.requireCamera));
    setConfigRestrictInput(Boolean(currentExam.restrictInput));
    setConfigShowScore(Boolean(currentExam.showScoreOnSubmit));
    setConfigError("");
    setIsConfigOpen(true);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsCreatingCat(true);
    try {
      const res = await teacherApi.createCategory({
        name: newCatName.trim(),
        color: newCatColor,
      });
      if (res.ok && res.category) {
        setCategories((prev) => [...prev, res.category]);
        setConfigCategoryId(res.category.id);
        setIsNewCatModalOpen(false);
        setNewCatName("");
        setNewCatColor("#6366f1");
      }
    } finally {
      setIsCreatingCat(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError("");

    if (!configTitle.trim()) {
      setConfigError("Exam title is required.");
      return;
    }

    if (!configEnd) {
      setConfigError("Closing date and time is required.");
      return;
    }

    if (configStart && configEnd && new Date(configEnd) <= new Date(configStart)) {
      setConfigError("Scheduled end time must be after start time.");
      return;
    }

    if (configStart && configEnd) {
      const windowMins = (new Date(configEnd).getTime() - new Date(configStart).getTime()) / 60000;
      if (windowMins < Number(configDuration)) {
        setConfigError("Scheduled availability window is shorter than the exam duration.");
        return;
      }
    }

    setIsSavingConfig(true);
    try {
      const payload = {
        title: configTitle.trim(),
        description: configDescription.trim() || null,
        durationMinutes: Number(configDuration),
        passingPercent: Number(configPassingPercent),
        categoryId: configCategoryId || null,
        scheduledStart: configStart ? new Date(configStart).toISOString() : null,
        scheduledEnd: new Date(configEnd).toISOString(),
        shuffleQuestions: configShuffleQ,
        shuffleOptions: configShuffleOpt,
        enforceFullscreen: configFullscreen,
        requireCamera: configCamera,
        restrictInput: configRestrictInput,
        showScoreOnSubmit: configShowScore,
      };

      const res = await teacherApi.updateExamDetails(currentExam.id, payload);
      if (res.ok) {
        setCurrentExam((prev: any) => ({
          ...prev,
          ...payload,
        }));
        setIsConfigOpen(false);
      } else {
        setConfigError("Failed to update exam configuration.");
      }
    } catch (err: any) {
      setConfigError(err?.message || "Failed to update exam configuration.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleDeleteExam = async () => {
    setIsDeletingExam(true);
    setDeleteExamError("");
    try {
      const res = await teacherApi.deleteExam(currentExam.id);
      if (res.ok) {
        setIsDeleteOpen(false);
        navigate("/teacher");
      } else {
        setDeleteExamError("Failed to delete exam.");
      }
    } catch (err: any) {
      setDeleteExamError(err?.message || "Failed to delete exam.");
    } finally {
      setIsDeletingExam(false);
    }
  };

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
          <Link to={`/teacher/exams/${exam.id}`}>
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
      <WizardSteps
        currentStep={2}
        examId={currentExam.id}
        onStepClick={(step) => {
          if (step === 1) openConfigModal();
        }}
      />

      {currentExam.status === "published" && (
        <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-xs text-primary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>
              <strong>Pre-Start Published Edit Mode:</strong> This exam is published (Code: <code>{currentExam.accessCode}</code>). You can edit questions before sessions start.
            </span>
          </div>
          <Badge variant="default" className="text-[10px]">Active Access Code Preserved</Badge>
        </div>
      )}

      {/* Sticky Action Header */}
      <div className="sticky top-16 z-30 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-xl border-y border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/teacher" className="text-muted-foreground hover:text-foreground p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground truncate max-w-xs sm:max-w-md">
                {currentExam.title}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={openConfigModal}
                className="h-6 px-1.5 text-xs text-primary hover:text-primary/80 hover:bg-primary/10 font-normal"
                title="Edit initial configuration"
              >
                <Settings className="w-3 h-3 mr-1" />
                Edit Config
              </Button>
            </div>
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openConfigModal}
            className="text-xs"
            title="Edit Initial Configuration"
          >
            <Settings className="w-3.5 h-3.5 mr-1 text-primary" />
            Edit Config
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={confirmAllProvided}
            className="text-xs"
            title="Confirm all provided CSV/manual answers"
          >
            Confirm Keys
          </Button>

          {currentExam.status === "draft" ? (
            <Button
              size="sm"
              onClick={() => setPublishOpen(true)}
              className="font-semibold gap-1.5 text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Publish Exam
            </Button>
          ) : (
            <Link to={`/teacher/exams/${currentExam.id}`}>
              <Button size="sm" variant="default" className="font-semibold gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Done Editing
              </Button>
            </Link>
          )}

          {sessionCount === 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Delete Exam"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
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
        exam={currentExam}
        isOpen={publishOpen}
        onClose={() => setPublishOpen(false)}
        onFlush={flush}
      />

      <ConflictDialog
        examId={currentExam.id}
        isOpen={status === "conflict"}
        onResolved={() => setStatus("saved")}
        onSave={save}
      />

      <DocumentImportModal
        examId={currentExam.id}
        isOpen={docImportOpen}
        onClose={() => setDocImportOpen(false)}
      />

      <QuestionBankPicker
        isOpen={bankPickerOpen}
        onClose={() => setBankPickerOpen(false)}
      />

      {/* Edit Initial Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <form
            onSubmit={handleSaveConfig}
            className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-card-foreground max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-card-foreground">Edit Initial Configuration</h3>
              </div>
              <Badge variant="outline" className="text-[10px]">
                Step 1 Settings
              </Badge>
            </div>

            {configError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{configError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div>
                <Label htmlFor="configTitle" required className="mb-1 block">
                  Exam Title
                </Label>
                <Input
                  id="configTitle"
                  type="text"
                  value={configTitle}
                  onChange={(e) => setConfigTitle(e.target.value)}
                  placeholder="e.g., Midterm Assessment"
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <Label htmlFor="configDescription" className="mb-1 block">
                  Instructions & Description
                </Label>
                <textarea
                  id="configDescription"
                  rows={2}
                  value={configDescription}
                  onChange={(e) => setConfigDescription(e.target.value)}
                  placeholder="Instructions or rules for students..."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Subject / Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="configCategory">Subject / Category</Label>
                  <button
                    type="button"
                    onClick={() => setIsNewCatModalOpen(true)}
                    className="text-[11px] text-primary hover:text-primary/80 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> New Category
                  </button>
                </div>
                <select
                  id="configCategory"
                  value={configCategoryId}
                  onChange={(e) => setConfigCategoryId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground"
                >
                  <option value="">No Category (General)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration & Passing Score */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="configDuration" required className="mb-1 block">
                    Duration (Minutes)
                  </Label>
                  <div className="relative">
                    <Input
                      id="configDuration"
                      type="number"
                      min={5}
                      max={480}
                      value={configDuration}
                      onChange={(e) => setConfigDuration(Number(e.target.value))}
                      className="text-xs pr-7"
                      required
                    />
                    <Clock className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="configPassingPercent" required className="mb-1 block">
                    Passing Benchmark (%)
                  </Label>
                  <div className="relative">
                    <Input
                      id="configPassingPercent"
                      type="number"
                      min={1}
                      max={100}
                      value={configPassingPercent}
                      onChange={(e) => setConfigPassingPercent(Number(e.target.value))}
                      className="text-xs pr-7"
                      required
                    />
                    <Percent className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Schedule Window */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="configStart" className="mb-1 block">
                    Start Time (Optional)
                  </Label>
                  <Input
                    id="configStart"
                    type="datetime-local"
                    value={configStart}
                    onChange={(e) => setConfigStart(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor="configEnd" required className="mb-1 block">
                    Closing Deadline
                  </Label>
                  <Input
                    id="configEnd"
                    type="datetime-local"
                    value={configEnd}
                    onChange={(e) => setConfigEnd(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              {/* Integrity Policies Grid */}
              <div className="pt-2 border-t border-border space-y-2.5">
                <span className="font-bold text-muted-foreground uppercase tracking-wider block text-[10px]">
                  Integrity Policies & Security Controls:
                </span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-muted/40 hover:border-primary/50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={configShuffleQ}
                      onChange={(e) => setConfigShuffleQ(e.target.checked)}
                      className="rounded bg-background border-input text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Shuffle className="w-3.5 h-3.5 text-primary" /> Shuffle Question Order
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Randomize question sequence uniquely for each student attempt
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-muted/40 hover:border-primary/50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={configShuffleOpt}
                      onChange={(e) => setConfigShuffleOpt(e.target.checked)}
                      className="rounded bg-background border-input text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Shuffle className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Shuffle Multiple Choice Options
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Permute choices for multiple choice items
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-muted/40 hover:border-primary/50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={configFullscreen}
                      onChange={(e) => setConfigFullscreen(e.target.checked)}
                      className="rounded bg-background border-input text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Enforce Fullscreen Mode
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Require fullscreen test runner and log 10s exit countdown warnings
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-muted/40 hover:border-primary/50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={configCamera}
                      onChange={(e) => setConfigCamera(e.target.checked)}
                      className="rounded bg-background border-input text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Require Webcam Proctoring
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Require camera permission and periodic proctoring validation
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-muted/40 hover:border-primary/50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={configRestrictInput}
                      onChange={(e) => setConfigRestrictInput(e.target.checked)}
                      className="rounded bg-background border-input text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-destructive" /> Restrict Input & Clipboard
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Block copy/cut/paste, right-click menu, and inspect shortcuts
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-muted/40 hover:border-primary/50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={configShowScore}
                      onChange={(e) => setConfigShowScore(e.target.checked)}
                      className="rounded bg-background border-input text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Instant Score Feedback
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Show auto-graded score immediately upon exam submission
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfigOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingConfig}
              >
                {isSavingConfig ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Category Creation Modal */}
      {isNewCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <form
            onSubmit={handleCreateCategory}
            className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl text-card-foreground"
          >
            <h4 className="text-sm font-bold text-card-foreground">Create New Category</h4>
            <div>
              <Label htmlFor="newCatName" required className="mb-1 block">
                Category Name
              </Label>
              <Input
                id="newCatName"
                type="text"
                placeholder="e.g. Science"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="text-xs"
                required
              />
            </div>
            <div>
              <Label htmlFor="newCatColor" className="mb-1 block">
                Color Tag
              </Label>
              <input
                id="newCatColor"
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="w-full h-8 rounded border border-input bg-background cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewCatModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingCat}
              >
                {isCreatingCat ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Exam Confirmation Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-card-foreground">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-card-foreground">Delete Examination</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-foreground">"{currentExam.title}"</strong>? All questions in this draft and configuration will be permanently deleted.
            </p>

            {deleteExamError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteExamError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeletingExam}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteExam}
                disabled={isDeletingExam}
              >
                {isDeletingExam ? "Deleting..." : "Permanently Delete Exam"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
