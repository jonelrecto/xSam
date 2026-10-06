import React, { useEffect, useState, useTransition, useMemo } from "react";
import { teacherApi } from "../../lib/api";
import { useDraftStore } from "../../hooks/use-draft-store";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  BookOpen,
  Search,
  Check,
  Plus,
  X,
  Tag,
  CheckSquare,
  Square,
  FileText,
  HelpCircle,
  Folder,
} from "lucide-react";
import type { DraftQuestion } from "@xsam/shared";
import { plainTextToTiptap } from "@xsam/shared";

interface QuestionBankPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuestionBankPicker({ isOpen, onClose }: QuestionBankPickerProps) {
  const { load } = useDraftStore();
  const [isPending, startTransition] = useTransition();

  const [questions, setQuestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const fetchBank = (searchTerm = search, cat = selectedCategory, type = selectedType) => {
    startTransition(async () => {
      try {
        const [bankData, cats] = await Promise.all([
          teacherApi.getBankQuestions({
            categoryId: cat === "all" ? undefined : cat,
            type: type === "all" ? undefined : type,
            search: searchTerm.trim() ? searchTerm.trim() : undefined,
          }),
          teacherApi.getCategories(),
        ]);
        setQuestions(bankData || []);
        setCategories(cats || []);
      } catch (err) {
        console.error("Failed to load question bank:", err);
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      fetchBank(search, selectedCategory, selectedType);
      setSelectedIds(new Set());
    }
  }, [isOpen, selectedCategory, selectedType]);

  // Debounced search trigger when typing
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchBank(search, selectedCategory, selectedType);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  };

  const handleInsertSelected = () => {
    if (selectedIds.size === 0) return;
    const selectedQuestions = questions.filter((q) => selectedIds.has(q.id));
    const draftQuestions: DraftQuestion[] = selectedQuestions.map((q, idx) => ({
      tempId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      order: idx + 1,
      type: q.type,
      prompt: q.prompt,
      promptJson: q.promptJson || plainTextToTiptap(q.prompt, q.underlined),
      options: q.options || (q.type === "multiple_choice" ? ["", ""] : null),
      answers: q.answers || [],
      answerSource: "provided",
      confirmed: true,
      points: Number(q.points) || 1,
      warnings: [],
      tags: q.tags || [],
      bankQuestionId: q.id,
      categoryId: q.categoryId,
      context: q.context,
      contextJson: q.contextJson,
      instructions: q.instructions,
      instructionsJson: q.instructionsJson,
      underlined: q.underlined,
    }));

    load(draftQuestions, "append");
    onClose();
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "multiple_choice":
        return "bg-primary/15 text-primary border-primary/30";
      case "true_false":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
      case "identification":
        return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
      case "essay":
        return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                Question Bank Repository
                <Badge variant="outline" className="text-[10px] font-mono border-border">
                  {questions.length} Items Available
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Browse verified question templates from your library to insert into this exam draft
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-border bg-muted/20 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              type="text"
              placeholder="Search bank questions by keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs bg-background border-input"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Subject Categories</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Question Types</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True / False</option>
              <option value="identification">Identification</option>
              <option value="essay">Essay</option>
            </select>
          </div>
        </div>

        {/* Question List Header / Actions */}
        {questions.length > 0 && (
          <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {selectedIds.size === questions.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  Deselect All ({questions.length})
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" />
                  Select All ({questions.length})
                </>
              )}
            </button>
            <span>
              {selectedIds.size} of {questions.length} selected
            </span>
          </div>
        )}

        {/* Question List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
          {isPending ? (
            <div className="py-16 text-center text-muted-foreground animate-pulse text-sm">
              <BookOpen className="w-8 h-8 text-primary/50 mx-auto mb-2 animate-bounce" />
              Loading Question Bank items...
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-3">
              <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-foreground">No bank questions found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  {search || selectedCategory !== "all" || selectedType !== "all"
                    ? "No questions match your filter criteria. Try clearing the filters."
                    : "Questions are automatically synchronized to your bank when exams are published."}
                </p>
              </div>
              {(search || selectedCategory !== "all" || selectedType !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                    setSelectedType("all");
                  }}
                  className="text-xs"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            questions.map((q) => {
              const isSelected = selectedIds.has(q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => toggleSelect(q.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                    isSelected
                      ? "bg-primary/10 border-primary shadow-sm"
                      : "bg-card border-border hover:border-border/80 hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border bg-muted"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border font-semibold ${getTypeBadgeVariant(
                          q.type
                        )}`}
                      >
                        {q.type.replace("_", " ")}
                      </span>

                      {q.categoryName ? (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-semibold text-white shadow-sm flex items-center gap-1"
                          style={{ backgroundColor: q.categoryColor || "#6366f1" }}
                        >
                          <Folder className="w-2.5 h-2.5" />
                          {q.categoryName}
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                          Uncategorized
                        </span>
                      )}

                      <span className="text-[11px] text-muted-foreground font-mono">
                        {q.points} {Number(q.points) === 1 ? "pt" : "pts"}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-foreground leading-snug">
                      {q.prompt}
                    </p>

                    {/* Options Preview for Multiple Choice */}
                    {q.type === "multiple_choice" && q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {q.options.map((opt: string, idx: number) => {
                          const isKey = q.answers?.includes(opt);
                          return (
                            <div
                              key={idx}
                              className={`text-xs px-2.5 py-1 rounded border flex items-center gap-2 ${
                                isKey
                                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-semibold"
                                  : "bg-muted/40 border-border text-muted-foreground"
                              }`}
                            >
                              <span className="font-mono text-[10px] font-bold">
                                {String.fromCharCode(65 + idx)}.
                              </span>
                              <span className="truncate">{opt}</span>
                              {isKey && (
                                <span className="text-[9px] uppercase ml-auto text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                  Key
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Accepted answers for Identification */}
                    {q.type === "identification" && q.answers && q.answers.length > 0 && (
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                          Accepted:
                        </span>
                        {q.answers.map((ans: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-mono text-[11px]"
                          >
                            {ans}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    {q.tags && q.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {q.tags.map((t: string, i: number) => (
                          <span
                            key={i}
                            className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border flex items-center gap-1"
                          >
                            <Tag className="w-2.5 h-2.5 text-primary" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            {selectedIds.size} of {questions.length} questions selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={selectedIds.size === 0 || isPending}
              onClick={handleInsertSelected}
              className="font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Insert {selectedIds.size} Question{selectedIds.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
