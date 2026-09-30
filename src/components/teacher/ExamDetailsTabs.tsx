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
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "overview"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
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
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
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
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
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
            <Card className="border-slate-800 bg-slate-900/80 md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-base text-white">Exam Parameters</CardTitle>
                    <ExamStatusBadge status={displayStatus} />
                  </div>
                  <CardDescription>{exam.description || "No description provided."}</CardDescription>
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
                          ? "border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/40"
                          : "border-amber-500/50 text-amber-300 hover:bg-amber-950/40"
                      }`}
                    >
                      {exam.status === "postponed" ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                          Resume Exam
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5 mr-1 text-amber-400" />
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
                      className="text-xs border-slate-700 hover:border-indigo-500"
                    >
                      <Settings className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                      Edit Settings
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Duration</span>
                    <span className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      {exam.durationMinutes} Mins
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Questions</span>
                    <span className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <FileQuestion className="w-4 h-4 text-cyan-400" />
                      {qCount} Items
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Pass Benchmark</span>
                    <span className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5 font-mono">
                      <Percent className="w-3.5 h-3.5 text-emerald-400" />
                      {exam.passingPercent}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Category</span>
                    <span className="text-xs font-bold text-white block mt-1 truncate">
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
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    Availability Window
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-500 block">Opens:</span>
                      <span>
                        {exam.scheduledStart
                          ? new Date(exam.scheduledStart).toLocaleString()
                          : "Available immediately upon publish"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Closes:</span>
                      <span>
                        {exam.scheduledEnd
                          ? new Date(exam.scheduledEnd).toLocaleString()
                          : "No end date set (Open indefinitely)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assigned Classes Roster */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-400" />
                      Assigned Class Rosters ({assignedClasses.length})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAssignClassesOpen(true)}
                      className="text-[11px] h-6 text-indigo-400 hover:text-white"
                    >
                      Assign / Change Classes
                    </Button>
                  </div>
                  {assignedClasses.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No class assigned. The exam operates as an open access code exam.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {assignedClasses.map((c) => (
                        <span
                          key={c.id}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                          {c.name} {c.section ? `(${c.section})` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Anti-Cheating & Security Invariants */}
            <Card className="border-slate-800 bg-slate-900/80">
              <CardHeader>
                <CardTitle className="text-base text-white">Security Controls</CardTitle>
                <CardDescription>Integrity monitoring switches</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Shuffle Questions:</span>
                  <span className="font-bold text-white">
                    {exam.shuffleQuestions ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Shuffle Options:</span>
                  <span className="font-bold text-white">
                    {exam.shuffleOptions ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Fullscreen Gate:</span>
                  <span className="font-bold text-white">
                    {exam.enforceFullscreen ? "Enabled (10s)" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Webcam Monitor:</span>
                  <span className="font-bold text-white">
                    {exam.requireCamera ? "Required" : "Optional"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Score Display:</span>
                  <span className="font-bold text-white">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveSettings}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Settings className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Edit Exam Configuration</h3>
            </div>

            {settingsError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
                {settingsError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Exam Title *</label>
                <Input
                  type="text"
                  value={settingsTitle}
                  onChange={(e) => setSettingsTitle(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={settingsDescription}
                  onChange={(e) => setSettingsDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Duration (Minutes) *
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    value={settingsDuration}
                    onChange={(e) => setSettingsDuration(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Passing Score (%) *
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={settingsPassingPercent}
                    onChange={(e) => setSettingsPassingPercent(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Category</label>
                <select
                  value={settingsCategoryId}
                  onChange={(e) => setSettingsCategoryId(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-300"
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
                  <label className="font-semibold text-slate-300 block mb-1">Start Time (Optional)</label>
                  <Input
                    type="datetime-local"
                    value={settingsStart}
                    onChange={(e) => setSettingsStart(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Closing Date & Time <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={settingsEnd}
                    onChange={(e) => setSettingsEnd(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Security Toggles */}
              <div className="pt-2 border-t border-slate-800 space-y-2.5">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                  Security & Experience Controls:
                </span>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsShuffleQ}
                    onChange={(e) => setSettingsShuffleQ(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                  />
                  <div>
                    <span className="font-medium text-slate-200 block">Shuffle question order</span>
                    <span className="text-[10px] text-slate-400">Randomize question order per student</span>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsShuffleOpt}
                    onChange={(e) => setSettingsShuffleOpt(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                  />
                  <div>
                    <span className="font-medium text-slate-200 block">Shuffle options</span>
                    <span className="text-[10px] text-slate-400">Randomize multiple choice options</span>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsFullscreen}
                    onChange={(e) => setSettingsFullscreen(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                  />
                  <div>
                    <span className="font-medium text-slate-200 block">Enforce fullscreen gate</span>
                    <span className="text-[10px] text-slate-400">10s exit countdown before obscuring test runner</span>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsCamera}
                    onChange={(e) => setSettingsCamera(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                  />
                  <div>
                    <span className="font-medium text-slate-200 block">Require webcam proctoring check</span>
                    <span className="text-[10px] text-slate-400">Requires camera permission & live validation</span>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsShowScore}
                    onChange={(e) => setSettingsShowScore(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-indigo-600"
                  />
                  <div>
                    <span className="font-medium text-slate-200 block">Show score on submit</span>
                    <span className="text-[10px] text-slate-400">Displays score immediately upon completion</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
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
                className="bg-indigo-600 text-white font-semibold"
              >
                {isSavingSettings ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Classes Modal */}
      {isAssignClassesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Assign Exam to Classes</h3>
            </div>

            <p className="text-xs text-slate-400">
              Select classes to link to this exam. This allows roster tracking and automatic calculations of students who have not taken the exam.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {allClasses.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No classes created yet. Create a class in the Classes menu first.
                </div>
              ) : (
                allClasses.map((cls) => {
                  const isChecked = selectedClassIds.includes(cls.id);
                  return (
                    <label
                      key={cls.id}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between cursor-pointer hover:border-slate-700 text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">{cls.name}</span>
                        <span className="text-[11px] text-slate-400">
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
                        className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                      />
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
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
                className="bg-indigo-600 text-white font-semibold"
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
