"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Play, Sparkles, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, ArrowRight, BookOpen, ShieldCheck } from "lucide-react";

interface TryEngineProps {
  examples: any[];
  promptMeta: {
    gate_version: string;
    extract_version: string;
  };
}

function extractInitialSpans(extraction: any): Array<{ field: string; span: string }> {
  const spans: Array<{ field: string; span: string }> = [];
  if (extraction) {
    for (const [f, val] of Object.entries(extraction)) {
      if (Array.isArray(val)) {
        val.forEach((item: any) => {
          if (item?.s) spans.push({ field: f, span: item.s });
        });
      } else if (typeof val === "object" && (val as any)?.s) {
        spans.push({ field: f, span: (val as any).s });
      }
    }
  }
  return spans;
}

export function TryEngine({ examples, promptMeta }: TryEngineProps) {
  const [inputText, setInputText] = useState<string>(examples[0]?.text || "");
  const [selectedExampleId, setSelectedExampleId] = useState<string>(examples[0]?.id || "");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active result state
  const [result, setResult] = useState<any>({
    gate: examples[0]?.gate,
    extraction: examples[0]?.extraction,
    live: false,
    grounded_spans: extractInitialSpans(examples[0]?.extraction),
  });

  // Handle example selection
  const handleSelectExample = (ex: any) => {
    setSelectedExampleId(ex.id);
    setInputText(ex.text);
    setErrorMsg(null);

    // Extract grounded spans from the example
    const spans: Array<{ field: string; span: string }> = [];
    if (ex.extraction) {
      for (const [f, val] of Object.entries(ex.extraction)) {
        if (Array.isArray(val)) {
          val.forEach((item: any) => {
            if (item?.s) spans.push({ field: f, span: item.s });
          });
        } else if (typeof val === "object" && (val as any)?.s) {
          spans.push({ field: f, span: (val as any).s });
        }
      }
    }

    setResult({
      gate: ex.gate,
      extraction: ex.extraction,
      live: false,
      grounded_spans: spans,
    });
  };

  // Run live analysis via /api/try
  const handleRunAnalysis = async () => {
    const trimmed = inputText.trim();
    if (trimmed.length < 20 || trimmed.length > 2000) {
      setErrorMsg("Text must be between 20 and 2000 characters.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSelectedExampleId("");

    try {
      const res = await fetch("/api/try", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(
          data.error ||
            "Analysis could not be completed. Live engine calls may be disabled or rate-limited; please try a cached example below."
        );
        setIsLoading(false);
        return;
      }

      setResult(data);
    } catch (err: any) {
      setErrorMsg("Network error contacting engine endpoint. Please try again or use the cached examples.");
    } finally {
      setIsLoading(false);
    }
  };

  // Render highlighted text with grounded spans
  const renderHighlightedText = () => {
    if (!result?.grounded_spans || result.grounded_spans.length === 0) {
      return <p className="text-sm font-sans leading-relaxed text-foreground/90">{inputText}</p>;
    }

    // Sort spans by appearance in text
    const text = inputText;
    const sortedSpans = [...result.grounded_spans]
      .filter((s) => s.span && text.includes(s.span))
      .sort((a, b) => text.indexOf(a.span) - text.indexOf(b.span));

    if (sortedSpans.length === 0) {
      return <p className="text-sm font-sans leading-relaxed text-foreground/90">{text}</p>;
    }

    const segments: React.ReactNode[] = [];
    let curIdx = 0;

    sortedSpans.forEach((sObj, idx) => {
      const start = text.indexOf(sObj.span, curIdx);
      if (start === -1) return;

      if (start > curIdx) {
        segments.push(text.substring(curIdx, start));
      }

      segments.push(
        <mark
          key={idx}
          className="bg-amber-200 dark:bg-amber-900/60 text-foreground font-semibold px-1 py-0.5 rounded border-b-2 border-amber-500 text-xs"
          title={`Field: ${sObj.field}`}
        >
          {sObj.span}
          <span className="ml-1 text-[9px] uppercase font-mono bg-amber-500/20 text-amber-900 dark:text-amber-200 px-1 py-0.2 rounded font-normal">
            {sObj.field.replace(/_/g, " ")}
          </span>
        </mark>
      );

      curIdx = start + sObj.span.length;
    });

    if (curIdx < text.length) {
      segments.push(text.substring(curIdx));
    }

    return <p className="text-sm font-sans leading-relaxed text-foreground/90">{segments}</p>;
  };

  const isGatePositive = result?.gate?.rel === "r" && (result?.gate?.type === "exp" || result?.gate?.type === "q");

  return (
    <div className="space-y-8">
      {/* Top Banner: Prompt Versions & Methodology Links */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Active Pipeline Prompts:</span>
          </div>
          <span className="font-mono bg-background px-2 py-0.5 rounded border border-border">
            Gate: {promptMeta.gate_version}
          </span>
          <span className="font-mono bg-background px-2 py-0.5 rounded border border-border">
            Extract: {promptMeta.extract_version}
          </span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Link href="/method" className="hover:text-foreground hover:underline inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            Held-out validation report (G1)
          </Link>
        </div>
      </div>

      {/* Input & Action Area */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">
            Investor Post or Comment (20 to 2000 characters)
          </label>
          <span className="text-xs text-muted-foreground font-mono">
            {inputText.length} / 2000 chars
          </span>
        </div>

        <textarea
          rows={5}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setSelectedExampleId("");
          }}
          placeholder="Paste real public investor text about mutual funds, SIP debits, app friction, returns, or cash-flow shocks..."
          className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-sans"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleRunAnalysis}
            disabled={isLoading || inputText.trim().length < 20}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Processing live Haiku models...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                Analyze with Engine
              </>
            )}
          </button>

          <span className="text-xs text-muted-foreground">
            Strict privacy: No input text is stored or logged.
          </span>
        </div>

        {errorMsg && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Engine note:</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}
      </div>

      {/* Cached Examples Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Or test with verified real-corpus examples ({examples.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Instant fallback with full grounded spans
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {examples.map((ex) => (
            <button
              key={ex.id}
              onClick={() => handleSelectExample(ex)}
              className={`text-left rounded-lg border p-3 text-xs transition space-y-1.5 ${
                selectedExampleId === ex.id
                  ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                  : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              <div className="font-medium text-foreground flex items-center justify-between">
                <span>{ex.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  ex.gate?.rel === "r" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                }`}>
                  {ex.gate?.rel === "r" ? "SIP" : "Non-SIP"}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 italic">
                &ldquo;{ex.text}&rdquo;
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Results Display */}
      {result && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Engine Verdict
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isGatePositive
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isGatePositive ? "Gate Positive (SIP Item)" : "Gate Negative (Not personal SIP)"}
                </span>
                <span className="text-xs text-muted-foreground">
                  About SIPs: <strong>{result.gate?.rel === "r" ? "yes" : result.gate?.rel === "a" ? "ambiguous" : "no"}</strong> · <strong>{result.gate?.type === "exp" ? "Own experience" : result.gate?.type === "q" ? "Question" : result.gate?.type === "adv" ? "Advice/news" : "Other"}</strong> · <strong>{result.gate?.ft === "s" ? "First-time: stated" : result.gate?.ft === "l" ? "First-time: likely" : "First-time: not stated"}</strong>
                </span>
              </div>
            </div>

            {result.live && (
              <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-xs font-medium">
                Live Haiku Response ({result.latency_ms} ms)
              </span>
            )}
          </div>

          {/* Highlighted text preview */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Input Text & Grounded Spans
            </div>
            <div className="rounded-lg border border-border bg-background p-4 leading-relaxed">
              {renderHighlightedText()}
            </div>
          </div>

          {/* Extracted Fields */}
          {isGatePositive && result.extraction ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Structured Facts (Extraction Prompt v1.2a + H11 Deterministic Filter)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {Object.entries(result.extraction).map(([field, val]: [string, any]) => {
                  if (field === "id") return null;

                  const isUnknown = val === "unknown" || val === null || (Array.isArray(val) && val.length === 0);

                  return (
                    <div
                      key={field}
                      className={`rounded-lg border p-3 space-y-1 ${
                        isUnknown
                          ? "border-border/50 bg-muted/20 text-muted-foreground"
                          : "border-border bg-background/60 text-foreground"
                      }`}
                    >
                      <div className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        {field.replace(/_/g, " ")}
                      </div>

                      {isUnknown ? (
                        <div className="text-xs text-muted-foreground italic">unknown</div>
                      ) : Array.isArray(val) ? (
                        <div className="space-y-1">
                          {val.map((item, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-semibold">{item.v?.replace(/_/g, " ") || JSON.stringify(item.v)}</span>
                              {item.s && <span className="italic text-muted-foreground ml-1">&ldquo;{item.s}&rdquo;</span>}
                            </div>
                          ))}
                        </div>
                      ) : typeof val === "object" ? (
                        <div className="text-xs">
                          <span className="font-semibold">{val.v?.replace(/_/g, " ") || val.v}</span>
                          {val.s && <span className="italic text-muted-foreground ml-1">&ldquo;{val.s}&rdquo;</span>}
                        </div>
                      ) : (
                        <div className="text-xs font-semibold">{String(val)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : !isGatePositive ? (
            <div className="rounded-lg border border-border bg-muted/30 p-6 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">
                This item did not pass the AI relevance gate.
              </p>
              <p className="text-xs text-muted-foreground max-w-xl mx-auto">
                The gate classifies items as non-SIP when they discuss stock trading, general personal finance, or unrelated topics. Extraction is only executed for items confirmed to represent personal SIP experiences or questions.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

