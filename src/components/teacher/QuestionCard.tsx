"use client";

import React, { useMemo, useState } from "react";
import { useDraftStore } from "@/hooks/use-draft-store";
import {
  publishableQuestionSchema,
  type DraftQuestion,
  type QuestionType,
} from "@/lib/schemas/exam";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import {
  GripVertical,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Plus,
  Check,
  AlertCircle,
  Sparkles,
  HelpCircle,
  X,
  FileText,
  Tag,
} from "lucide-react";

interface QuestionCardProps {
  question: DraftQuestion;
  index: number;
  total: number;
}

export const QuestionCard = React.memo(function QuestionCard({
  question,
  index,
  total,
}: QuestionCardProps) {
  const {
    patch,
    remove,
    duplicate,
    move,
    setType,
    setPrompt,
    setOption,
    addOption,
    removeOption,
    setAnswers,
    setConfirmed,
  } = useDraftStore();

  const [idInput, setIdInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExtraDetails, setShowExtraDetails] = useState(
    Boolean(question.context || question.instructions || (question.tags && question.tags.length > 0))
  );

  // Live card validation
  const validation = useMemo(() => {
    return publishableQuestionSchema.safeParse(question);
  }, [question]);

  const statusBadge = useMemo(() => {
    if (question.type === "essay") {
      return <Badge variant="secondary">Manual Grading</Badge>;
    }
    if (question.answers.length === 0) {
      return <Badge variant="destructive">Missing Answer</Badge>;
    }
    if (question.answerSource === "ai_inferred" && !question.confirmed) {
      return (
        <Badge variant="warning" className="gap-1">
          <Sparkles className="w-3 h-3" />
          AI-Inferred, Verify
        </Badge>
      );
    }
    if (question.answerSource === "provided" && !question.confirmed) {
      return <Badge variant="default">Needs Confirmation</Badge>;
    }
    if (question.confirmed) {
      return (
        <Badge variant="success" className="gap-1">
          <Check className="w-3 h-3" />
          Confirmed
        </Badge>
      );
    }
    return null;
  }, [question]);

  const handleAddIdVariant = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const val = idInput.trim();
    if (!val) return;
    if (!question.answers.includes(val)) {
      setAnswers(question.tempId, [...question.answers, val]);
    }
    setIdInput("");
  };

  const handleRemoveIdVariant = (val: string) => {
    const updated = question.answers.filter((a) => a !== val);
    setAnswers(question.tempId, updated);
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const val = tagInput.trim();
    if (!val) return;
    const currentTags = question.tags || [];
    if (!currentTags.includes(val)) {
      patch(question.tempId, { tags: [...currentTags, val] });
    }
    setTagInput("");
  };

  const handleRemoveTag = (t: string) => {
    const currentTags = question.tags || [];
    patch(question.tempId, { tags: currentTags.filter((tag) => tag !== t) });
  };

  return (
    <Card
      id={`question-card-${question.tempId}`}
      className="border-slate-800 bg-slate-900/80 shadow-md hover:border-slate-700/80 transition-all group"
    >
      <CardHeader className="py-3 px-4 sm:px-6 bg-slate-950/40 border-b border-slate-800/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Reorder & Q Number */}
          <div className="flex items-center gap-2">
            <div className="text-slate-500 cursor-grab active:cursor-grabbing p-1">
              <GripVertical className="w-4 h-4" />
            </div>
            <span className="font-mono text-sm font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              #{question.order}
            </span>

            {/* Question Type Selector */}
            <select
              value={question.type}
              onChange={(e) =>
                setType(question.tempId, e.target.value as QuestionType)
              }
              className="text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True / False</option>
              <option value="identification">Identification</option>
              <option value="essay">Essay (Subjective)</option>
            </select>

            {statusBadge}
          </div>

          {/* Right: Points, Move & Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-lg">
              <span className="text-[11px] text-slate-400 font-semibold">
                Pts:
              </span>
              <input
                type="number"
                min={0.25}
                max={100}
                step={0.5}
                value={question.points}
                onChange={(e) =>
                  patch(question.tempId, {
                    points: Number(e.target.value) || 1,
                  })
                }
                className="w-12 bg-transparent text-xs font-mono text-white text-right focus:outline-none"
              />
            </div>

            {/* Move Up/Down Controls */}
            <div className="flex items-center border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Move Up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={index === total - 1}
                onClick={() => move(index, index + 1)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Move Down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => duplicate(question.tempId)}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
              title="Duplicate Question"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
              title="Delete Question"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Tiptap WYSIWYG Prompt Input */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Question Prompt:
          </label>
          <RichTextEditor
            value={question.promptJson || question.prompt}
            placeholder="Type your question prompt with rich formatting, lists, tables..."
            minHeight="70px"
            onChange={(docJson, plainText) =>
              setPrompt(question.tempId, docJson, plainText)
            }
          />
        </div>

        {/* Toggle Extra Metadata (Context passage, instructions, tags) */}
        <div>
          <button
            type="button"
            onClick={() => setShowExtraDetails(!showExtraDetails)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            {showExtraDetails
              ? "Hide passage & instructions"
              : "+ Add reading passage, instructions, or tags"}
          </button>

          {showExtraDetails && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Reading Passage / Context:
                </label>
                <textarea
                  rows={2}
                  value={question.context || ""}
                  onChange={(e) =>
                    patch(question.tempId, { context: e.target.value })
                  }
                  placeholder="Shared passage or case study..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Section Instructions:
                </label>
                <input
                  type="text"
                  value={question.instructions || ""}
                  onChange={(e) =>
                    patch(question.tempId, { instructions: e.target.value })
                  }
                  placeholder="e.g. Choose the best answer from the given choices."
                  className="w-full h-8 rounded-lg border border-slate-800 bg-slate-950/80 px-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Tags & Topic:
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Type tag (e.g. Algebra, Grade 10) and press Enter"
                    className="h-8 text-xs bg-slate-950/60"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddTag}
                    className="h-8 px-2.5 text-xs"
                  >
                    Add Tag
                  </Button>
                </div>
                {question.tags && question.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {question.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]"
                      >
                        <Tag className="w-2.5 h-2.5 text-indigo-400" />
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Question-Type Specific Answer Editor */}
        {question.type === "multiple_choice" && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Options (Select the correct answer key):
            </span>
            <div className="space-y-2">
              {(question.options ?? []).map((opt, optIdx) => {
                const isCorrect = question.answers[0] === opt && opt !== "";
                const letter = String.fromCharCode(65 + optIdx);

                return (
                  <div key={optIdx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (opt) setAnswers(question.tempId, [opt]);
                      }}
                      className={`w-7 h-7 rounded-lg text-xs font-bold font-mono flex items-center justify-center border transition-all ${
                        isCorrect
                          ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/30"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white"
                      }`}
                      title={
                        isCorrect
                          ? "Correct Option"
                          : "Click to set as correct answer"
                      }
                    >
                      {letter}
                    </button>

                    <Input
                      type="text"
                      value={opt}
                      onChange={(e) =>
                        setOption(question.tempId, optIdx, e.target.value)
                      }
                      placeholder={`Option ${letter}`}
                      className={`h-9 text-xs bg-slate-950/60 ${
                        isCorrect
                          ? "border-emerald-500/50 focus-visible:ring-emerald-500"
                          : ""
                      }`}
                    />

                    {(question.options?.length ?? 0) > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(question.tempId, optIdx)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                        title="Remove Option"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {(question.options?.length ?? 0) < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addOption(question.tempId)}
                className="text-xs gap-1.5 mt-2 h-8 border-dashed border-slate-700 text-slate-400 hover:text-white"
              >
                <Plus className="w-3 h-3" />
                Add Choice
              </Button>
            )}
          </div>
        )}

        {question.type === "true_false" && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Select Answer Key:
            </span>
            <div className="flex gap-4">
              {["true", "false"].map((choice) => {
                const isSelected =
                  question.answers[0]?.toLowerCase() === choice;
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setAnswers(question.tempId, [choice])}
                    className={`flex-1 py-3 rounded-xl border text-center font-bold text-sm uppercase tracking-wider transition-all ${
                      isSelected
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                    }`}
                  >
                    {choice === "true" ? "True" : "False"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {question.type === "identification" && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Accepted Answer Variants (Case/Punctuation Insensitive at Grading):
            </span>
            <div className="flex gap-2">
              <Input
                type="text"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                onKeyDown={handleAddIdVariant}
                placeholder="Type accepted variant and press Enter (e.g. Manila)"
                className="h-9 text-xs bg-slate-950/60"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddIdVariant}
                className="h-9 px-3 text-xs"
              >
                Add Variant
              </Button>
            </div>

            {question.answers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {question.answers.map((ans, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-medium"
                  >
                    {ans}
                    <button
                      type="button"
                      onClick={() => handleRemoveIdVariant(ans)}
                      className="text-indigo-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {question.type === "essay" && (
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              Manual Evaluation Item
            </p>
            <p>
              Essays are reviewed manually by the instructor in the grading dashboard. No automated answer key is required.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="py-2.5 px-4 sm:px-6 bg-slate-950/20 border-t border-slate-800/60 flex items-center justify-between">
        {/* Confirmation Toggle (Hidden for essays) */}
        {question.type !== "essay" ? (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={question.confirmed}
              disabled={question.answers.length === 0}
              onChange={(e) => setConfirmed(question.tempId, e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded bg-slate-800 border-slate-700 disabled:opacity-40 cursor-pointer"
            />
            <span
              className={`text-xs font-semibold ${
                question.confirmed ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              Confirmed answer key
            </span>
          </label>
        ) : (
          <div />
        )}

        {/* Validation Issue notice */}
        {!validation.success && (
          <span className="text-xs text-red-400 font-medium flex items-center gap-1 animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5" />
            {validation.error.issues[0].message}
          </span>
        )}
      </CardFooter>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl animate-fade-in">
            <h4 className="text-base font-bold text-white">
              Delete Question #{question.order}?
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to remove this question? This action will immediately renumber subsequent questions.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  remove(question.tempId);
                  setShowDeleteConfirm(false);
                }}
              >
                Delete Question
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
});
