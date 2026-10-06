"use client";

import React, { useEffect, useState, useTransition } from "react";
import { getBankQuestions, getQuestionsForDraft } from "@/app/actions/bank";
import { getCategoriesAction } from "@/app/actions/exam";
import { useDraftStore } from "@/hooks/use-draft-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Search,
  Filter,
  Check,
  Plus,
  X,
  Sparkles,
  Tag,
  Clock,
} from "lucide-react";

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

  const fetchBank = () => {
    startTransition(async () => {
      const [bankData, cats] = await Promise.all([
        getBankQuestions({
          categoryId: selectedCategory === "all" ? undefined : selectedCategory,
          type: selectedType === "all" ? undefined : selectedType,
          search,
        }),
        getCategoriesAction(),
      ]);
      setQuestions(bankData);
      setCategories(cats);
    });
  };

  useEffect(() => {
    if (isOpen) {
      fetchBank();
      setSelectedIds(new Set());
    }
  }, [isOpen, selectedCategory, selectedType]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInsertSelected = async () => {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      const draftQuestions = await getQuestionsForDraft(Array.from(selectedIds));
      load(draftQuestions, "append");
      onClose();
    });
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
              <h3 className="text-lg font-bold text-card-foreground">Question Bank Repository</h3>
              <p className="text-xs text-muted-foreground">
                Select questions from your library to insert into this exam draft
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
        <div className="p-4 border-b border-border bg-muted/20 grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              type="text"
              placeholder="Search questions by keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchBank()}
              className="pl-9 h-9 text-xs bg-background border-input"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Subject Categories</option>
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

        {/* Question List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
          {isPending ? (
            <div className="py-16 text-center text-muted-foreground animate-pulse text-sm">
              Loading question bank items...
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No bank questions found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Questions are automatically synchronized to your bank when exams are published.
              </p>
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

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default" className="text-[10px] uppercase font-mono">
                        {q.type.replace("_", " ")}
                      </Badge>
                      {q.categoryName && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-semibold text-white"
                          style={{ backgroundColor: q.categoryColor || "#6366f1" }}
                        >
                          {q.categoryName}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {q.points} {Number(q.points) === 1 ? "pt" : "pts"}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {q.prompt}
                    </p>

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
          <span className="text-xs text-muted-foreground">
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
              className="font-semibold gap-1.5"
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
