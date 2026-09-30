"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "qrcode";
import { lookupExam, startSession } from "@/app/actions/session";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound,
  Clock,
  Shield,
  Video,
  ArrowRight,
  Sparkles,
  QrCode,
  CheckCircle2,
} from "lucide-react";

export default function JoinExamCodePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string || "").toUpperCase();

  const [isPending, startTransition] = useTransition();
  const [exam, setExam] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (code) {
      startTransition(async () => {
        const res = await lookupExam(code);
        if (res.ok) {
          setExam(res.exam);
          const currentOrigin = window.location.origin;
          const url = `${currentOrigin}/join/${code}`;
          QRCode.toDataURL(url, { width: 160, margin: 1 })
            .then(setQrUrl)
            .catch(() => {});
        } else {
          setError(res.error || "Invalid access code.");
        }
      });
    }
  }, [code]);

  const handleStartExam = () => {
    if (!exam) return;
    startTransition(async () => {
      const res = await startSession(exam.id);
      if (res.ok) {
        router.push(`/student/sessions/${res.sessionId}`);
      } else {
        setError(res.error || "Failed to start exam session.");
      }
    });
  };

  if (isPending && !exam) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-400 animate-pulse text-sm">
        Verifying Examination Code [{code}]...
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Examination Not Found</h2>
        <p className="text-xs text-slate-400">{error}</p>
        <Button onClick={() => router.push("/student")} variant="outline" className="mt-2">
          Return to Student Portal
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <Badge variant="default" className="text-xs font-mono font-bold px-3 py-1">
          Access Code: {code}
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {exam?.title}
        </h1>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          {exam?.description || "You are joining a secure scheduled examination session."}
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/80 shadow-2xl overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* Exam Specs Strip */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Duration</span>
                <span className="font-bold text-white text-sm">{exam?.durationMinutes} Mins</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Security</span>
                <span className="font-bold text-white text-sm">
                  {exam?.enforceFullscreen ? "Fullscreen Lock" : "Standard"}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code Quick Share */}
          {qrUrl && (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center gap-4">
              <img src={qrUrl} alt="Exam QR Code" className="w-20 h-20 rounded-lg bg-white p-1" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                  Quick Join QR Code
                </span>
                <p className="text-[11px] text-slate-400">
                  Scan with your mobile device or share this link with classmates.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
              {error}
            </div>
          )}

          {exam?.availability && exam.availability !== "open" ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center font-semibold">
              This examination is currently {exam.availability.replace("_", " ")}. You cannot enter at this time.
            </div>
          ) : (
            <Button
              size="lg"
              disabled={isPending}
              onClick={handleStartExam}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              <span>Begin Examination Session</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
