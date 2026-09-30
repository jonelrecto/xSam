import React from "react";
import { Badge } from "@/components/ui/badge";
import type { ExamDisplayStatus } from "@/lib/exam/lifecycle";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileEdit,
} from "lucide-react";

interface ExamStatusBadgeProps {
  status: ExamDisplayStatus | string;
  className?: string;
}

export function ExamStatusBadge({ status, className = "" }: ExamStatusBadgeProps) {
  switch (status) {
    case "ongoing":
      return (
        <Badge
          className={`bg-emerald-950/80 border-emerald-500/50 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Ongoing
        </Badge>
      );

    case "published":
      return (
        <Badge
          className={`bg-blue-950/80 border-blue-500/50 text-blue-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${className}`}
        >
          <Calendar className="w-3 h-3 text-blue-400" />
          Published
        </Badge>
      );

    case "postponed":
      return (
        <Badge
          className={`bg-amber-950/80 border-amber-500/50 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${className}`}
        >
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          Postponed
        </Badge>
      );

    case "for_checking":
      return (
        <Badge
          className={`bg-purple-950/80 border-purple-500/50 text-purple-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${className}`}
        >
          <Clock className="w-3 h-3 text-purple-400" />
          For Checking
        </Badge>
      );

    case "completed":
      return (
        <Badge
          className={`bg-teal-950/80 border-teal-500/50 text-teal-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-teal-400" />
          Completed
        </Badge>
      );

    case "draft":
    default:
      return (
        <Badge
          variant="default"
          className={`border-slate-700 bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${className}`}
        >
          <FileEdit className="w-3 h-3 text-slate-400" />
          Draft
        </Badge>
      );
  }
}
