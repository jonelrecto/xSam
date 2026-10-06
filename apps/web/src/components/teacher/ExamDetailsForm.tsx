import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { examDetailsSchema, type ExamDetailsInput } from "@xsam/shared";
import { teacherApi } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
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
  Lock,
} from "lucide-react";

export function ExamDetailsForm() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Quick Category Modal
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#6366f1");
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  useEffect(() => {
    teacherApi.getCategories().then((cats) => {
      if (cats && cats.length > 0) setCategories(cats);
    });
  }, []);

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
      restrictInput: false,
    },
  });

  const shuffleQuestions = watch("shuffleQuestions");
  const shuffleOptions = watch("shuffleOptions");
  const requireCamera = watch("requireCamera");
  const showScoreOnSubmit = watch("showScoreOnSubmit");
  const enforceFullscreen = watch("enforceFullscreen");
  const restrictInput = watch("restrictInput");
  const selectedCategoryId = watch("categoryId");

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
    setIsLoading(true);
    setServerError(null);

    try {
      const res = await teacherApi.createExam(data);
      if (res.ok && res.id) {
        navigate(`/teacher/exams/${res.id}/questions`);
      } else {
        setServerError("Failed to create exam");
      }
    } catch (err: any) {
      setServerError(err.message || "Failed to create exam");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto">
      {serverError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-sm text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* 1. Core Exam Identity */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Step 1: General Details</span>
          </div>
          <CardTitle className="text-xl text-card-foreground">Examination Identity</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Specify the title, subject category, and high-level description for this exam.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="title" required>
              Exam Title
            </Label>
            <Input
              id="title"
              placeholder="e.g., Midterm Assessment in Advanced Biology"
              {...register("title")}
              error={errors.title?.message}
            />
          </div>

          <div>
            <Label htmlFor="description">Instructions & Description</Label>
            <textarea
              id="description"
              rows={3}
              placeholder="Provide context, permitted resources, or special rules for test-takers..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              {...register("description")}
            />
            {errors.description?.message && (
              <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Category Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="categoryId">Subject / Category</Label>
              <button
                type="button"
                onClick={() => setIsNewCategoryModalOpen(true)}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3 h-3" /> New Category
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setValue("categoryId", "")}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                  !selectedCategoryId
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
                }`}
              >
                No Category
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setValue("categoryId", cat.id)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all truncate ${
                    selectedCategoryId === cat.id
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
                  }`}
                  style={{
                    borderColor: selectedCategoryId === cat.id ? cat.color : undefined,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block mr-1.5"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Timing & Availability */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Step 2: Time Limits & Availability</span>
          </div>
          <CardTitle className="text-xl text-card-foreground">Scheduling & Duration</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Configure student time limits and scheduled exam availability windows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="durationMinutes" required>
                Duration (Minutes)
              </Label>
              <Input
                id="durationMinutes"
                type="number"
                min={5}
                max={480}
                placeholder="60"
                {...register("durationMinutes", { valueAsNumber: true })}
                error={errors.durationMinutes?.message}
              />
            </div>

            <div>
              <Label htmlFor="passingPercent">Passing Score (%)</Label>
              <div className="relative">
                <Input
                  id="passingPercent"
                  type="number"
                  min={1}
                  max={100}
                  placeholder="60"
                  {...register("passingPercent", { valueAsNumber: true })}
                  error={errors.passingPercent?.message}
                />
                <Percent className="w-4 h-4 text-muted-foreground absolute right-3 top-3" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <Label htmlFor="scheduledStart">Scheduled Start (Optional)</Label>
              <Input
                id="scheduledStart"
                type="datetime-local"
                {...register("scheduledStart")}
                error={errors.scheduledStart?.message}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Students cannot take the exam before this timestamp.
              </p>
            </div>

            <div>
              <Label htmlFor="scheduledEnd" required>
                Closing Deadline
              </Label>
              <Input
                id="scheduledEnd"
                type="datetime-local"
                {...register("scheduledEnd")}
                error={errors.scheduledEnd?.message}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Exam closes automatically after this deadline.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Security & Proctoring Controls */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>Step 3: Security & Proctoring</span>
          </div>
          <CardTitle className="text-xl text-card-foreground">Integrity Policies</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Configure student experience constraints, anti-cheating measures, and score visibility.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all">
              <input
                type="checkbox"
                className="mt-1 rounded border-input bg-background text-primary focus:ring-ring"
                checked={shuffleQuestions}
                onChange={(e) => setValue("shuffleQuestions", e.target.checked)}
              />
              <div>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Shuffle className="w-3.5 h-3.5 text-primary" />
                  Shuffle Question Order
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Randomize question sequences uniquely for each student attempt.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all">
              <input
                type="checkbox"
                className="mt-1 rounded border-input bg-background text-primary focus:ring-ring"
                checked={shuffleOptions}
                onChange={(e) => setValue("shuffleOptions", e.target.checked)}
              />
              <div>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Shuffle className="w-3.5 h-3.5 text-primary" />
                  Shuffle Multiple Choice Options
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permute choices for multiple choice items unless anchored.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all">
              <input
                type="checkbox"
                className="mt-1 rounded border-input bg-background text-primary focus:ring-ring"
                checked={enforceFullscreen}
                onChange={(e) => setValue("enforceFullscreen", e.target.checked)}
              />
              <div>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Enforce Fullscreen Mode
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Require fullscreen test runner and log 10s exit countdown warnings.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all">
              <input
                type="checkbox"
                className="mt-1 rounded border-input bg-background text-primary focus:ring-ring"
                checked={requireCamera}
                onChange={(e) => setValue("requireCamera", e.target.checked)}
              />
              <div>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Require Webcam Proctoring
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Require camera permissions and periodic proctoring validation.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all">
              <input
                type="checkbox"
                className="mt-1 rounded border-input bg-background text-primary focus:ring-ring"
                checked={restrictInput}
                onChange={(e) => setValue("restrictInput", e.target.checked)}
              />
              <div>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-destructive" />
                  Restrict Input & Clipboard
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Block copy/cut/paste, right-click menu, and inspect shortcuts.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all">
              <input
                type="checkbox"
                className="mt-1 rounded border-input bg-background text-primary focus:ring-ring"
                checked={showScoreOnSubmit}
                onChange={(e) => setValue("showScoreOnSubmit", e.target.checked)}
              />
              <div>
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Instant Score Feedback
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Show auto-graded score immediately upon exam submission.
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/teacher")}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          className="font-bold px-8 shadow-md"
          isLoading={isLoading}
        >
          Proceed to Draft Studio <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Quick Category Modal */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="max-w-md w-full border-border bg-card p-6 space-y-4 shadow-2xl">
            <CardTitle className="text-lg text-card-foreground">Create Category</CardTitle>
            <div className="space-y-3">
              <div>
                <Label required>Category Name</Label>
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Science, Mathematics"
                />
              </div>
              <div>
                <Label>Badge Color</Label>
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-full h-10 rounded-lg cursor-pointer bg-background border border-input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsNewCategoryModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCreateCategory}
                isLoading={isCreatingCat}
              >
                Save Category
              </Button>
            </div>
          </Card>
        </div>
      )}
    </form>
  );
}
