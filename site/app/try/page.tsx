import React from "react";
import examplesData from "@/data/examples.json";
import promptsData from "@/data/prompts.json";
import { TryEngine } from "@/components/TryEngine";

export const metadata = {
  title: "Try the Engine | SIP Continuity Discovery Engine",
  description: "Test the discovery engine's AI Gate v1.1, Extraction v1.2a, and grounded span extraction live on any investor text, or explore verified examples.",
};

export default function TryPage() {
  return (
    <div className="py-8 max-w-5xl mx-auto space-y-8">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Try the Discovery Engine
        </h1>
        <p className="mt-2 text-base text-muted-foreground max-w-3xl">
          Test how the AI pipeline classifies and extracts structured facts from investor posts. The engine runs Haiku Gate v1.1, followed by Haiku Extraction v1.2a with the deterministic H11 rule and strict span grounding.
        </p>
      </div>

      <TryEngine
        examples={examplesData}
        promptMeta={{
          gate_version: promptsData.gate_version,
          extract_version: promptsData.extract_version,
        }}
      />
    </div>
  );
}

