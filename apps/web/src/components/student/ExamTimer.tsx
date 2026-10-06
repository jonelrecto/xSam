import React, { useEffect, useState, useRef } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface ExamTimerProps {
  deadlineAt: string | Date;
  onExpire?: () => void;
  className?: string;
}

export function ExamTimer({ deadlineAt, onExpire, className = "" }: ExamTimerProps) {
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    const end = new Date(deadlineAt).getTime();
    return Math.max(0, end - Date.now());
  });

  const hasExpiredRef = useRef<boolean>(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const serverEndMs = new Date(deadlineAt).getTime();
    const initialRemaining = Math.max(0, serverEndMs - Date.now());
    const startPerf = performance.now();

    if (initialRemaining <= 0) {
      setRemainingMs(0);
      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpireRef.current?.();
      }
      return;
    }

    const interval = setInterval(() => {
      const elapsedPerf = performance.now() - startPerf;
      const currentRemaining = Math.max(0, initialRemaining - elapsedPerf);

      setRemainingMs(currentRemaining);

      if (currentRemaining <= 0) {
        clearInterval(interval);
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          onExpireRef.current?.();
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [deadlineAt]);

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  const timeString =
    hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;

  const isUrgent = totalSeconds < 300; // < 5 mins
  const isCritical = totalSeconds < 60; // < 1 min

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold border transition-all ${
        isCritical
          ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse shadow-lg shadow-rose-950/40"
          : isUrgent
          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
          : "bg-slate-900/80 text-indigo-300 border-indigo-500/30"
      } ${className}`}
    >
      {isCritical || isUrgent ? (
        <AlertTriangle className="w-4 h-4 shrink-0 text-current" />
      ) : (
        <Clock className="w-4 h-4 shrink-0 text-current" />
      )}
      <span className="tracking-wider">{timeString}</span>
    </div>
  );
}
