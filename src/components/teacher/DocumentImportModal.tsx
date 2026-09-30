"use client";

import React, { useState, useRef } from "react";
import { useDraftStore } from "@/hooks/use-draft-store";
import { importDocumentAction } from "@/app/actions/import";
import type { DraftQuestion } from "@/lib/schemas/exam";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  ArrowRight,
  SplitSquareVertical,
  X,
  Layers,
  HelpCircle,
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
    setStatusMsg("Reading document buffer...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setStatusMsg("Extracting text and structure (PDF/Word)...");
      const res = await importDocumentAction(examId, formData);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                AI Document Question Extraction
                <Badge variant="default" className="text-[10px] font-mono">
                  Phase 3 Pipeline
                </Badge>
              </h3>
              <p className="text-xs text-slate-400">
                Upload syllabus, quiz, or test papers (.pdf, .docx, .txt) with automatic key detection
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <div className="space-y-6 max-w-xl mx-auto py-8">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-950/40 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {file ? file.name : "Click to select or drag PDF / Word file"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
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

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2 text-slate-400">
                <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] block">
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
                  className="font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
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
              <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto animate-pulse">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white">Analyzing Document</h4>
                <p className="text-xs text-slate-400">{statusMsg}</p>
              </div>
            </div>
          )}

          {/* STEP 3: SIDE-BY-SIDE SPLIT SCREEN REVIEW */}
          {step === "review" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-3">
                  <Badge variant="success">
                    {extractedQuestions.length} Questions Extracted
                  </Badge>
                  {quotaInfo && (
                    <span className="text-xs text-slate-400">
                      Teacher Quota: <strong className="text-indigo-400">{quotaInfo.remaining}</strong> imports remaining today
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={loadMode}
                    onChange={(e) => setLoadMode(e.target.value as any)}
                    className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300"
                  >
                    <option value="append">Append to existing draft</option>
                    <option value="replace">Replace all draft items</option>
                  </select>

                  <Button
                    size="sm"
                    onClick={handleConfirmImport}
                    className="font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm & Load Into Studio
                  </Button>
                </div>
              </div>

              {/* Split Screen Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
                {/* Left Pane: Source Document Text */}
                <div className="border border-slate-800 rounded-xl bg-slate-950/80 p-4 flex flex-col h-[520px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      Original Document Source
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {file?.name}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto whitespace-pre-wrap font-mono text-xs text-slate-300 leading-relaxed pr-2">
                    {sourceText || "No text preview available."}
                  </div>
                </div>

                {/* Right Pane: Editable Extracted Questions */}
                <div className="border border-slate-800 rounded-xl bg-slate-950/40 p-4 flex flex-col h-[520px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <SplitSquareVertical className="w-4 h-4 text-cyan-400" />
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
                        className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/90 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                            #{idx + 1} • {q.type.replace("_", " ").toUpperCase()}
                          </span>
                          <Badge variant="warning" className="text-[9px] gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI Inferred
                          </Badge>
                        </div>

                        {q.instructions && (
                          <p className="text-[10px] text-indigo-300 bg-indigo-950/40 p-1.5 rounded border border-indigo-500/20 font-sans">
                            {q.instructions}
                          </p>
                        )}

                        <textarea
                          rows={2}
                          value={q.prompt}
                          onChange={(e) =>
                            updateQuestionField(idx, { prompt: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                                        ? "bg-emerald-600 border-emerald-500 text-white"
                                        : "bg-slate-800 border-slate-700 text-slate-400"
                                    }`}
                                  >
                                    {letter}
                                  </span>
                                  <span className="text-slate-300 truncate">{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Identification Answers */}
                        {q.type === "identification" && (
                          <div className="text-[11px] text-indigo-300">
                            <strong>Accepted:</strong> {q.answers.join(" | ") || "None set"}
                          </div>
                        )}

                        {/* Warnings */}
                        {q.warnings.length > 0 && (
                          <p className="text-[10px] text-amber-300/80">
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
