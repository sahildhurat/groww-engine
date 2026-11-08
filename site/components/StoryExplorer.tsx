"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import MiniSearch from "minisearch";
import { Search, X, ChevronLeft, ChevronRight, Shuffle, Loader2, Quote } from "lucide-react";
import opportunities from "@/data/opportunities.json";

interface Story {
  uid: string;
  source: string;
  scope: string;
  posted?: string;
  group: string;
  action: string;
  routes?: string[];
  areas?: string[];
  quote?: string;
  spans?: Record<string, any>;
  work?: string;
  age?: number | string;
  amount?: number;
  first_time?: boolean;
  targeted?: boolean;
  unmet_need?: { v?: string; s?: string };
}

interface Manifest {
  total_stories: number;
  chunk_count: number;
  chunk_files: string[];
  total_size_bytes: number;
}

const PAGE_SIZE = 20;

// Display names and colours. Every count on this page is computed from the loaded story files.
const GROUPS: { key: string; label: string; color: string }[] = [
  { key: "stop", label: "Stopped", color: "#C2413A" },
  { key: "consider", label: "Considering stopping", color: "#C98A1B" },
  { key: "cont", label: "Kept going", color: "#1F7A63" },
  { key: "none", label: "No action stated", color: "#A3AEBE" },
];
const GROUP_BY_KEY = Object.fromEntries(GROUPS.map((g) => [g.key, g]));

const AREA_COLORS: Record<string, string> = { A: "#4F46E5", B: "#0E7490", C: "#B45309", D: "#BE185D", E: "#7C3AED" };
const AREAS = (opportunities as { areas: { id: string; name: string }[] }).areas.map((a) => ({
  key: a.id,
  letter: a.id.charAt(0),
  // the area's own name without the bracketed qualifier
  label: a.name.replace(/\s*\(.*\)\s*$/, "").split(" / ")[0],
  color: AREA_COLORS[a.id.charAt(0)] ?? "#64748B",
}));
const AREA_BY_KEY = Object.fromEntries(AREAS.map((a) => [a.key, a]));

const ROUTE_LABELS: Record<string, string> = {
  payment_lapse: "Payment lapse",
  app_friction: "App friction",
  returns_disappointment: "Returns disappointment",
  cash_flow: "Cash flow",
  advice_external: "Someone's advice",
  costs_tax: "Costs, tax, exit load",
  not_stated: "Not stated",
};
const SOURCE_LABELS: Record<string, string> = {
  reddit_post: "Reddit post",
  reddit_comment: "Reddit comment",
  youtube: "YouTube comment",
  playstore: "Play Store review",
  appstore: "App Store review",
  tradingqna: "TradingQ&A",
  social_manual: "Social post",
  x: "X post",
};
const SCOPE_LABELS: Record<string, string> = { groww: "About Groww", other_app: "About another app", general: "No app named" };
const FIELD_LABELS: Record<string, string> = {
  action_primary: "What they did",
  actions_all: "Also did",
  trigger_primary: "Why",
  triggers: "Also because",
  first_time_status: "First-time investor",
  in_app_confusion: "Confused by",
  start_reason: "Why they started",
  experience: "What they saw",
  expectation: "Expected",
  months_since_start: "Months since starting",
  sip_status: "SIP status",
  features: "Feature used",
  support_contact: "Support",
  checks: "What they check",
  sought_help: "Asked for help from",
};

const pretty = (code: string) => {
  const s = String(code).replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const labelFor = (map: Record<string, string>, code: string) => map[code] ?? pretty(code);
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

function valueText(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return Object.values(v).map((x) => pretty(String(x))).join(", ");
  return pretty(String(v));
}

// ---------- Lens: live charts over the filtered stories ----------

function OutcomeBar({ stories, selected, onPick }: { stories: Story[]; selected: string; onPick: (k: string) => void }) {
  const total = stories.length;
  const counts = GROUPS.map((g) => ({ ...g, n: stories.filter((s) => s.group === g.key).length }));
  return (
    <div>
      <div className="flex h-9 w-full overflow-hidden rounded-lg ring-1 ring-slate-200" role="group" aria-label="Stories by outcome">
        {counts.map((g) =>
          g.n > 0 ? (
            <button
              key={g.key}
              type="button"
              onClick={() => onPick(g.key)}
              title={`${g.label}: ${g.n.toLocaleString()} (${pct(g.n, total)}%)`}
              className={`h-full transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                selected !== "all" && selected !== g.key ? "opacity-30" : ""
              }`}
              style={{ width: `${(g.n / total) * 100}%`, background: g.color }}
            />
          ) : null
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
        {counts.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => onPick(g.key)}
            className={`inline-flex items-center gap-2 text-[13px] ${selected === g.key ? "font-semibold text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
          >
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: g.color }} />
            {g.label}
            <span className="tabular-nums text-slate-500">
              {g.n.toLocaleString()} · {pct(g.n, total)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BarList({
  items,
  total,
  selected,
  onPick,
}: {
  items: { key: string; label: string; n: number; color: string; prefix?: string }[];
  total: number;
  selected: string;
  onPick: (k: string) => void;
}) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <ul className="space-y-1.5">
      {items.map((it) => {
        const active = selected === it.key;
        const dim = selected !== "all" && !active;
        return (
          <li key={it.key}>
            <button
              type="button"
              onClick={() => onPick(it.key)}
              className={`group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-1.5 py-1 text-left hover:bg-slate-100 ${dim ? "opacity-45" : ""}`}
            >
              <span className="min-w-0">
                <span className={`block truncate text-[13px] ${active ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                  {it.prefix && <span className="mr-1.5 font-semibold" style={{ color: it.color }}>{it.prefix}</span>}
                  {it.label}
                </span>
                <span className="mt-1 block h-2 rounded-full bg-slate-100">
                  <span className="block h-2 rounded-full" style={{ width: `${(it.n / max) * 100}%`, background: it.color }} />
                </span>
              </span>
              <span className="text-right text-[12px] tabular-nums text-slate-500">
                {it.n.toLocaleString()}
                <span className="block text-[11px] text-slate-400">{pct(it.n, total)}%</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Timeline({ stories }: { stories: Story[] }) {
  const byMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of stories) {
      if (!s.posted || !/^\d{4}-\d{2}$/.test(s.posted)) continue;
      m.set(s.posted, (m.get(s.posted) ?? 0) + 1);
    }
    return m;
  }, [stories]);
  const months = useMemo(() => {
    const keys = Array.from(byMonth.keys()).sort();
    if (!keys.length) return [] as string[];
    // from January 2023 (or the first month, if later) to the last month with a story
    const startKey = keys[0] > "2023-01" ? keys[0] : "2023-01";
    const out: string[] = [];
    let [y, mo] = startKey.split("-").map(Number);
    const [ey, emo] = keys[keys.length - 1].split("-").map(Number);
    while (y < ey || (y === ey && mo <= emo)) {
      out.push(`${y}-${String(mo).padStart(2, "0")}`);
      mo += 1;
      if (mo > 12) { mo = 1; y += 1; }
    }
    return out;
  }, [byMonth]);
  const earlier = useMemo(() => Array.from(byMonth.entries()).filter(([k]) => months.length && k < months[0]).reduce((a, [, n]) => a + n, 0), [byMonth, months]);
  if (!months.length) return <p className="text-[13px] text-slate-500">No dated stories in this view.</p>;
  const max = Math.max(1, ...months.map((k) => byMonth.get(k) ?? 0));
  const W = 100 / months.length;
  return (
    <div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-28 w-full" role="img" aria-label="Stories posted per month">
        {months.map((k, i) => {
          const n = byMonth.get(k) ?? 0;
          const h = (n / max) * 38;
          return (
            <rect key={k} x={i * W + W * 0.12} y={40 - h} width={W * 0.76} height={h} fill={k.endsWith("-01") ? "#334155" : "#94A3B8"} rx={0.4}>
              <title>{`${k}: ${n} stories`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500 tabular-nums">
        <span>{months[0]}</span>
        <span>{months[months.length - 1]}</span>
      </div>
      {earlier > 0 && <p className="mt-1 text-[11px] text-slate-500">Plus {earlier.toLocaleString()} stories posted before {months[0]}.</p>}
    </div>
  );
}

// ---------- Story card ----------

function StoryCard({ story, spotlight = false }: { story: Story; spotlight?: boolean }) {
  const g = GROUP_BY_KEY[story.group] ?? GROUP_BY_KEY.none;
  const spans = story.spans ? Object.entries(story.spans).filter(([k]) => k !== "unmet_need") : [];
  const chips = spans.flatMap(([key, item]) => {
    const list = Array.isArray(item) ? item : [item];
    return list
      .filter((si: any) => si && (si.v !== undefined || si.s))
      .map((si: any, i: number) => ({ id: `${key}-${i}`, field: labelFor(FIELD_LABELS, key), value: valueText(si.v), span: si.s as string | undefined }));
  });
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white pl-6 pr-5 py-5 ${spotlight ? "border-slate-900 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.5)]" : "border-slate-200"}`}
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: g.color }} />
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <span className="font-semibold" style={{ color: g.color === "#A3AEBE" ? "#64748B" : g.color }}>
          {g.label}
        </span>
        <span className="text-slate-600">{labelFor(SOURCE_LABELS, story.source)}</span>
        {story.posted && story.posted !== "unknown" && <span className="text-slate-500 tabular-nums">{story.posted}</span>}
        {story.scope && story.scope !== "general" && <span className="text-slate-500">{labelFor(SCOPE_LABELS, story.scope)}</span>}
        {story.first_time && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-800">First-time (stated or likely)</span>}
        {story.targeted && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[12px] font-semibold text-violet-800">Targeted top-up</span>}
        <span className="ml-auto text-[12px] text-slate-400">{story.uid}</span>
      </header>

      {story.quote ? (
        <blockquote className="mt-3 flex gap-2.5 text-[16px] leading-relaxed text-slate-900">
          <Quote className="mt-1 h-4 w-4 flex-shrink-0 text-slate-300" />
          <span>{story.quote}</span>
        </blockquote>
      ) : (
        <p className="mt-3 text-[13px] text-slate-500">No quote shown for this story (it did not pass the quote check).</p>
      )}

      {story.unmet_need?.v && (
        <p className="mt-3 text-[14px] text-slate-700">
          <span className="text-slate-500">What they needed: </span>
          {story.unmet_need.v}
        </p>
      )}

      {chips.length > 0 && (
        <details className="group mt-3" open={spotlight}>
          <summary className="flex cursor-pointer list-none flex-wrap gap-1.5 [&::-webkit-details-marker]:hidden">
            {chips.slice(0, 6).map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[12px] text-slate-700">
                <span className="text-slate-500">{c.field}:</span>
                <span className="font-medium text-slate-900">{c.value}</span>
              </span>
            ))}
            <span className="inline-flex items-center rounded-full px-2 py-1 text-[12px] font-medium text-indigo-700 underline-offset-2 group-open:hidden hover:underline">
              Show the evidence
            </span>
          </summary>
          <ul className="mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
            {chips.map((c) =>
              c.span ? (
                <li key={c.id} className="text-[13px] leading-snug">
                  <span className="text-slate-500">{c.field} · {c.value}</span>
                  <span className="mt-0.5 block text-slate-800">
                    <mark className="rounded bg-amber-100 px-1 text-slate-900">{c.span}</mark>
                  </span>
                </li>
              ) : null
            )}
          </ul>
        </details>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 text-[12px] text-slate-600">
        {(story.areas || []).map((a) => {
          const area = AREA_BY_KEY[a];
          return (
            <span key={a} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: area?.color ?? "#64748B" }} />
              {area ? `${area.letter}. ${area.label}` : pretty(a)}
            </span>
          );
        })}
        {(story.routes || []).filter((r) => r !== "not_stated").map((r) => (
          <span key={r} className="text-slate-500">Stop route: {labelFor(ROUTE_LABELS, r)}</span>
        ))}
        {story.work && <span className="text-slate-500">{pretty(story.work)}</span>}
        {story.amount ? <span className="text-slate-500 tabular-nums">SIP ₹{story.amount.toLocaleString("en-IN")}</span> : null}
      </footer>
    </article>
  );
}

// ---------- Explorer ----------

const PRESETS: { label: string; params: Record<string, string> }[] = [
  { label: "Stopped after a payment problem", params: { group: "stop", area: "A_first_debit_and_autopay" } },
  { label: "Where is my money?", params: { area: "B_money_status_and_resolution" } },
  { label: "Thinking of stopping after losses", params: { group: "consider", area: "C_returns_expectations" } },
  { label: "Cash crunch", params: { area: "D_cash_flow_flex" } },
  { label: "Kept going", params: { group: "cont" } },
];
const FILTER_KEYS = ["q", "group", "source", "scope", "route", "area", "work", "first_time"];

export function StoryExplorer({ manifest }: { manifest: Manifest }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [stories, setStories] = useState<Story[]>([]);
  const [loadedChunks, setLoadedChunks] = useState<number>(0);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(true);
  const [spotlight, setSpotlight] = useState<Story | null>(null);

  const qParam = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState<string>(qParam);
  useEffect(() => setSearchInput(qParam), [qParam]);

  const selectedGroup = searchParams.get("group") || "all";
  const selectedSource = searchParams.get("source") || "all";
  const selectedScope = searchParams.get("scope") || "all";
  const selectedRoute = searchParams.get("route") || "all";
  const selectedArea = searchParams.get("area") || "all";
  const selectedWork = searchParams.get("work") || "all";
  const selectedFirstTime = searchParams.get("first_time") || "all";
  const selectedPage = parseInt(searchParams.get("page") || "1", 10);

  const miniSearchRef = useRef<MiniSearch | null>(null);
  useEffect(() => {
    miniSearchRef.current = new MiniSearch({
      fields: ["quote", "unmet_need", "spans_text", "uid"],
      storeFields: ["uid"],
      searchOptions: { boost: { quote: 2, unmet_need: 1.5, uid: 3 }, fuzzy: 0.2, prefix: true },
    });
  }, []);

  // Fetch chunks progressively: chunk 1 immediately, then the rest
  useEffect(() => {
    let cancelled = false;
    async function loadAllChunks() {
      setIsLoadingMore(true);
      for (let i = 1; i <= manifest.chunk_count; i++) {
        if (cancelled) break;
        try {
          const res = await fetch(`/api/stories?chunk=${i}`);
          if (!res.ok) continue;
          const chunkStories: Story[] = await res.json();
          if (cancelled) break;
          if (miniSearchRef.current) {
            miniSearchRef.current.addAll(
              chunkStories.map((s) => ({
                id: s.uid,
                uid: s.uid,
                quote: s.quote || "",
                unmet_need: s.unmet_need?.v || "",
                spans_text: s.spans
                  ? Object.values(s.spans)
                      .map((item: any) =>
                        typeof item === "string" ? item : Array.isArray(item) ? item.map((x: any) => x?.s || x?.v || "").join(" ") : item?.s || item?.v || ""
                      )
                      .join(" ")
                  : "",
              }))
            );
          }
          setStories((prev) => [...prev, ...chunkStories]);
          setLoadedChunks(i);
        } catch {
          /* skip a chunk that fails to load */
        }
      }
      setIsLoadingMore(false);
    }
    loadAllChunks();
    return () => {
      cancelled = true;
    };
  }, [manifest.chunk_count]);

  const pushParams = useCallback(
    (params: URLSearchParams) => router.push(`${pathname}?${params.toString()}`, { scroll: false }),
    [router, pathname]
  );

  const updateFilter = useCallback(
    (key: string, val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all" || !val) params.delete(key);
      else params.set(key, val);
      params.set("page", "1");
      pushParams(params);
    },
    [searchParams, pushParams]
  );
  // clicking the selected bar again clears that filter
  const toggleFilter = (key: string, current: string, val: string) => updateFilter(key, current === val ? "all" : val);

  const applyPreset = (p: Record<string, string>) => {
    const params = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => params.set(k, v));
    params.set("page", "1");
    setSpotlight(null);
    pushParams(params);
  };

  const matchedUids = useMemo(() => {
    if (!qParam.trim() || !miniSearchRef.current) return null;
    // A full story id (e.g. "reddit:post:1s9vjfd") opens exactly that story, not fuzzy neighbours.
    const exact = stories.find((s) => s.uid === qParam.trim());
    if (exact) return new Set([exact.uid]);
    try {
      return new Set(miniSearchRef.current.search(qParam.trim()).map((r) => r.id as string));
    } catch {
      return null;
    }
  }, [qParam, stories.length]);

  // All filters except one: used for the lens, so a chart still shows the other choices of its own filter.
  const passes = useCallback(
    (s: Story, skip?: string) => {
      if (matchedUids && !matchedUids.has(s.uid)) return false;
      if (skip !== "group" && selectedGroup !== "all" && s.group !== selectedGroup) return false;
      if (selectedSource !== "all" && s.source !== selectedSource) return false;
      if (selectedScope !== "all" && s.scope !== selectedScope) return false;
      if (skip !== "route" && selectedRoute !== "all" && !(s.routes || []).includes(selectedRoute)) return false;
      if (skip !== "area" && selectedArea !== "all" && !(s.areas || []).includes(selectedArea)) return false;
      if (selectedWork !== "all" && s.work !== selectedWork) return false;
      if (selectedFirstTime === "first_time" && s.first_time !== true) return false;
      if (selectedFirstTime === "experienced" && s.first_time === true) return false;
      return true;
    },
    [matchedUids, selectedGroup, selectedSource, selectedScope, selectedRoute, selectedArea, selectedWork, selectedFirstTime]
  );

  const filteredStories = useMemo(() => stories.filter((s) => passes(s)), [stories, passes]);
  const forGroupLens = useMemo(() => stories.filter((s) => passes(s, "group")), [stories, passes]);
  const forAreaLens = useMemo(() => stories.filter((s) => passes(s, "area")), [stories, passes]);
  const forRouteLens = useMemo(() => stories.filter((s) => passes(s, "route")), [stories, passes]);

  // Filter menus built from the data, with counts
  const sourceOptions = useMemo(() => {
    const m = new Map<string, number>();
    stories.forEach((s) => m.set(s.source, (m.get(s.source) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [stories]);
  const scopeOptions = useMemo(() => {
    const m = new Map<string, number>();
    stories.forEach((s) => s.scope && m.set(s.scope, (m.get(s.scope) ?? 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [stories]);

  const areaItems = AREAS.map((a) => ({
    key: a.key,
    label: a.label,
    prefix: a.letter,
    color: a.color,
    n: forAreaLens.filter((s) => (s.areas || []).includes(a.key)).length,
  }));
  // Routes are tagged on every story; "why people stopped" counts the stopped stories only.
  const stoppedForRoutes = useMemo(() => forRouteLens.filter((s) => s.group === "stop"), [forRouteLens]);
  const routeItems = useMemo(() => {
    const m = new Map<string, number>();
    stoppedForRoutes.forEach((s) => (s.routes || []).forEach((r) => r !== "not_stated" && m.set(r, (m.get(r) ?? 0) + 1)));
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, n]) => ({ key, n, label: labelFor(ROUTE_LABELS, key), color: "#C2413A" }));
  }, [stoppedForRoutes]);

  const totalPages = Math.max(1, Math.ceil(filteredStories.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, selectedPage), totalPages);
  const pageStories = useMemo(() => filteredStories.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filteredStories, currentPage]);
  const targetedInView = filteredStories.filter((s) => s.targeted).length;

  const setPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    pushParams(params);
    document.getElementById("story-list")?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const hasActiveFilters = FILTER_KEYS.some((k) => searchParams.get(k));
  const surprise = () => {
    const pool = filteredStories.filter((s) => s.quote);
    if (!pool.length) return;
    setSpotlight(pool[Math.floor(Math.random() * pool.length)]);
  };

  const selectCls =
    "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

  return (
    <div className="space-y-6">
      {/* Lenses: one tap sets a whole view */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.params)}
            className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-[13px] text-slate-800 hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-colors"
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={surprise}
          disabled={!filteredStories.length}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-slate-700 disabled:opacity-40"
        >
          <Shuffle className="h-3.5 w-3.5" />
          Show me a random story
        </button>
        {hasActiveFilters && (
          <button type="button" onClick={() => { setSpotlight(null); router.push(pathname, { scroll: false }); }} className="inline-flex items-center gap-1 px-2 py-1.5 text-[13px] text-slate-600 hover:text-slate-900">
            <X className="h-3.5 w-3.5" /> Clear all
          </button>
        )}
      </div>

      {spotlight && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-slate-600">A random story from this view</p>
            <div className="flex gap-3 text-[13px]">
              <button type="button" onClick={surprise} className="font-medium text-indigo-700 hover:underline">Another one</button>
              <button type="button" onClick={() => setSpotlight(null)} className="text-slate-600 hover:underline">Close</button>
            </div>
          </div>
          <StoryCard story={spotlight} spotlight />
        </div>
      )}

      {/* The lens: live charts over what is selected */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-label="What this view contains">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold text-slate-900">
            {filteredStories.length.toLocaleString()} stories in this view
          </h2>
          <span className="text-[13px] text-slate-500 tabular-nums">
            {isLoadingMore ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading part {loadedChunks + 1} of {manifest.chunk_count}
              </span>
            ) : (
              `of ${stories.length.toLocaleString()} early-journey stories`
            )}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-slate-500">Click any bar to filter by it; click it again to clear.</p>

        <div className="mt-5">
          <h3 className="mb-2 text-[13px] font-medium text-slate-700">What they did</h3>
          <OutcomeBar stories={forGroupLens} selected={selectedGroup} onPick={(k) => toggleFilter("group", selectedGroup, k)} />
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-3">
          <div>
            <h3 className="text-[13px] font-medium text-slate-700">Opportunity areas</h3>
            <p className="mb-2 text-[12px] text-slate-500">Share of the stories in this view; a story can sit in more than one area.</p>
            <BarList items={areaItems} total={forAreaLens.length} selected={selectedArea} onPick={(k) => toggleFilter("area", selectedArea, k)} />
          </div>
          <div>
            <h3 className="text-[13px] font-medium text-slate-700">Why people stopped</h3>
            <p className="mb-2 text-[12px] text-slate-500">Share of the {stoppedForRoutes.length.toLocaleString()} stopped stories in this view; a story can give more than one reason.</p>
            {routeItems.length ? (
              <BarList
                items={routeItems}
                total={stoppedForRoutes.length}
                selected={selectedRoute}
                onPick={(k) => {
                  if (selectedRoute === k) return updateFilter("route", "all");
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("route", k);
                  params.set("group", "stop");
                  params.set("page", "1");
                  pushParams(params);
                }}
              />
            ) : (
              <p className="text-[13px] text-slate-500">No stated stop routes in this view.</p>
            )}
          </div>
          <div>
            <h3 className="text-[13px] font-medium text-slate-700">When they were posted</h3>
            <p className="mb-2 text-[12px] text-slate-500">Stories per month; January bars are darker.</p>
            <Timeline stories={filteredStories} />
          </div>
        </div>
      </section>

      {/* Search and the remaining filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            updateFilter("q", searchInput.trim());
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search quotes, needs, spans or IDs, then press Enter"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
            {searchInput && (
              <button type="button" aria-label="Clear search" onClick={() => { setSearchInput(""); updateFilter("q", ""); }} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-700">
            Search
          </button>
        </form>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="text-[12px] text-slate-500">
            Source
            <select className={`mt-1 ${selectCls}`} value={selectedSource} onChange={(e) => updateFilter("source", e.target.value)}>
              <option value="all">All sources</option>
              {sourceOptions.map(([k, n]) => (
                <option key={k} value={k}>{labelFor(SOURCE_LABELS, k)} ({n.toLocaleString()})</option>
              ))}
            </select>
          </label>
          <label className="text-[12px] text-slate-500">
            App named
            <select className={`mt-1 ${selectCls}`} value={selectedScope} onChange={(e) => updateFilter("scope", e.target.value)}>
              <option value="all">Any</option>
              {scopeOptions.map(([k, n]) => (
                <option key={k} value={k}>{labelFor(SCOPE_LABELS, k)} ({n.toLocaleString()})</option>
              ))}
            </select>
          </label>
          <label className="text-[12px] text-slate-500">
            Investor
            <select className={`mt-1 ${selectCls}`} value={selectedFirstTime} onChange={(e) => updateFilter("first_time", e.target.value)}>
              <option value="all">All investors</option>
              <option value="first_time">First-time (stated or likely)</option>
              <option value="experienced">Not marked first-time</option>
            </select>
          </label>
          <label className="text-[12px] text-slate-500">
            Outcome
            <select className={`mt-1 ${selectCls}`} value={selectedGroup} onChange={(e) => updateFilter("group", e.target.value)}>
              <option value="all">All outcomes</option>
              {GROUPS.map((g) => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Stories */}
      <section id="story-list" className="space-y-3 scroll-mt-20">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <p className="text-[14px] text-slate-700">
            Showing <strong className="text-slate-900">{filteredStories.length.toLocaleString()}</strong> of {stories.length.toLocaleString()} loaded stories
            {targetedInView > 0 && (
              <span className="block text-[12px] text-slate-500">
                Includes {targetedInView.toLocaleString()} targeted top-up stories (marked), which the shares on the other pages leave out.
              </span>
            )}
          </p>
          <span className="text-[13px] text-slate-500 tabular-nums">Page {currentPage} of {totalPages}</span>
        </div>

        {pageStories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-[15px] font-medium text-slate-900">{isLoadingMore ? "Loading stories" : "No stories match this view"}</p>
            {!isLoadingMore && <p className="mt-1 text-[13px] text-slate-500">Clear a filter or try one of the lenses above.</p>}
          </div>
        ) : (
          pageStories.map((story) => <StoryCard key={story.uid} story={story} />)
        )}

        {totalPages > 1 && (
          <nav className="flex items-center justify-between pt-2" aria-label="Pages">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="text-[13px] text-slate-500 tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
