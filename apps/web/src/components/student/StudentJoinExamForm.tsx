import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { studentApi } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  KeyRound,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Clock,
} from "lucide-react";

export function StudentJoinExamForm({ initialCode }: { initialCode?: string }) {
  const { code: routeCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState<string>(
    initialCode || routeCode || ""
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [foundExam, setFoundExam] = useState<{
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number;
    availability: string;
    requireCamera: boolean;
    enforceFullscreen: boolean;
    restrictInput?: boolean;
  } | null>(null);

  const performLookup = useCallback(async (codeToLookup: string) => {
    const cleanCode = codeToLookup.trim().toUpperCase();
    if (cleanCode.length < 4) {
      setError("Please enter a valid 6-character code.");
      return;
    }

    setIsSearching(true);
    setError(null);
    setFoundExam(null);

    try {
      const res = await studentApi.lookupExam(cleanCode);
      if (res.ok && res.exam) {
        setFoundExam(res.exam);
      } else {
        setError("No exam found with this access code.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to search for exam.");
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await performLookup(accessCode);
  };

  useEffect(() => {
    const target = initialCode || routeCode;
    if (target && target.trim().length >= 4) {
      setAccessCode(target.trim().toUpperCase());
      performLookup(target);
    }
  }, [initialCode, routeCode, performLookup]);

  return (
    <Card className="border-slate-800 bg-slate-900/80 shadow-lg">
      <CardHeader>
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2">
          <KeyRound className="w-5 h-5" />
        </div>
        <CardTitle>Join An Exam</CardTitle>
        <CardDescription>
          Enter the unique access code issued for your scheduled test session
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="text"
            value={accessCode}
            onChange={(e) => {
              setAccessCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="e.g. 7K4N9X"
            maxLength={8}
            className="font-mono text-center tracking-widest uppercase text-lg h-12 bg-slate-950 border-slate-800"
          />
          <Button
            type="submit"
            size="lg"
            disabled={isSearching || accessCode.trim().length < 4}
            className="font-semibold shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              "Find Exam"
            )}
          </Button>
        </form>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Found Exam Preview Card */}
        {foundExam && (
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/40 shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Examination Found
                </span>
                <h4 className="text-lg font-bold text-white mt-0.5">
                  {foundExam.title}
                </h4>
              </div>
              <Badge
                variant={foundExam.availability === "open" ? "success" : "warning"}
                className="capitalize text-xs"
              >
                {foundExam.availability.replace("_", " ")}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                {foundExam.durationMinutes} Minutes
              </span>
              {foundExam.requireCamera && (
                <span className="text-indigo-300 font-medium">📷 Camera Required</span>
              )}
            </div>

            {foundExam.availability === "open" ? (
              <Button
                onClick={() => navigate(`/student/exams/${foundExam.id}/check`)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm h-11"
              >
                Proceed to Pre-Flight Check
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 text-center font-medium">
                This examination is currently {foundExam.availability.replace("_", " ")}. You cannot enter at this time.
              </div>
            )}
          </div>
        )}

        {/* Checklist */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 mt-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Pre-Flight Checklist
          </h4>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              IndexedDB offline cache ready for local answer safety
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Fullscreen and integrity monitoring enabled
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
