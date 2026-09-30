import React from "react";
import { WizardSteps } from "@/components/teacher/WizardSteps";
import { ExamDetailsForm } from "@/components/teacher/ExamDetailsForm";
import { getCategoriesAction } from "@/app/actions/exam";

export default async function NewExamPage() {
  const categories = await getCategoriesAction();

  return (
    <div className="space-y-6">
      <WizardSteps currentStep={1} />
      <ExamDetailsForm initialCategories={categories} />
    </div>
  );
}

