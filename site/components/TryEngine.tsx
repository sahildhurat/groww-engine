"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Play, Check, Minus, CircleDot, RotateCcw } from "lucide-react";

interface TryEngineProps {
  examples: any[];
  promptMeta: { gate_version: string; extract_version: string };
}

type Span = { field: string; value?: any; span: string };
type Result = {
  gate: { rel?: string; type?: string; sip?: number; ft?: string; is_gate_positive?: boolean };
  extraction: Record<string, any> | null;
  grounded_spans: Span[];
  live: boolean;
  latency_ms?: number;
  title?: string;
};

// Plain words for the gate's codes (from the gate prompt's own definitions)
const REL: Record<string, string> = {
  r: "About SIP or mutual-fund investing",
  a: "About an investing app or money, not SIPs",
  n: "Not about investing",
};
const TYPE: Record<string, string> = {
  exp: "the writer's own experience",
  q: "a question about their own situation",
  adv: "general advice to others",
  news: "news or a promotion",
  other: "something else",
};
const FT: Record<string, string> = { s: "Stated", l: "Likely", n: "Experienced investor", u: "Unknown" };
const FIELD_LABELS: Record<string, string> = {
  action_primary: "What they did",
  actions_all: "Also did",
  trigger_primary: "Why",
  triggers: "Because",
  first_time_status: "First-time investor",
  in_app_confusion: "Confused by",
  start_reason: "Why they started",
  experience: "What they saw",
  expectation: "Expected",
  months_since_start: "Months since starting",
  sip_status: "SIP status",
  features: "Feature used",
  unmet_need: "What they needed",
  kept_going_because: "Kept going because",
};
const HUES = ["#F59E0B", "#0EA5E9", "#F43F5E", "#8B5CF6", "#10B981", "#6366F1", "#EC4899", "#14B8A6"];

const pretty = (code: any): string => {
  if (code === null || code === undefined) return "";
  if (typeof code === "object") return Object.values(code).map((x) => pretty(x)).join(", ");
  const s = String(code).replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const fieldLabel = (f: string) => FIELD_LABELS[f] ?? pretty(f);

function spansFrom(extraction: any): Span[] {
  const out: Span[] = [];
  if (!extraction) return out;
  for (const [f, val] of Object.entries(extraction)) {
    const list = Array.isArray(val) ? val : [val];
    list.forEach((it: any) => {
      if (it && typeof it === "object" && typeof it.s === "string" && it.s.trim()) out.push({ field: f, value: it.v, span: it.s });
    });
  }
  return out;
}

function exampleResult(ex: any): Result {
  return {
    gate: { ...ex.gate, is_gate_positive: ex.gate?.rel === "r" && ["exp", "q"].includes(ex.gate?.type) },
    extraction: ex.extraction && Object.keys(ex.extraction).length ? ex.extraction : null,
    grounded_spans: spansFrom(ex.extraction),
    live: false,
    title: ex.title,
  };
}

// The post with each evidence phrase highlighted in its field's colour
function HighlightedPost({ text, spans, colors }: { text: string; spans: Span[]; colors: Record<string, string> }) {
  const ranges = useMemo(() => {
    const r: { start: number; end: number; field: string }[] = [];
    spans.forEach((s) => {
      const i = text.indexOf(s.span);
      if (i >= 0) r.push({ start: i, end: i + s.span.length, field: s.field });
    });
    r.sort((a, b) => a.start - b.start || b.end - a.end);
    const kept: typeof r = [];
    let last = -1;
    r.forEach((x) => {
      if (x.start >= last) {
        kept.push(x);
        last = x.end;
      }
    });
    return kept;
  }, [text, spans]);
  const parts: React.ReactNode[] = [];
  let pos = 0;
  ranges.forEach((x, i) => {
    if (x.start > pos) parts.push(<span key={`t${i}`}>{text.slice(pos, x.start)}</span>);
    parts.push(
      <mark
        key={`m${i}`}
        title={fieldLabel(x.field)}
        className="rounded px-0.5 text-slate-900"
        style={{ background: `${colors[x.field]}33`, boxShadow: `inset 0 -2px 0 ${colors[x.field]}` }}
      >
        {text.slice(x.start, x.end)}
      </mark>
    );
    pos = x.end;
  });
  if (pos < text.length) parts.push(<span key="end">{text.slice(pos)}</span>);
  return <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-slate-800">{parts}</p>;
}

function Stage({ n, title, detail, state }: { n: number; title: string; detail: string; state: "idle" | "run" | "done" | "skip" }) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <span
        className={`relative z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-[12px] font-semibold ${
          state === "done"
            ? "border-emerald-600 bg-emerald-600 text-white"
            : state === "run"
            ? "border-indigo-500 bg-white text-indigo-600"
            : state === "skip"
            ? "border-slate-300 bg-slate-100 text-slate-400"
            : "border-slate-300 bg-white text-slate-500"
        }`}
      >
        {state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : state === "run" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : state === "skip" ? <Minus className="h-3.5 w-3.5" /> : n}
      </span>
      <div>
        <p className={`text-[14px] font-semibold ${state === "skip" ? "text-slate-400" : "text-slate-900"}`}>{title}</p>
        <p className="text-[13px] text-slate-500">{detail}</p>
      </div>
    </li>
  );
}

export function TryEngine({ examples, promptMeta }: TryEngineProps) {
  const [inputText, setInputText] = useState<string>(examples[0]?.text || "");
  const [shownText, setShownText] = useState<string>(examples[0]?.text || "");
  const [selectedExampleId, setSelectedExampleId] = useState<string>(examples[0]?.id || "");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(examples[0] ? exampleResult(examples[0]) : null);

  const pickExample = (ex: any) => {
    setSelectedExampleId(ex.id);
    setInputText(ex.text);
    setShownText(ex.text);
    setErrorMsg(null);
    setResult(exampleResult(ex));
  };

  const run = async () => {
    const trimmed = inputText.trim();
    if (trimmed.length < 20 || trimmed.length > 2000) {
      setErrorMsg("Paste between 20 and 2,000 characters.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSelectedExampleId("");
    setResult(null);
    setShownText(trimmed);
    try {
      const res = await fetch("/api/try", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: trimmed }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "The engine could not finish. Try again, or open one of the sample posts.");
        return;
      }
      setResult({
        gate: data.gate,
        extraction: data.extraction,
        grounded_spans: (data.grounded_spans || []).map((s: any) => ({ field: s.field, value: s.value, span: s.span })),
        live: true,
        latency_ms: data.latency_ms,
      });
    } catch {
      setErrorMsg("The engine could not be reached. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const colors = useMemo(() => {
    const fields = Array.from(new Set((result?.grounded_spans || []).map((s) => s.field)));
    return Object.fromEntries(fields.map((f, i) => [f, HUES[i % HUES.length]]));
  }, [result]);

  const positive = !!result?.gate?.is_gate_positive;
  const gateState = isLoading ? "run" : result ? "done" : "idle";
  const extractState = isLoading ? "idle" : result ? (positive ? "done" : "skip") : "idle";
  const groundState = extractState;
  const facts = useMemo(() => {
    if (!result?.extraction) return [] as { field: string; value: string; spans: string[] }[];
    return Object.entries(result.extraction)
      .filter(([k, v]) => k !== "quote" && k !== "id" && v !== "unknown" && v !== null)
      .map(([k, v]) => {
        const list = Array.isArray(v) ? v : [v];
        return {
          field: k,
          value: list.map((it: any) => (it && typeof it === "object" && "v" in it ? pretty(it.v) : pretty(it))).filter(Boolean).join(", "),
          spans: list.map((it: any) => (it && typeof it === "object" ? it.s : null)).filter((s: any) => typeof s === "string" && s),
        };
      })
      .filter((f) => f.value);
  }, [result]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Left: the post */}
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <label htmlFor="post" className="text-[15px] font-semibold text-slate-900">
            Paste an investor's post
          </label>
          <p className="mt-0.5 text-[13px] text-slate-500">English, Hindi or Hinglish. 20 to 2,000 characters.</p>
          <textarea
            id="post"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setSelectedExampleId("");
            }}
            rows={7}
            className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-[15px] leading-relaxed text-slate-900 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={run}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isLoading ? "Running the engine" : "Run the engine"}
            </button>
            <button type="button" onClick={() => { setInputText(""); setSelectedExampleId(""); }} className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 hover:text-slate-900">
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </button>
            <span className="ml-auto text-[12px] tabular-nums text-slate-400">{inputText.length.toLocaleString()} / 2,000</span>
          </div>
          {errorMsg && <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">{errorMsg}</p>}
          <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
            What you paste goes to the AI model for this one analysis and is not stored or logged here. Each visitor can run up to 5 posts a minute and 30 a day.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold text-slate-900">Or open a real post from the corpus</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">Shows the engine's saved result from the corpus run instantly, without a new AI call.</p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {examples.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => pickExample(ex)}
                className={`rounded-xl border p-3.5 text-left transition-colors ${
                  selectedExampleId === ex.id ? "border-slate-900 bg-white ring-1 ring-slate-900" : "border-slate-200 bg-white hover:border-slate-400"
                }`}
              >
                <span className="block text-[13px] font-semibold text-slate-900">{ex.title}</span>
                <span className="mt-1 text-[12px] leading-snug text-slate-500 line-clamp-3">{ex.text}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Right: what the engine made of it */}
      <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-slate-900">What the engine does</h2>
            <span className="text-[12px] text-slate-500">
              {result ? (result.live ? `Live result${result.latency_ms ? `, ${(result.latency_ms / 1000).toFixed(1)} s` : ""}` : "Saved result from the corpus run") : ""}
            </span>
          </div>
          <ol className="relative mt-4">
            <span aria-hidden className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-slate-200" />
            <Stage n={1} title="Is it about a personal SIP?" detail={`Gate prompt ${promptMeta.gate_version}`} state={gateState as any} />
            <Stage n={2} title="What happened to them?" detail={`Extraction prompt ${promptMeta.extract_version}, only for posts that pass the gate`} state={extractState as any} />
            <Stage n={3} title="Is every answer backed by the post?" detail="Answers without a phrase copied from the post are dropped" state={groundState as any} />
          </ol>
        </section>

        {result && inputText.trim() !== shownText.trim() && !isLoading && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900" data-testid="stale-result">
            You have edited the post. The result below is for the earlier text; press Run to analyse the new one.
          </p>
        )}

        {result && (
          <section
            className={`rounded-2xl border border-slate-200 bg-white p-5 space-y-5 transition-opacity ${
              inputText.trim() !== shownText.trim() && !isLoading ? "opacity-60" : ""
            }`}
          >
            <div>
              <p className="text-[13px] text-slate-500">Verdict</p>
              <p className={`mt-0.5 text-[19px] font-semibold leading-snug ${positive ? "text-emerald-800" : "text-slate-700"}`}>
                {positive ? `${REL[result.gate.rel ?? "r"]}: ${TYPE[result.gate.type ?? "other"] ?? "something else"}` : REL[result.gate.rel ?? "n"] ?? "Not about a personal SIP"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">SIP mentioned: {result.gate.sip ? "yes" : "no"}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">First-time investor: {FT[result.gate.ft ?? "u"] ?? "Unknown"}</span>
                {!positive && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">Not extracted, as in the pipeline</span>}
              </div>
            </div>

            {positive && (
              <>
                <div>
                  <p className="text-[13px] text-slate-500">The post, with the evidence the engine used</p>
                  <div className="mt-2 rounded-xl bg-slate-50 p-4">
                    <HighlightedPost text={shownText} spans={result.grounded_spans} colors={colors} />
                  </div>
                </div>

                <div>
                  <p className="text-[13px] text-slate-500">What it extracted</p>
                  {facts.length ? (
                    <ul className="mt-2 divide-y divide-slate-100">
                      {facts.map((f) => (
                        <li key={f.field} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-2.5">
                          <span className="mt-1.5 h-2.5 w-2.5 rounded-sm" style={{ background: colors[f.field] ?? "#CBD5E1" }} />
                          <div>
                            <p className="text-[14px] text-slate-900">
                              <span className="text-slate-500">{fieldLabel(f.field)}: </span>
                              <span className="font-medium">{f.value}</span>
                            </p>
                            {f.spans.map((s, i) => (
                              <p key={i} className="mt-0.5 text-[13px] leading-snug text-slate-500">“{s}”</p>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[13px] text-slate-500">Nothing could be backed by a phrase from the post, so every field stays unknown.</p>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        <p className="text-[12px] text-slate-500">
          How these prompts did against hand labels: <Link href="/method" className="text-indigo-700 underline underline-offset-2">Method &amp; Validation</Link>.
        </p>
      </div>
    </div>
  );
}
