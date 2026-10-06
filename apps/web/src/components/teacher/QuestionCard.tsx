import React, { useMemo, useState } from "react";
import { useDraftStore } from "../../hooks/use-draft-store";
import {
  publishableQuestionSchema,
  type DraftQuestion,
  type QuestionType,
} from "@xsam/shared";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { RichTextEditor } from "../ui/RichTextEditor";
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

  const handleRemoveTag = (tag: string) => {
    const currentTags = question.tags || [];
    patch(question.tempId, { tags: currentTags.filter((t) => t !== tag) });
  };

  return (
    <Card
      id={`question-card-${question.tempId}`}
      className="border-border bg-card shadow-sm hover:border-primary/40 transition-all group"
    >
      <CardHeader className="py-3 px-4 sm:px-6 bg-muted/40 border-b border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1">
              <GripVertical className="w-4 h-4" />
            </div>
            <span className="font-mono text-sm font-bold text-foreground bg-muted px-2 py-0.5 rounded border border-border">
              #{question.order}
            </span>

            <select
              value={question.type}
              onChange={(e) =>
                setType(question.tempId, e.target.value as QuestionType)
              }
              className="text-xs font-semibold bg-background border border-input text-foreground rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True / False</option>
              <option value="identification">Identification</option>
              <option value="essay">Essay (Subjective)</option>
            </select>

            {statusBadge}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-background border border-input px-2.5 py-0.5 rounded-lg">
              <span className="text-[11px] text-muted-foreground font-semibold">
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
                className="w-12 bg-transparent text-xs font-mono text-foreground text-right focus:outline-none"
              />
            </div>

            <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Move Up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={index === total - 1}
                onClick={() => move(index, index + 1)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Move Down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => duplicate(question.tempId)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title="Duplicate Question"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Delete Question"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
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

        <div>
          <button
            type="button"
            onClick={() => setShowExtraDetails(!showExtraDetails)}
            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            {showExtraDetails
              ? "Hide passage & instructions"
              : "+ Add reading passage, instructions, or tags"}
          </button>

          {showExtraDetails && (
            <div className="mt-3 p-3.5 rounded-xl bg-muted/40 border border-border space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Reading Passage / Context:
                </label>
                <textarea
                  rows={2}
                  value={question.context || ""}
                  onChange={(e) =>
                    patch(question.tempId, { context: e.target.value })
                  }
                  placeholder="Shared passage or case study..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Section Instructions:
                </label>
                <input
                  type="text"
                  value={question.instructions || ""}
                  onChange={(e) =>
                    patch(question.tempId, { instructions: e.target.value })
                  }
                  placeholder="e.g. Choose the best answer from the given choices."
                  className="w-full h-8 rounded-lg border border-input bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Tags & Topic:
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Type tag (e.g. Algebra, Grade 10) and press Enter"
                    className="h-8 text-xs bg-background"
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
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted border border-border text-foreground text-[11px]"
                      >
                        <Tag className="w-2.5 h-2.5 text-primary" />
                        {t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-muted-foreground hover:text-destructive"
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

        {question.type === "multiple_choice" && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
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
                          : "bg-muted border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
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
                      className={`h-9 text-xs bg-background ${
                        isCorrect
                          ? "border-emerald-500/50 focus-visible:ring-emerald-500"
                          : ""
                      }`}
                    />

                    {(question.options?.length ?? 0) > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(question.tempId, optIdx)}
                        className="text-muted-foreground hover:text-destructive p-1 transition-colors"
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
                className="text-xs gap-1.5 mt-2 h-8 border-dashed border-border text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-3 h-3" />
                Add Choice
              </Button>
            )}
          </div>
        )}

        {question.type === "true_false" && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
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
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm"
                        : "bg-muted/40 border-border text-muted-foreground hover:border-border hover:text-foreground"
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Accepted Answer Variants (Case/Punctuation Insensitive at Grading):
            </span>
            <div className="flex gap-2">
              <Input
                type="text"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                onKeyDown={handleAddIdVariant}
                placeholder="Type accepted variant and press Enter (e.g. Manila)"
                className="h-9 text-xs bg-background"
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-medium"
                  >
                    {ans}
                    <button
                      type="button"
                      onClick={() => handleRemoveIdVariant(ans)}
                      className="text-primary hover:text-destructive transition-colors"
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
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-primary" />
              Manual Evaluation Item
            </p>
            <p>
              Essays are reviewed manually by the instructor in the grading dashboard. No automated answer key is required.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="py-2.5 px-4 sm:px-6 bg-muted/20 border-t border-border/60 flex items-center justify-between">
        {question.type !== "essay" ? (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={question.confirmed}
              disabled={question.answers.length === 0}
              onChange={(e) => setConfirmed(question.tempId, e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded bg-background border-input disabled:opacity-40 cursor-pointer"
            />
            <span
              className={`text-xs font-semibold ${
                question.confirmed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
              }`}
            >
              Confirmed answer key
            </span>
          </label>
        ) : (
          <div />
        )}

        {!validation.success && (
          <span className="text-xs text-destructive font-medium flex items-center gap-1 animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5" />
            {validation.error.issues[0].message}
          </span>
        )}
      </CardFooter>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl animate-fade-in text-card-foreground">
            <h4 className="text-base font-bold text-card-foreground">
              Delete Question #{question.order}?
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
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
