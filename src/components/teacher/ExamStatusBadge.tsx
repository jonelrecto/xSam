import React from "react";
import { Badge } from "../ui/badge";
import type { ExamDisplayStatus } from "@xsam/shared";
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
          className={`bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          Ongoing
        </Badge>
      );

    case "published":
      return (
        <Badge
          className={`bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${className}`}
        >
          <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          Published
        </Badge>
      );

    case "postponed":
      return (
        <Badge
          className={`bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${className}`}
        >
          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          Postponed
        </Badge>
      );

    case "for_checking":
      return (
        <Badge
          className={`bg-purple-500/15 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${className}`}
        >
          <Clock className="w-3 h-3 text-purple-600 dark:text-purple-400" />
          For Checking
        </Badge>
      );

    case "completed":
      return (
        <Badge
          className={`bg-teal-500/15 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border-teal-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
          Completed
        </Badge>
      );

    case "draft":
    default:
      return (
        <Badge
          variant="secondary"
          className={`border-border bg-muted text-muted-foreground text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${className}`}
        >
          <FileEdit className="w-3 h-3 text-muted-foreground" />
          Draft
        </Badge>
      );
  }
}
