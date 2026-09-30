import React from "react";
import { Check, Edit3, FileText, Send } from "lucide-react";

interface WizardStepsProps {
  currentStep: 1 | 2 | 3;
  examId?: string;
}

export function WizardSteps({ currentStep }: WizardStepsProps) {
  const steps = [
    { number: 1, title: "Exam Details", desc: "Title, duration & settings", icon: FileText },
    { number: 2, title: "Questions Draft Studio", desc: "Manual, CSV & AI questions", icon: Edit3 },
    { number: 3, title: "Review & Publish", desc: "Checklist & access code", icon: Send },
  ];

  return (
    <div className="w-full py-4 mb-6 border-b border-slate-800/80">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.number}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                    isCompleted
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                      : isCurrent
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/40"
                      : "bg-slate-800/80 text-slate-500 border border-slate-700/60"
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <div className="hidden sm:block">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider block ${
                      isCurrent
                        ? "text-indigo-400"
                        : isCompleted
                        ? "text-emerald-400"
                        : "text-slate-500"
                    }`}
                  >
                    Step {step.number}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      isCurrent || isCompleted ? "text-white" : "text-slate-500"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 mx-4 h-0.5 rounded transition-all ${
                    step.number < currentStep ? "bg-emerald-500/50" : "bg-slate-800"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
