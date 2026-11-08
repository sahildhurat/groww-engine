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
      <div className="pb-2">
        <h1 className="text-[32px] font-semibold tracking-tight text-slate-900">Story Explorer</h1>
        <p className="mt-2 max-w-3xl text-[16px] leading-relaxed text-slate-600">
          Every early-journey story the engine found in public posts. Pick a lens or click a bar to see who stopped, why, and
          what they said. Quotes are scrubbed of personal details, and every evidence phrase is copied word for word from the post.
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

