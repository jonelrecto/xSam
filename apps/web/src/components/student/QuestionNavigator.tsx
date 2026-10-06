import React from "react";
import type { StudentQuestion } from "@xsam/shared";
import { Bookmark } from "lucide-react";

interface QuestionNavigatorProps {
  questions: StudentQuestion[];
  currentIndex: number;
  answers: Record<string, string>;
  flaggedIds: Set<string>;
  onSelect: (index: number) => void;
}

export function QuestionNavigator({
  questions,
  currentIndex,
  answers,
  flaggedIds,
  onSelect,
}: QuestionNavigatorProps) {
  const answeredCount = questions.filter(
    (q) => answers[q.id] && answers[q.id].trim() !== ""
  ).length;
  const flaggedCount = flaggedIds.size;
  const totalCount = questions.length;

  return (
    <div className="flex flex-col h-full bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      {/* Header Summary */}
      <div className="pb-3 mb-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Navigator
          </h3>
          <p className="text-sm font-semibold text-white">
            {answeredCount} of {totalCount} Answered
          </p>
        </div>
        {flaggedCount > 0 && (
          <div className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Bookmark className="w-3 h-3 fill-amber-400" />
            <span>{flaggedCount} flagged</span>
          </div>
        )}
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-5 gap-2 overflow-y-auto max-h-[380px] p-1 custom-scrollbar">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const isAnswered = Boolean(answers[q.id] && answers[q.id].trim() !== "");
          const isFlagged = flaggedIds.has(q.id);

          let buttonStyle =
            "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60";

          if (isCurrent) {
            buttonStyle =
              "bg-indigo-600 text-white font-bold border-indigo-400 ring-2 ring-indigo-500/50 shadow-md shadow-indigo-950";
          } else if (isAnswered) {
            buttonStyle =
              "bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40";
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelect(idx)}
              className={`relative h-10 w-full rounded-xl border text-xs font-medium flex items-center justify-center transition-all duration-150 ${buttonStyle}`}
            >
              <span>{idx + 1}</span>

              {/* Status Indicators */}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 ring-2 ring-slate-900 flex items-center justify-center">
                  <span className="sr-only">Flagged</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 border border-emerald-500"></div>
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
          <span>Flagged</span>
        </div>
      </div>
    </div>
  );
}
