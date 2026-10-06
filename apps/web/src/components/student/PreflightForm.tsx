import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { studentApi } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  ShieldCheck,
  Clock,
  HelpCircle,
  Camera,
  Maximize,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
} from "lucide-react";

interface PreflightFormProps {
  exam: {
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number;
    requireCamera: boolean;
    enforceFullscreen: boolean;
    restrictInput?: boolean;
    questionCount: number;
  };
}

export function PreflightForm({ exam }: PreflightFormProps) {
  const navigate = useNavigate();
  const [hasIndexedDb, setHasIndexedDb] = useState<boolean>(true);
  const [cameraGranted, setCameraGranted] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [agreedToHonorCode, setAgreedToHonorCode] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check indexedDB
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !window.indexedDB) {
        setHasIndexedDb(false);
      }
    } catch {
      setHasIndexedDb(false);
    }
  }, []);

  // Request camera if required
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraGranted(true);
      setCameraError(null);
      // Stop stream immediately after check
      stream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      setCameraGranted(false);
      setCameraError("Camera access denied or unavailable.");
    }
  };

  const canStart =
    hasIndexedDb &&
    (!exam.requireCamera || cameraGranted) &&
    agreedToHonorCode &&
    !isStarting;

  const handleStartExam = async () => {
    if (!canStart) return;
    setIsStarting(true);
    setErrorMessage(null);

    try {
      const res = await studentApi.startSession(exam.id, "2026-09");
      if (res.ok && res.sessionId) {
        // Request fullscreen if configured
        if (exam.enforceFullscreen && document.documentElement.requestFullscreen) {
          try {
            await document.documentElement.requestFullscreen();
          } catch {
            // Non-fatal if browser blocks gesture
          }
        }
        navigate(`/student/sessions/${res.sessionId}`);
      } else {
        setErrorMessage("Failed to start examination session.");
        setIsStarting(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
      setIsStarting(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden">
      <CardHeader className="p-6 sm:p-8 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900/40 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="default">Examination Briefing</Badge>
          <Badge variant="outline" className="border-slate-700 text-slate-300">
            {exam.durationMinutes} Minutes
          </Badge>
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {exam.title}
        </CardTitle>
        {exam.description && (
          <CardDescription className="text-slate-300 text-sm mt-1 leading-relaxed">
            {exam.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Exam Specifications */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <Clock className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Duration</p>
              <p className="text-sm font-bold text-white">{exam.durationMinutes} min</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Questions</p>
              <p className="text-sm font-bold text-white">{exam.questionCount} Items</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3 col-span-2 sm:col-span-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Environment</p>
              <p className="text-sm font-bold text-emerald-300">Secure Sandboxed</p>
            </div>
          </div>
        </div>

        {/* Pre-Flight Diagnostics */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            System Pre-Flight Diagnostics
          </h3>

          {/* 1. IndexedDB Check */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
            <div className="flex items-center gap-3">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-slate-200">Local Answer Cache</p>
                <p className="text-[11px] text-slate-500">IndexedDB local durability engine</p>
              </div>
            </div>
            {hasIndexedDb ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-rose-400 font-semibold">
                <AlertTriangle className="w-4 h-4" /> Unsupported
              </span>
            )}
          </div>

          {/* 2. Fullscreen Capability */}
          {exam.enforceFullscreen && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
              <div className="flex items-center gap-3">
                <Maximize className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Fullscreen Focus</p>
                  <p className="text-[11px] text-slate-500">Fullscreen lock required during attempt</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-indigo-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Configured
              </span>
            </div>
          )}

          {/* 3. Camera Check */}
          {exam.requireCamera && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800">
              <div className="flex items-center gap-3">
                <Camera className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Video Proctoring</p>
                  <p className="text-[11px] text-slate-500">Webcam permission required</p>
                </div>
              </div>
              {cameraGranted ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Granted
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={requestCameraPermission}
                  className="text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10"
                >
                  Enable Camera
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Academic Integrity Consent */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/20 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedToHonorCode}
              onChange={(e) => setAgreedToHonorCode(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
            />
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-white block">Academic Integrity Pledge</span>
              I affirm that this examination will be completed solely by myself, without unauthorized assistance, collaboration, browser tab switching, or external AI/reference tools.
            </div>
          </label>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Button
            size="lg"
            disabled={!canStart}
            onClick={handleStartExam}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-950/60"
          >
            {isStarting ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Preparing Secure Session...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2 fill-current" />
                Begin Examination
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
