import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { teacherApi } from "../../lib/api";
import { computeExamDisplayStatus } from "@xsam/shared";
import { ExamStatusBadge } from "./ExamStatusBadge";
import { ExamResultsTable } from "./ExamResultsTable";
import { PostExamDashboard } from "./PostExamDashboard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Settings,
  Clock,
  FileQuestion,
  Calendar,
  GraduationCap,
  Percent,
  BarChart3,
  Users,
  Trash2,
  Lock,
  AlertCircle,
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
  onRefresh?: () => void;
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
  onRefresh,
}: ExamDetailsTabsProps) {
  const navigate = useNavigate();
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
  const [settingsRestrictInput, setSettingsRestrictInput] = useState(exam.restrictInput ?? false);
  const [settingsShowScore, setSettingsShowScore] = useState(exam.showScoreOnSubmit);
  const [settingsError, setSettingsError] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Delete Exam State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteExam = async () => {
    setIsDeleting(true);
    setDeleteError("");
    try {
      const res = await teacherApi.deleteExam(exam.id);
      if (res.ok) {
        setIsDeleteModalOpen(false);
        navigate("/teacher");
      } else {
        setDeleteError("Failed to delete exam.");
      }
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete exam.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Classes Assignment State
  const [isAssignClassesOpen, setIsAssignClassesOpen] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    assignedClasses.map((c) => c.id)
  );

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError("");

    if (!settingsEnd) {
      setSettingsError("Closing date and time is required.");
      return;
    }

    setIsSavingSettings(true);

    try {
      const res = await teacherApi.updateExamDetails(exam.id, {
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
        restrictInput: settingsRestrictInput,
        showScoreOnSubmit: settingsShowScore,
      });

      if (res.ok) {
        setIsSettingsOpen(false);
        if (onRefresh) onRefresh();
        else window.location.reload();
      }
    } catch (err: any) {
      setSettingsError(err?.message || "Failed to update exam settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveAssignedClasses = async () => {
    try {
      const res = await teacherApi.assignClasses(exam.id, selectedClassIds);
      if (res.ok) {
        setIsAssignClassesOpen(false);
        if (onRefresh) onRefresh();
        else window.location.reload();
      }
    } catch (err) {
      console.error("Failed to assign classes:", err);
    }
  };

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
                  {sessionCount === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete Exam
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
                <div className="flex items-center justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Restrict Input:</span>
                  <span className="font-bold text-foreground">
                    {exam.restrictInput ? "Restricted (Lockdown)" : "Allowed"}
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
                    checked={settingsRestrictInput}
                    onChange={(e) => setSettingsRestrictInput(e.target.checked)}
                    className="rounded bg-background border-input text-primary focus:ring-ring"
                  />
                  <div>
                    <span className="font-medium text-foreground block">Restrict input & clipboard</span>
                    <span className="text-[10px] text-muted-foreground">Blocks copy/cut/paste, right-click menu, and inspect shortcuts</span>
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

      {/* Delete Exam Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-card-foreground">Delete Examination</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-foreground">"{exam.title}"</strong>? All questions, settings, and configuration will be permanently removed.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteExam}
                disabled={isDeleting}
                className="font-semibold"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete Exam"}
              </Button>
            </div>
          </div>
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
              Select classes to link to this exam.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {allClasses.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No classes created yet.
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
