import React, { Suspense } from "react";
import storiesManifest from "@/data/stories_manifest.json";
import { StoryExplorer } from "@/components/StoryExplorer";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Story Explorer | SIP Continuity Discovery Engine",
  description: "Interactive explorer across early-journey first-time investor stories, verbatim quotes, and grounded evidence spans.",
};

export default function StoriesPage() {
  return (
    <div className="py-8 max-w-6xl mx-auto space-y-6">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Story Explorer
        </h1>
        <p className="mt-2 text-base text-muted-foreground max-w-3xl">
          Browse and filter early-journey stories from the discovery engine corpus. Every quote is scrubbed and privacy-checked; all evidence spans are grounded in verbatim user posts.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading story explorer...</p>
          </div>
        }
      >
        <StoryExplorer manifest={storiesManifest} />
      </Suspense>
    </div>
  );
}

