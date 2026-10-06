import React from "react";
import { Check, Edit3, FileText, Send } from "lucide-react";

interface WizardStepsProps {
  currentStep: 1 | 2 | 3;
  examId?: string;
  onStepClick?: (step: number) => void;
}

export function WizardSteps({ currentStep, onStepClick }: WizardStepsProps) {
  const steps = [
    { number: 1, title: "Exam Details", desc: "Title, duration & settings", icon: FileText },
    { number: 2, title: "Questions Draft Studio", desc: "Manual, CSV & AI questions", icon: Edit3 },
    { number: 3, title: "Review & Publish", desc: "Checklist & access code", icon: Send },
  ];

  return (
    <div className="w-full py-4 mb-6 border-b border-border">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const StepIcon = step.icon;
          const isClickable = Boolean(onStepClick && (isCompleted || isCurrent));

          return (
            <React.Fragment key={step.number}>
              <div
                onClick={() => {
                  if (isClickable && onStepClick) onStepClick(step.number);
                }}
                className={`flex items-center gap-3 ${
                  isClickable ? "cursor-pointer group select-none" : ""
                }`}
                title={isClickable ? `Click to configure Step ${step.number}` : undefined}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                    isCompleted
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 group-hover:bg-emerald-500"
                      : isCurrent
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/40"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                </div>
                <div className="hidden sm:block">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider block transition-colors ${
                      isCurrent
                        ? "text-primary"
                        : isCompleted
                        ? "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    Step {step.number}
                  </span>
                  <span
                    className={`text-sm font-semibold transition-colors ${
                      isCurrent || isCompleted
                        ? "text-foreground group-hover:text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 mx-4 h-0.5 rounded transition-all ${
                    step.number < currentStep ? "bg-emerald-500/50" : "bg-border"
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
