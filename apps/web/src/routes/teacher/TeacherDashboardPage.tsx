import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teacherApi } from "../../lib/api";
import { useSession } from "../../lib/auth-client";
import { ExamStatusBadge } from "../../components/teacher/ExamStatusBadge";
import { Card, CardStat } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  PlusCircle,
  FileSpreadsheet,
  Activity,
  Edit3,
  Calendar,
  Users,
  Copy,
  Check,
  Search,
  Trash2,
  BarChart2,
  FileText,
  Clock,
  Settings,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function TeacherDashboardPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["teacher", "exams"],
    queryFn: teacherApi.getExams,
  });

  const deleteMutation = useMutation({
    mutationFn: (examId: string) => teacherApi.deleteExam(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", "exams"] });
      setDeleteTarget(null);
      setDeleteError(null);
    },
    onError: (err: any) => {
      setDeleteError(err?.message || "Failed to delete exam.");
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const draftExams = exams.filter((e) => e.displayStatus === "draft");
  const ongoingExams = exams.filter((e) => e.displayStatus === "ongoing");
  const publishedExams = exams.filter((e) => e.displayStatus === "published");
  const forCheckingExams = exams.filter((e) => e.displayStatus === "for_checking");
  const completedExams = exams.filter((e) => e.displayStatus === "completed");

  const filteredExams = exams.filter((exam) => {
    if (search && !exam.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filterTab === "draft") return exam.displayStatus === "draft";
    if (filterTab === "live") return exam.displayStatus === "ongoing" || exam.displayStatus === "published";
    if (filterTab === "checking") return exam.displayStatus === "for_checking";
    if (filterTab === "completed") return exam.displayStatus === "completed";
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-card to-card shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Teacher Studio
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Instructor Console
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Welcome, <strong className="text-foreground">{user?.name || "Teacher"}</strong>. Author exams, manage question drafts, grade student submissions, and monitor test sessions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/teacher/exams/new">
            <Button size="lg" className="font-semibold gap-2 shadow-md shadow-primary/20">
              <PlusCircle className="w-4 h-4" />
              Create New Exam
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CardStat
          title="Draft Exams"
          value={draftExams.length}
          caption="In-progress drafts"
          icon={FileSpreadsheet}
        />
        <CardStat
          title="Live & Scheduled"
          value={ongoingExams.length + publishedExams.length}
          change={ongoingExams.length > 0 ? `${ongoingExams.length} live` : undefined}
          trend={ongoingExams.length > 0 ? "up" : "neutral"}
          caption="Ongoing & published tests"
          icon={Activity}
        />
        <CardStat
          title="For Checking"
          value={forCheckingExams.length}
          caption="Pending manual grading"
          icon={Clock}
        />
        <CardStat
          title="Completed"
          value={completedExams.length}
          caption="Archived & finalized"
          icon={Users}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-muted/80 border border-border rounded-xl w-full sm:w-auto overflow-x-auto">
          {[
            { id: "all", label: `All (${exams.length})` },
            { id: "draft", label: `Drafts (${draftExams.length})` },
            { id: "live", label: `Live (${ongoingExams.length + publishedExams.length})` },
            { id: "checking", label: `Checking (${forCheckingExams.length})` },
            { id: "completed", label: `Completed (${completedExams.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterTab === tab.id
                  ? "bg-card text-card-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search exams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background border-input text-xs h-10"
          />
        </div>
      </div>

      {/* Exams Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          Loading instructor examinations...
        </div>
      ) : filteredExams.length === 0 ? (
        <Card className="border-border bg-card/60 text-center py-16 p-6">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-bold text-card-foreground">No examinations found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search
              ? "No exams match your search query."
              : "Get started by creating your first examination paper."}
          </p>
          <div className="mt-4">
            <Link to="/teacher/exams/new">
              <Button size="sm">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Create Exam
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <Card
              key={exam.id}
              className="border-border bg-card hover:border-primary/50 transition-all flex flex-col justify-between group shadow-sm"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <ExamStatusBadge status={exam.displayStatus} />
                    {exam.categoryName && (
                      <span
                        className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded ml-2 border"
                        style={{
                          borderColor: `${exam.categoryColor || "#6366f1"}40`,
                          color: exam.categoryColor || "#6366f1",
                          backgroundColor: `${exam.categoryColor || "#6366f1"}10`,
                        }}
                      >
                        {exam.categoryName}
                      </span>
                    )}
                  </div>

                  {exam.accessCode && (
                    <button
                      onClick={() => copyCode(exam.accessCode)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/25 text-primary font-mono text-xs font-bold hover:bg-primary/20 transition-colors"
                      title="Click to copy access code"
                    >
                      <span>{exam.accessCode}</span>
                      {copiedCode === exam.accessCode ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-card-foreground tracking-tight group-hover:text-primary transition-colors">
                    {exam.title}
                  </h3>
                  {exam.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {exam.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-3 border-t border-border/60">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{exam.durationMinutes} mins</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{exam.questionCount || 0} Questions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{exam.totalSessions || 0} Attempts</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {exam.scheduledEnd
                        ? new Date(exam.scheduledEnd).toLocaleDateString()
                        : "No closing date"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-muted/40 border-t border-border/60 rounded-b-2xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link to={`/teacher/exams/${exam.id}/questions`}>
                    <Button size="sm" variant="default" className="text-xs">
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      {exam.displayStatus === "draft" ? "Edit Draft" : "View Paper"}
                    </Button>
                  </Link>

                  <Link to={`/teacher/exams/${exam.id}/results`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      Results
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center gap-1">
                  <Link to={`/teacher/exams/${exam.id}`}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Exam Details & Settings">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </Link>

                  <Link to={`/teacher/exams/${exam.id}/analytics`}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Analytics">
                      <BarChart2 className="w-4 h-4" />
                    </Button>
                  </Link>

                  {(exam.totalSessions === 0 || exam.displayStatus === "draft") && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete Exam"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDeleteError(null);
                        setDeleteTarget({ id: exam.id, title: exam.title });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Exam Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in text-card-foreground">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-card-foreground">Delete Examination</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-foreground">"{deleteTarget.title}"</strong>? All associated questions, configurations, and draft content will be permanently removed.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Permanently Delete Exam"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
