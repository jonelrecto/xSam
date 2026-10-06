import React, { useState, useRef } from "react";
import { useDraftStore } from "../../hooks/use-draft-store";
import { teacherApi } from "../../lib/api";
import type { DraftQuestion } from "@xsam/shared";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  FileText,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  SplitSquareVertical,
  X,
} from "lucide-react";

interface DocumentImportModalProps {
  examId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentImportModal({
  examId,
  isOpen,
  onClose,
}: DocumentImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "processing" | "review">("upload");
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [extractedQuestions, setExtractedQuestions] = useState<DraftQuestion[]>([]);
  const [sourceText, setSourceText] = useState<string>("");
  const [quotaInfo, setQuotaInfo] = useState<{ used: number; remaining: number } | null>(null);
  const [loadMode, setLoadMode] = useState<"append" | "replace">("append");

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setErrorMsg(null);
    }
  };

  const handleStartExtraction = async () => {
    if (!file) return;

    setStep("processing");
    setErrorMsg(null);
    setStatusMsg("Uploading document buffer to Fastify parser...");

    try {
      setStatusMsg("Extracting text and structure (PDF/Word/AI)...");
      const res = await teacherApi.importDocument(examId, file);

      if (!res.ok) {
        setErrorMsg(res.error || "Failed to extract questions.");
        setStep("upload");
        return;
      }

      setStatusMsg("Parsing questions and inferring answer keys...");
      setExtractedQuestions(res.questions);
      setSourceText(res.previewText);
      setQuotaInfo({ used: res.quotaUsed, remaining: res.quotaRemaining });
      setStep("review");
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
      setStep("upload");
    }
  };

  const handleConfirmImport = () => {
    if (extractedQuestions.length === 0) return;
    useDraftStore.getState().load(extractedQuestions, loadMode);
    onClose();
  };

  const updateQuestionField = (idx: number, patch: Partial<DraftQuestion>) => {
    setExtractedQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                AI Document Question Extraction
                <Badge variant="default" className="text-[10px] font-mono">
                  Fastify AI Pipeline
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Upload syllabus, quiz, or test papers (.pdf, .docx, .txt) with automatic key detection
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-start gap-2.5 animate-fade-in font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <div className="space-y-6 max-w-xl mx-auto py-8">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary/80 bg-muted/20 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-card-foreground">
                    {file ? file.name : "Click to select or drag PDF / Word file"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports Adobe PDF (.pdf), Microsoft Word (.docx), and Plain Text (.txt)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs space-y-2 text-muted-foreground">
                <span className="font-bold text-card-foreground uppercase tracking-wider text-[11px] block">
                  Document Processing Guidelines:
                </span>
                <ul className="list-disc list-inside space-y-1">
                  <li>Preserves shared reading passages and instructions across multiple questions.</li>
                  <li>Infers answer keys from marked letters (A–D), bold text, or answer lines.</li>
                  <li>All extracted questions require individual educator confirmation.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!file}
                  onClick={handleStartExtraction}
                  className="font-semibold gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Extract Questions with AI
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: PROCESSING */}
          {step === "processing" && (
            <div className="py-16 text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center mx-auto animate-pulse">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-card-foreground">Analyzing Document</h4>
                <p className="text-xs text-muted-foreground">{statusMsg}</p>
              </div>
            </div>
          )}

          {/* STEP 3: SIDE-BY-SIDE SPLIT SCREEN REVIEW */}
          {step === "review" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center gap-3">
                  <Badge variant="success">
                    {extractedQuestions.length} Questions Extracted
                  </Badge>
                  {quotaInfo && (
                    <span className="text-xs text-muted-foreground">
                      Teacher Quota: <strong className="text-primary">{quotaInfo.remaining}</strong> imports remaining today
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={loadMode}
                    onChange={(e) => setLoadMode(e.target.value as any)}
                    className="text-xs bg-background border border-input rounded-lg px-2.5 py-1.5 text-foreground"
                  >
                    <option value="append">Append to existing draft</option>
                    <option value="replace">Replace all draft items</option>
                  </select>

                    <Button
                      size="sm"
                      onClick={handleConfirmImport}
                      className="font-semibold gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Load Into Studio
                    </Button>
                </div>
              </div>

              {/* Split Screen Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
                {/* Left Pane: Source Document Text */}
                <div className="border border-border rounded-xl bg-muted/20 p-4 flex flex-col h-[520px]">
                  <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" />
                      Original Document Source
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {file?.name}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto whitespace-pre-wrap font-mono text-xs text-foreground leading-relaxed pr-2">
                    {sourceText || "No text preview available."}
                  </div>
                </div>

                {/* Right Pane: Editable Extracted Questions */}
                <div className="border border-border rounded-xl bg-muted/10 p-4 flex flex-col h-[520px]">
                  <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <SplitSquareVertical className="w-4 h-4 text-primary" />
                      Parsed Questions & AI Answers
                    </span>
                    <Badge variant="warning" className="text-[10px]">
                      Requires Confirmation
                    </Badge>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {extractedQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-border bg-card shadow-sm space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-card-foreground bg-muted px-2 py-0.5 rounded">
                            #{idx + 1} • {q.type.replace("_", " ").toUpperCase()}
                          </span>
                          <Badge variant="warning" className="text-[9px] gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI Inferred
                          </Badge>
                        </div>

                        {q.instructions && (
                          <p className="text-[10px] text-primary bg-primary/10 p-1.5 rounded border border-primary/20 font-sans">
                            {q.instructions}
                          </p>
                        )}

                        <textarea
                          rows={2}
                          value={q.prompt}
                          onChange={(e) =>
                            updateQuestionField(idx, { prompt: e.target.value })
                          }
                          className="w-full bg-background border border-input rounded p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />

                        {/* Options if Multiple Choice */}
                        {q.type === "multiple_choice" && q.options && (
                          <div className="space-y-1.5 pt-1">
                            {q.options.map((opt, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isKey = q.answers.includes(opt);
                              return (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <span
                                    className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center border ${
                                      isKey
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-muted text-muted-foreground border-border"
                                    }`}
                                  >
                                    {letter}
                                  </span>
                                  <span className="text-card-foreground truncate">{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Identification Answers */}
                        {q.type === "identification" && (
                          <div className="text-[11px] text-primary">
                            <strong>Accepted:</strong> {q.answers.join(" | ") || "None set"}
                          </div>
                        )}

                        {/* Warnings */}
                        {q.warnings && q.warnings.length > 0 && (
                          <p className="text-[10px] text-amber-700 dark:text-amber-300">
                            ⚠️ {q.warnings[0]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
