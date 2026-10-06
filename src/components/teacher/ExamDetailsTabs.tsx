"use client";

import React, { useState } from "react";
import Link from "next/link";
import { updateExamSettings, togglePostponeExam } from "@/app/actions/exam";
import { assignExamClassesAction } from "@/app/actions/classes";
import { computeExamDisplayStatus } from "@/lib/exam/lifecycle";
import { ExamStatusBadge } from "./ExamStatusBadge";
import { ExamResultsTable } from "./ExamResultsTable";
import { PostExamDashboard } from "./PostExamDashboard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Edit3,
  Settings,
  Clock,
  FileQuestion,
  Calendar,
  Layers,
  GraduationCap,
  Percent,
  CheckCircle2,
  Lock,
  Plus,
  BarChart3,
  Users,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
} from "lucide-react";

interface ExamDetailsTabsProps {
  exam: any;
  qCount: number;
  isEditable: boolean;
  sessionCount: number;
  results: any[];
  analytics: any;
  categories: any[];
  assignedClasses: any[];
  allClasses: any[];
}

export function ExamDetailsTabs({
  exam,
  qCount,
  isEditable,
  sessionCount,
  results,
  analytics,
  categories,
  assignedClasses,
  allClasses,
}: ExamDetailsTabsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "results" | "analytics">("overview");

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState(exam.title);
  const [settingsDescription, setSettingsDescription] = useState(exam.description || "");
  const [settingsDuration, setSettingsDuration] = useState(exam.durationMinutes);
  const [settingsPassingPercent, setSettingsPassingPercent] = useState(exam.passingPercent || 60);
  const [settingsCategoryId, setSettingsCategoryId] = useState(exam.categoryId || "");
  const [settingsStart, setSettingsStart] = useState(
    exam.scheduledStart ? new Date(exam.scheduledStart).toISOString().slice(0, 16) : ""
  );
  const [settingsEnd, setSettingsEnd] = useState(
    exam.scheduledEnd ? new Date(exam.scheduledEnd).toISOString().slice(0, 16) : ""
  );
  const [settingsShuffleQ, setSettingsShuffleQ] = useState(exam.shuffleQuestions);
  const [settingsShuffleOpt, setSettingsShuffleOpt] = useState(exam.shuffleOptions);
  const [settingsFullscreen, setSettingsFullscreen] = useState(exam.enforceFullscreen);
  const [settingsCamera, setSettingsCamera] = useState(exam.requireCamera);
  const [settingsShowScore, setSettingsShowScore] = useState(exam.showScoreOnSubmit);
  const [settingsError, setSettingsError] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Classes Assignment State
  const [isAssignClassesOpen, setIsAssignClassesOpen] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    assignedClasses.map((c) => c.id)
  );

  const [isPostponing, setIsPostponing] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError("");

    if (!settingsEnd) {
      setSettingsError("Closing date and time is required.");
      return;
    }

    setIsSavingSettings(true);

    const res = await updateExamSettings(exam.id, {
      title: settingsTitle,
      description: settingsDescription,
      durationMinutes: Number(settingsDuration),
      passingPercent: Number(settingsPassingPercent),
      categoryId: settingsCategoryId || null,
      scheduledStart: settingsStart ? new Date(settingsStart).toISOString() : null,
      scheduledEnd: new Date(settingsEnd).toISOString(),
      shuffleQuestions: settingsShuffleQ,
      shuffleOptions: settingsShuffleOpt,
      enforceFullscreen: settingsFullscreen,
      requireCamera: settingsCamera,
      showScoreOnSubmit: settingsShowScore,
    });

    setIsSavingSettings(false);

    if (res.ok) {
      setIsSettingsOpen(false);
      window.location.reload();
    } else {
      setSettingsError(res.error || "Failed to update exam settings.");
    }
  };

  const handleTogglePostpone = async () => {
    setIsPostponing(true);
    const willPostpone = exam.status !== "postponed";
    const res = await togglePostponeExam(exam.id, willPostpone);
    setIsPostponing(false);
    if (res.ok) {
      window.location.reload();
    } else {
      alert(res.error || "Failed to update postpone status.");
    }
  };

  const handleSaveAssignedClasses = async () => {
    const res = await assignExamClassesAction(exam.id, selectedClassIds);
    if (res.ok) {
      setIsAssignClassesOpen(false);
      window.location.reload();
    }
  };

  const isPublished = exam.status === "published";
  const matchedCategory = categories.find((c) => c.id === exam.categoryId);
  const ungradedCount = results.filter((r) => !r.fullyGraded).length;
  const displayStatus = computeExamDisplayStatus({
    status: exam.status,
    scheduledStart: exam.scheduledStart,
    scheduledEnd: exam.scheduledEnd,
    totalSessions: sessionCount,
    submittedSessions: results.length,
    ungradedSessions: ungradedCount,
  });

  return (
    <div className="space-y-6">
      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "overview"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Settings className="w-4 h-4" />
          Overview & Configuration
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("results")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "results"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Users className="w-4 h-4" />
          Results & Grades ({results.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "analytics"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Post-Exam Analytics
        </button>
      </div>

      {/* Tab 1: Overview & Configuration */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Exam Parameters */}
            <Card className="border-border bg-card md:col-span-2 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-base text-card-foreground">Exam Parameters</CardTitle>
                    <ExamStatusBadge status={displayStatus} />
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">{exam.description || "No description provided."}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {exam.status !== "draft" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTogglePostpone}
                      disabled={isPostponing}
                      className={`text-xs ${
                        exam.status === "postponed"
                          ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                          : "border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                      }`}
                    >
                      {exam.status === "postponed" ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                          Resume Exam
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                          Postpone Exam
                        </>
                      )}
                    </Button>
                  )}
                  {isEditable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSettingsOpen(true)}
                      className="text-xs"
                    >
                      <Settings className="w-3.5 h-3.5 mr-1 text-primary" />
                      Edit Settings
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Duration</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-4 h-4 text-primary" />
                      {exam.durationMinutes} Mins
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Questions</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                      <FileQuestion className="w-4 h-4 text-primary" />
                      {qCount} Items
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Pass Benchmark</span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5 font-mono">
                      <Percent className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {exam.passingPercent}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Category</span>
                    <span className="text-xs font-bold text-foreground block mt-1 truncate">
                      {matchedCategory ? (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] text-white"
                          style={{ backgroundColor: matchedCategory.color }}
                        >
                          {matchedCategory.name}
                        </span>
                      ) : (
                        "General"
                      )}
                    </span>
                  </div>
                </div>

                {/* Schedule Window */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-primary" />
                    Availability Window
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground">
                    <div>
                      <span className="text-muted-foreground block">Opens:</span>
                      <span>
                        {exam.scheduledStart
                          ? new Date(exam.scheduledStart).toLocaleString()
                          : "Available immediately upon publish"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Closes:</span>
                      <span>
                        {exam.scheduledEnd
                          ? new Date(exam.scheduledEnd).toLocaleString()
                          : "No end date set (Open indefinitely)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assigned Classes Roster */}
                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      Assigned Class Rosters ({assignedClasses.length})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAssignClassesOpen(true)}
                      className="text-[11px] h-6 text-primary hover:text-primary/80"
                    >
                      Assign / Change Classes
                    </Button>
                  </div>
                  {assignedClasses.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No class assigned. The exam operates as an open access code exam.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {assignedClasses.map((c) => (
                        <span
                          key={c.id}
                          className="px-2.5 py-1 rounded-lg bg-muted border border-border text-foreground text-xs font-semibold flex items-center gap-1.5"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-primary" />
                          {c.name} {c.section ? `(${c.section})` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Anti-Cheating & Security Invariants */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-base text-card-foreground">Security Controls</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Integrity monitoring switches</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs pt-4">
                <div className="flex items-center justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Shuffle Questions:</span>
                  <span className="font-bold text-foreground">
                    {exam.shuffleQuestions ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Shuffle Options:</span>
                  <span className="font-bold text-foreground">
                    {exam.shuffleOptions ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Fullscreen Gate:</span>
                  <span className="font-bold text-foreground">
                    {exam.enforceFullscreen ? "Enabled (10s)" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Webcam Monitor:</span>
                  <span className="font-bold text-foreground">
                    {exam.requireCamera ? "Required" : "Optional"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Score Display:</span>
                  <span className="font-bold text-foreground">
                    {exam.showScoreOnSubmit ? "Immediate" : "Teacher Released"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Results & Grades */}
      {activeTab === "results" && (
        <ExamResultsTable examId={exam.id} results={results} />
      )}

      {/* Tab 3: Post-Exam Analytics Dashboard */}
      {activeTab === "analytics" && (
        <PostExamDashboard data={analytics} />
      )}

      {/* Edit Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveSettings}
            className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Settings className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-card-foreground">Edit Exam Configuration</h3>
            </div>

            {settingsError && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-medium">
                {settingsError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Exam Title *</label>
                <Input
                  type="text"
                  value={settingsTitle}
                  onChange={(e) => setSettingsTitle(e.target.value)}
                  className="bg-background border-input text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={settingsDescription}
                  onChange={(e) => setSettingsDescription(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Duration (Minutes) *
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    value={settingsDuration}
                    onChange={(e) => setSettingsDuration(Number(e.target.value))}
                    className="bg-background border-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Passing Score (%) *
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={settingsPassingPercent}
                    onChange={(e) => setSettingsPassingPercent(Number(e.target.value))}
                    className="bg-background border-input text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Category</label>
                <select
                  value={settingsCategoryId}
                  onChange={(e) => setSettingsCategoryId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">No Category (General)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Start Time (Optional)</label>
                  <Input
                    type="datetime-local"
                    value={settingsStart}
                    onChange={(e) => setSettingsStart(e.target.value)}
                    className="bg-background border-input text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Closing Date & Time <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={settingsEnd}
                    onChange={(e) => setSettingsEnd(e.target.value)}
                    className="bg-background border-input text-xs"
                    required
                  />
                </div>
              </div>

              {/* Security Toggles */}
              <div className="pt-2 border-t border-border space-y-2.5">
                <span className="font-bold text-muted-foreground uppercase tracking-wider block text-[10px]">
                  Security & Experience Controls:
                </span>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsShuffleQ}
                    onChange={(e) => setSettingsShuffleQ(e.target.checked)}
                    className="rounded bg-background border-input text-primary focus:ring-ring"
                  />
                  <div>
                    <span className="font-medium text-foreground block">Shuffle question order</span>
                    <span className="text-[10px] text-muted-foreground">Randomize question order per student</span>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsShuffleOpt}
                    onChange={(e) => setSettingsShuffleOpt(e.target.checked)}
                    className="rounded bg-background border-input text-primary focus:ring-ring"
                  />
                  <div>
                    <span className="font-medium text-foreground block">Shuffle options</span>
                    <span className="text-[10px] text-muted-foreground">Randomize multiple choice options</span>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsFullscreen}
                    onChange={(e) => setSettingsFullscreen(e.target.checked)}
                    className="rounded bg-background border-input text-primary focus:ring-ring"
                  />
                  <div>
                    <span className="font-medium text-foreground block">Enforce fullscreen gate</span>
                    <span className="text-[10px] text-muted-foreground">10s exit countdown before obscuring test runner</span>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsCamera}
                    onChange={(e) => setSettingsCamera(e.target.checked)}
                    className="rounded bg-background border-input text-primary focus:ring-ring"
                  />
                  <div>
                    <span className="font-medium text-foreground block">Require webcam proctoring check</span>
                    <span className="text-[10px] text-muted-foreground">Requires camera permission & live validation</span>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsShowScore}
                    onChange={(e) => setSettingsShowScore(e.target.checked)}
                    className="rounded bg-background border-input text-primary focus:ring-ring"
                  />
                  <div>
                    <span className="font-medium text-foreground block">Show score on submit</span>
                    <span className="text-[10px] text-muted-foreground">Displays score immediately upon completion</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSettingsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingSettings}
                className="font-semibold"
              >
                {isSavingSettings ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Classes Modal */}
      {isAssignClassesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-card-foreground">Assign Exam to Classes</h3>
            </div>

            <p className="text-xs text-muted-foreground">
              Select classes to link to this exam. This allows roster tracking and automatic calculations of students who have not taken the exam.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {allClasses.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No classes created yet. Create a class in the Classes menu first.
                </div>
              ) : (
                allClasses.map((cls) => {
                  const isChecked = selectedClassIds.includes(cls.id);
                  return (
                    <label
                      key={cls.id}
                      className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between cursor-pointer hover:border-border/80 text-xs"
                    >
                      <div>
                        <span className="font-bold text-foreground block">{cls.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {cls.section ? `Section ${cls.section}` : cls.subject || "Class"}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClassIds([...selectedClassIds, cls.id]);
                          } else {
                            setSelectedClassIds(selectedClassIds.filter((id) => id !== cls.id));
                          }
                        }}
                        className="rounded bg-background border-input text-primary focus:ring-ring"
                      />
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAssignClassesOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveAssignedClasses}
                className="font-semibold"
              >
                Save Assigned Classes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
