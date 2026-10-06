import React from "react";
import { ExamDetailsForm } from "../../components/teacher/ExamDetailsForm";
import { Badge } from "../../components/ui/badge";

export default function NewExamPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Badge variant="outline">Teacher Studio</Badge>
        <span>&gt;</span>
        <span className="text-foreground">New Examination</span>
      </div>

      <div className="space-y-1">
        <h1 className="text-3xl font-black text-foreground tracking-tight">Create Examination</h1>
        <p className="text-sm text-muted-foreground">
          Configure initial settings and timing before adding questions in the Draft Studio.
        </p>
      </div>

      <ExamDetailsForm />
    </div>
  );
}
