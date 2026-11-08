import React from "react";
import examplesData from "@/data/examples.json";
import tryPrompts from "@/data/try_prompts.json";
import { TryEngine } from "@/components/TryEngine";

export const metadata = {
  title: "Try the Engine | SIP Continuity Discovery Engine",
  description: "Test the discovery engine's AI Gate v1.1, Extraction v1.2a, and grounded span extraction live on any investor text, or explore verified examples.",
};

export default function TryPage() {
  return (
    <div className="py-8 max-w-6xl mx-auto space-y-8">
      <div className="pb-2">
        <h1 className="text-[32px] font-semibold tracking-tight text-slate-900">Try the engine</h1>
        <p className="mt-2 max-w-3xl text-[16px] leading-relaxed text-slate-600">
          Paste any investor&apos;s post and watch the same two prompts the engine ran over the public corpus decide whether it is
          about a personal SIP, pull out what happened, and keep only the answers the post itself backs up.
        </p>
      </div>

      <TryEngine
        examples={examplesData}
        promptMeta={{
          gate_version: tryPrompts.gate_version,
          extract_version: tryPrompts.extract_version,
        }}
      />
    </div>
  );
}

