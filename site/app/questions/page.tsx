import React from "react";
import questionsData from "@/data/questions.json";
import { QuestionView } from "@/components/QuestionView";

export const metadata = {
  title: "Nine Questions | SIP Continuity Discovery Engine",
  description: "Distributions, 95% confidence intervals, and verbatim findings across nine research questions on first-time SIP continuity.",
};

export default function QuestionsPage() {
  return (
    <div className="py-6">
      <QuestionView questionsData={questionsData} />
    </div>
  );
}

