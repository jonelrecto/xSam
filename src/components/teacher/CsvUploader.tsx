"use client";

import React, { useState, useRef } from "react";
import { parseExamCsv, type CsvParseResult, type CsvIssue } from "@/lib/csv/parse-exam-csv";
import { useDraftStore } from "@/hooks/use-draft-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function CsvUploader() {
  const [isOpen, setIsOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [loadMode, setLoadMode] = useState<"append" | "replace">("append");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setResult(null);

    try {
      const parsed = await parseExamCsv(file);
      setResult(parsed);
    } catch (err) {
      console.error("Spreadsheet parse error:", err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleLoadQuestions = () => {
    if (!result || result.questions.length === 0) return;
    useDraftStore.getState().load(result.questions, loadMode);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsOpen(false);
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader
        className="cursor-pointer select-none py-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-card-foreground flex items-center gap-2">
                Import Questions from CSV / Excel (.xlsx)
                <Badge variant="outline" className="text-[10px] font-mono">
                  Bulk Load
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Populate multiple choice, true/false, identification, and essay items from spreadsheets
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-2 pb-6 border-t border-border space-y-5 animate-fade-in">
          {/* Rules & Template Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-muted/50 border border-border text-xs space-y-1.5">
              <h5 className="font-bold text-primary uppercase tracking-wider text-[11px]">
                Spreadsheet Authoring Guidelines:
              </h5>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                <li><strong>Multiple Choice:</strong> Choices in <code className="text-foreground bg-muted px-1 py-0.5 rounded">opt_a..opt_f</code>; answer can be letter (<code className="text-foreground bg-muted px-1 py-0.5 rounded">A</code>, <code className="text-foreground bg-muted px-1 py-0.5 rounded">B</code>) or exact text.</li>
                <li><strong>True/False:</strong> Answer must be <code className="text-foreground bg-muted px-1 py-0.5 rounded">true</code> or <code className="text-foreground bg-muted px-1 py-0.5 rounded">false</code>.</li>
                <li><strong>Identification:</strong> Delimit multiple accepted answers with pipe (<code className="text-foreground bg-muted px-1 py-0.5 rounded">Manila|City of Manila</code>).</li>
                <li><strong>Essay:</strong> Answer column can be empty (manually graded).</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col justify-between items-start gap-2">
              <div>
                <h5 className="font-bold text-primary text-xs">Excel (.xlsx) Template with Dropdown Types</h5>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pre-configured Excel file with data validation dropdowns, sample rows, and instruction sheet.
                </p>
              </div>
              <a
                href="/templates/exam_import_template.xlsx"
                download="exam_import_template.xlsx"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download Excel (.xlsx) Template
              </a>
            </div>
          </div>

          {/* Upload Input Area */}
          <div className="p-6 rounded-xl border border-dashed border-border bg-muted/20 text-center hover:border-primary/60 transition-colors">
            <UploadCloud className="w-10 h-10 text-primary mx-auto mb-2 opacity-80" />
            <p className="text-sm font-bold text-card-foreground">
              Choose or Drag .CSV or .XLSX File Here
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Supports .csv and .xlsx files up to 1 MB (maximum 200 questions)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="hidden"
              id="spreadsheet-file-input"
            />
            <label htmlFor="spreadsheet-file-input" className="inline-block mt-3">
              <span className="cursor-pointer px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold border border-border transition-colors inline-flex items-center gap-1.5">
                Select Spreadsheet File
              </span>
            </label>
          </div>

          {/* Parse Results Preview */}
          {result && (
            <div className="space-y-4 pt-2 border-t border-border animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge variant={result.invalidRows === 0 ? "success" : "warning"}>
                    {result.questions.length} Valid Questions Found
                  </Badge>
                  {result.invalidRows > 0 && (
                    <Badge variant="destructive">
                      {result.invalidRows} Row(s) with Issues
                    </Badge>
                  )}
                </div>

                {result.questions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={loadMode}
                      onChange={(e) => setLoadMode(e.target.value as any)}
                      className="text-xs bg-background border border-input rounded-lg px-2.5 py-1.5 text-foreground"
                    >
                      <option value="append">Append to existing</option>
                      <option value="replace">Replace all draft</option>
                    </select>

                    <Button
                      size="sm"
                      onClick={handleLoadQuestions}
                      className="font-semibold gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Load {result.questions.length} Questions
                    </Button>
                  </div>
                )}
              </div>

              {/* Issues Table if any */}
              {result.issues.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2 text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border text-[11px] text-muted-foreground uppercase tracking-wider">
                        <th className="py-1 px-2">Row</th>
                        <th className="py-1 px-2">Column</th>
                        <th className="py-1 px-2">Issue</th>
                        <th className="py-1 px-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.issues.map((issue, idx) => (
                        <tr key={idx} className="text-foreground">
                          <td className="py-1.5 px-2 font-mono text-[11px]">
                            {issue.row ? `Row ${issue.row}` : "File"}
                          </td>
                          <td className="py-1.5 px-2 font-mono text-primary text-[11px]">
                            {issue.column || "—"}
                          </td>
                          <td className="py-1.5 px-2 text-muted-foreground">
                            {issue.message}
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            {issue.severity === "error" ? (
                              <Badge variant="destructive" className="text-[9px]">
                                Error
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="text-[9px]">
                                Warning
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
