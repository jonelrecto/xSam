"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  getBankQuestions,
  deleteBankQuestion,
  createBankQuestion,
} from "@/app/actions/bank";
import {
  getCategoriesAction,
  createCategoryAction,
} from "@/app/actions/exam";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Tag,
  FolderPlus,
  ArrowLeft,
  Filter,
  CheckCircle2,
  X,
} from "lucide-react";

export default function QuestionBankPage() {
  const [isPending, startTransition] = useTransition();
  const [questions, setQuestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#6366f1");

  const loadData = () => {
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
    loadData();
  }, [selectedCategory, selectedType]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this question from your bank?")) {
      await deleteBankQuestion(id);
      loadData();
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const res = await createCategoryAction(newCatName, newCatColor);
    if (res.ok) {
      setNewCatName("");
      setIsNewCategoryModalOpen(false);
      loadData();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/teacher" className="text-muted-foreground hover:text-foreground p-1 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
              <BookOpen className="w-7 h-7 text-primary" />
              Teacher Question Bank
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Reusable repository of verified questions and subject categories
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewCategoryModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-primary" />
            + New Category
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              type="text"
              placeholder="Search bank questions by keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
              className="pl-9 h-9 text-xs bg-background border-input"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
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
        </CardContent>
      </Card>

      {/* Bank Questions Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {questions.length} repository items</span>
        </div>

        {isPending ? (
          <div className="py-20 text-center text-muted-foreground animate-pulse">
            Loading Question Bank items...
          </div>
        ) : questions.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-muted/20 space-y-3">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
            <h3 className="text-base font-bold text-foreground">Your Question Bank is Empty</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              When you publish exams with confirmed questions, they are automatically saved into your personal Question Bank for future reuse.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questions.map((q) => (
              <Card
                key={q.id}
                className="border-border bg-card hover:border-border/80 transition-all flex flex-col justify-between shadow-sm"
              >
                <CardHeader className="p-4 pb-2 border-b border-border flex flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px] uppercase font-mono">
                      {q.type.replace("_", " ")}
                    </Badge>
                    {q.categoryName && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-bold text-white shadow-sm"
                        style={{ backgroundColor: q.categoryColor || "#6366f1" }}
                      >
                        {q.categoryName}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(q.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete from bank"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardHeader>

                <CardContent className="p-4 space-y-3 flex-1">
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {q.prompt}
                  </p>

                  {q.options && q.options.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {q.options.map((opt: string, idx: number) => {
                        const isKey = q.answers?.includes(opt);
                        return (
                          <div
                            key={idx}
                            className={`text-xs px-2.5 py-1 rounded border flex items-center gap-2 ${
                              isKey
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-semibold"
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

                  {q.type === "identification" && q.answers?.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                        Accepted Keys:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {q.answers.map((ans: string, i: number) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-mono text-[11px] font-semibold"
                          >
                            {ans}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.tags && q.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t border-border">
                      {q.tags.map((t: string, i: number) => (
                        <span
                          key={i}
                          className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border flex items-center gap-1 font-medium"
                        >
                          <Tag className="w-2.5 h-2.5 text-primary" />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Category Modal */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateCategory}
            className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-fade-in"
          >
            <h3 className="text-base font-bold text-card-foreground">Create Subject Category</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Category Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Mathematics, General Science"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="bg-background border-input text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{newCatColor}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewCategoryModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-semibold">
                Save Category
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
