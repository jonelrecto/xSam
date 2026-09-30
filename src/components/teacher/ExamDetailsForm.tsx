"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { examDetailsSchema, type ExamDetailsInput } from "@/lib/schemas/exam";
import { createExam, createCategoryAction, getCategoriesAction } from "@/app/actions/exam";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Clock,
  Shuffle,
  Shield,
  Camera,
  Award,
  AlertCircle,
  Plus,
  Layers,
  Percent,
} from "lucide-react";

interface ExamDetailsFormProps {
  initialCategories?: any[];
}

export function ExamDetailsForm({ initialCategories = [] }: ExamDetailsFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Quick Category Modal State
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#6366f1");
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Fallback load categories on mount if empty
  useEffect(() => {
    if (categories.length === 0) {
      getCategoriesAction().then((cats) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
      });
    }
  }, [categories.length]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExamDetailsInput>({
    resolver: zodResolver(examDetailsSchema),
    defaultValues: {
      title: "",
      description: "",
      durationMinutes: 60,
      passingPercent: 60,
      categoryId: "",
      scheduledStart: "",
      scheduledEnd: "",
      shuffleQuestions: true,
      shuffleOptions: true,
      requireCamera: false,
      showScoreOnSubmit: false,
      enforceFullscreen: true,
    },
  });

  const shuffleQuestions = watch("shuffleQuestions");
  const shuffleOptions = watch("shuffleOptions");
  const requireCamera = watch("requireCamera");
  const showScoreOnSubmit = watch("showScoreOnSubmit");
  const enforceFullscreen = watch("enforceFullscreen");
  const selectedCategoryId = watch("categoryId");

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsCreatingCat(true);

    try {
      const res = await createCategoryAction(newCatName.trim(), newCatColor);
      if (res.ok && res.category) {
        setCategories((prev) => [...prev, res.category]);
        setValue("categoryId", res.category.id);
        setIsNewCategoryModalOpen(false);
        setNewCatName("");
        setNewCatColor("#6366f1");
      }
    } finally {
      setIsCreatingCat(false);
    }
  };

  const onSubmit = async (data: ExamDetailsInput) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const payload = {
        ...data,
        categoryId: data.categoryId || null,
        scheduledStart: data.scheduledStart ? new Date(data.scheduledStart).toISOString() : null,
        scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd).toISOString() : null,
      };

      const res = await createExam(payload);
      if (!res.ok) {
        setServerError(res.error || "Failed to create exam.");
        setIsLoading(false);
        return;
      }

      router.push(`/teacher/exams/${res.id}/questions`);
    } catch (err: any) {
      setServerError(err?.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  const currentCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <>
      <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl text-white">Step 1: Exam Configuration</CardTitle>
          <CardDescription>
            Set up the basic exam parameters, subject category, time limits, and anti-cheating controls.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {serverError && (
            <div className="mb-6 p-3 rounded-lg bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title & Description */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" required>
                  Exam Title
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Midterm Examination in Operating Systems"
                  error={errors.title?.message}
                  {...register("title")}
                />
              </div>

              {/* Category & Passing Score Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="categoryId" className="mb-0">
                      Subject Category
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsNewCategoryModalOpen(true)}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      New Category
                    </button>
                  </div>
                  <div className="relative">
                    <select
                      id="categoryId"
                      {...register("categoryId")}
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
                    >
                      <option value="">No Category (General)</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {currentCategory && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: currentCategory.color || "#6366f1" }}
                      />
                      <span className="text-[11px] text-slate-400">
                        Selected: <strong className="text-white">{currentCategory.name}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="passingPercent">Passing Benchmark (%)</Label>
                  <Input
                    id="passingPercent"
                    type="number"
                    min={1}
                    max={100}
                    error={errors.passingPercent?.message}
                    {...register("passingPercent", { valueAsNumber: true })}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Standard passing percentage for student results (default 60%).
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description & Instructions</Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Instructions for students (e.g. You have 60 minutes. Read each item carefully.)"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent placeholder:text-slate-500"
                  {...register("description")}
                />
                {errors.description?.message && (
                  <p className="mt-1 text-xs text-red-400 font-medium">
                    {errors.description.message}
                  </p>
                )}
              </div>
            </div>

            {/* Time & Schedule */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Duration & Schedule Window
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="durationMinutes" required>
                    Duration (Minutes)
                  </Label>
                  <Input
                    id="durationMinutes"
                    type="number"
                    min={5}
                    max={480}
                    error={errors.durationMinutes?.message}
                    {...register("durationMinutes", { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="scheduledStart">Scheduled Start (Optional)</Label>
                  <Input
                    id="scheduledStart"
                    type="datetime-local"
                    {...register("scheduledStart")}
                  />
                </div>

                <div>
                  <Label htmlFor="scheduledEnd" required>
                    Closes At (Scheduled End)
                  </Label>
                  <Input
                    id="scheduledEnd"
                    type="datetime-local"
                    error={errors.scheduledEnd?.message}
                    required
                    {...register("scheduledEnd")}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                <span className="text-amber-400 font-semibold">Note:</span> Setting a closing date and time is required. Students will not be able to start or submit the exam once closed.
              </p>
            </div>

            {/* Anti-Cheating & Integrity Options */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                Integrity & Exam Experience Settings
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-800/60 bg-slate-900/40 cursor-pointer hover:bg-slate-900/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setValue("shuffleQuestions", e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Shuffle Questions
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Randomize question order deterministically per student.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-800/60 bg-slate-900/40 cursor-pointer hover:bg-slate-900/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setValue("shuffleOptions", e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Shuffle Options
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Randomize multiple choice options (preserves position-locked keys).
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-800/60 bg-slate-900/40 cursor-pointer hover:bg-slate-900/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={enforceFullscreen}
                    onChange={(e) => setValue("enforceFullscreen", e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Enforce Fullscreen Gate
                    </span>
                    <span className="text-[11px] text-slate-400">
                      10s countdown upon fullscreen exit before obscuring test runner.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-800/60 bg-slate-900/40 cursor-pointer hover:bg-slate-900/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={requireCamera}
                    onChange={(e) => setValue("requireCamera", e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-indigo-400" />
                      Require Webcam Proctoring Check
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Requires student camera permission and performs pre-flight live webcam validation.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-800/60 bg-slate-900/40 cursor-pointer hover:bg-slate-900/80 transition-colors sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={showScoreOnSubmit}
                    onChange={(e) => setValue("showScoreOnSubmit", e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      Show Score On Submit
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Displays auto-graded score immediately upon exam completion.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                size="lg"
                className="font-semibold gap-2 shadow-lg shadow-indigo-600/20"
                isLoading={isLoading}
              >
                Continue to Questions Studio
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quick New Category Modal */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <form
            onSubmit={handleCreateCategory}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Create Subject Category</h3>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="newCatName" required>
                  Category Name
                </Label>
                <Input
                  id="newCatName"
                  type="text"
                  placeholder="e.g. Mathematics, Operating Systems"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs"
                  required
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="newCatColor">Badge Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="newCatColor"
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-slate-300">{newCatColor}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewCategoryModalOpen(false)}
                disabled={isCreatingCat}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 text-white font-semibold"
                isLoading={isCreatingCat}
              >
                Save Category
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

