"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ErrorBar, Cell } from "recharts";
import { FormattedText, MarkdownBlocks } from "@/components/FormattedText";
import { Calendar, HelpCircle, Layers, ArrowRight, Info, Clock, Route, Users } from "lucide-react";

// Where "Explore matching stories" lands for each question: the Story Explorer has no question filter, so each question
// opens the outcome group it is about (Q3 stoppers, Q7 continuers), or all stories.
const STORY_LINK: Record<string, string> = {
  Q3: "/stories?group=stop",
  Q7: "/stories?group=cont",
};

// Short tab labels, so every tab names its question.
const SHORT_LABEL: Record<string, string> = {
  Q1: "Why they start",
  Q2: "After starting",
  Q3: "Why they stop",
  Q4: "What they check",
  Q5: "In-app confusion",
  Q6: "Outside the app",
  Q7: "Who keeps going",
  Q8: "By segment",
  Q9: "Unmet needs",
};

interface QuestionViewProps {
  questionsData: any;
}

export function QuestionView({ questionsData }: QuestionViewProps) {
  const { labels, questions, months_at_action, event_timing, stop_routes, segments } = questionsData;
  const [activeTab, setActiveTab] = useState<string>("Q1");

  // Selected toggles
  const [pop, setPop] = useState<string>("E"); // "E" or "all"
  const [group, setGroup] = useState<string>("any"); // "any", "stop", "consider", "cont"
  const [src, setSrc] = useState<string>("pooled"); // "pooled", "reddit", "youtube", "appreviews"

  const currentQ = useMemo(() => {
    return questions.find((q: any) => q.id === activeTab) || questions[0];
  }, [questions, activeTab]);

  // Determine available tables for this question
  const tableKeys = Object.keys(currentQ.tables || {});
  const [activeTableKey, setActiveTableKey] = useState<string>(tableKeys[0] || "");

  // Update activeTableKey when question changes
  React.useEffect(() => {
    if (tableKeys.length > 0 && !tableKeys.includes(activeTableKey)) {
      setActiveTableKey(tableKeys[0]);
    }
  }, [tableKeys, activeTableKey]);

  // Get current table data
  const currentTableData = useMemo(() => {
    if (!activeTableKey || !currentQ.tables[activeTableKey]) return null;
    const tData = currentQ.tables[activeTableKey];

    // Exact cut only: no silent fallback to pooled data when a combination was not computed (audit E07).
    return tData["MAIN"]?.[pop]?.[group]?.[src] ?? null;
  }, [currentQ, activeTableKey, pop, group, src]);

  // Which sources exist for the chosen population and group (per-source cuts exist only for an outcome group).
  const sourceAvailable = (s: string) =>
    !!(activeTableKey && currentQ.tables?.[activeTableKey]?.MAIN?.[pop]?.[group]?.[s]);
  React.useEffect(() => {
    if (activeTableKey && src !== "pooled" && !sourceAvailable(src)) setSrc("pooled");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTableKey, pop, group, src]);

  // Transform rows for Recharts
  const chartData = useMemo(() => {
    if (!currentTableData || !currentTableData.rows) return [];
    return currentTableData.rows.slice(0, 10).map((r: any) => {
      const p = r.share;
      const ci = r.ci95 || [p, p];
      const lowErr = Math.max(0, p - ci[0]);
      const highErr = Math.max(0, ci[1] - p);
      const labelText = labels[r.code] || r.code;

      return {
        code: r.code,
        label: labelText,
        share: p,
        sharePct: (p * 100).toFixed(1),
        ciLowPct: (ci[0] * 100).toFixed(1),
        ciHighPct: (ci[1] * 100).toFixed(1),
        error: [lowErr, highErr],
      };
    });
  }, [currentTableData, labels]);

  // Dynamic chart height based on item count
  const chartHeight = Math.max(260, chartData.length * 38);

  return (
    <div className="space-y-8">
      {/* Question selection tabs */}
      <div className="border-b border-slate-200">
        <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-thin">
          {questions.map((q: any) => {
            const active = q.id === activeTab;
            return (
              <button
                key={q.id}
                onClick={() => setActiveTab(q.id)}
                className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>Q{q.num}</span>
                <span className="hidden md:inline font-normal opacity-90">{SHORT_LABEL[q.id] ?? q.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Question header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Question {currentQ.num} of 9
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{currentQ.title}</h1>
          </div>
          <Link
            href={STORY_LINK[currentQ.id] ?? "/stories"}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 self-start sm:self-auto"
          >
            <span>Explore matching stories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Toggles bar (hidden where the question has no chart to filter, e.g. Q8; audit E08) */}
        {tableKeys.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Table selector if multiple tables exist */}
            {tableKeys.length > 1 && (
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-slate-500">Metric:</span>
                <select
                  value={activeTableKey}
                  onChange={(e) => setActiveTableKey(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                >
                  {tableKeys.map((tk) => (
                    <option key={tk} value={tk}>
                      {tk.replace(/^Q\d+_/, "").replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Population toggle */}
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-slate-500">Population:</span>
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => setPop("E")}
                  className={`px-2.5 py-1 rounded-l text-xs font-medium border ${
                    pop === "E"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  Early-Journey (E)
                </button>
                <button
                  type="button"
                  onClick={() => setPop("all")}
                  className={`px-2.5 py-1 rounded-r text-xs font-medium border border-l-0 ${
                    pop === "all"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  All Episodes
                </button>
              </div>
            </div>

            {/* Group toggle */}
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-slate-500">Action Group:</span>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
              >
                <option value="any">All groups</option>
                <option value="stop">Stopped SIP</option>
                <option value="consider">Considering Stopping</option>
                <option value="cont">Kept Going</option>
              </select>
            </div>

            {/* Source toggle */}
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-slate-500">Source:</span>
              <select
                value={src}
                onChange={(e) => setSrc(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
              >
                <option value="pooled">Pooled (All Sources)</option>
                {[
                  ["reddit", "Reddit"],
                  ["youtube", "YouTube"],
                  ["appreviews", "App Reviews"],
                ].map(([v, l]) => (
                  <option key={v} value={v} disabled={!sourceAvailable(v)}>
                    {sourceAvailable(v) ? l : `${l} (pick an outcome group)`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sample size badge */}
          {currentTableData && (
            <div className="text-slate-500 font-mono text-xs flex items-center space-x-1.5">
              <span>n = <strong className="text-slate-900">{currentTableData.n}</strong></span>
              {currentTableData.n_eff && (
                <span className="text-slate-400">(n_eff = {currentTableData.n_eff})</span>
              )}
            </div>
          )}
        </div>
        )}

        {/* Horizontal Bar Chart */}
        {chartData.length > 0 ? (
          <div className="pt-2 pb-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Whiskers show Wilson 95% confidence intervals on Kish effective n</span>
              <span className="font-mono">Metric: share of stated mentions</span>
            </div>

            <div
              style={{ width: "100%", height: chartHeight }}
              role="img"
              aria-label={`${currentQ.title}: bar chart of ${chartData.length} categories; the table below lists every value.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 35, left: 160, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    domain={[0, "auto"]}
                    tickFormatter={(val) => `${Math.round(val * 100)}%`}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={150}
                    tick={{ fontSize: 11, fill: "#1e293b", fontWeight: 500 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg space-y-1">
                          <p className="font-bold text-slate-100">{d.label}</p>
                          <p className="font-mono text-indigo-300">Share: {d.sharePct}%</p>
                          <p className="font-mono text-slate-300 text-[11px]">
                            95% CI: [{d.ciLowPct}%, {d.ciHighPct}%]
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="share" fill="#4f46e5" radius={[0, 4, 4, 0]}>
                    <ErrorBar dataKey="error" width={4} strokeWidth={2} stroke="#1e1b4b" direction="x" />
                    {chartData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#4338ca" : "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <details className="mt-2 text-xs text-slate-600">
              <summary className="cursor-pointer font-medium text-indigo-700">Show these numbers as a table</summary>
              <table className="mt-2 min-w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th scope="col" className="py-1 pr-3 font-semibold">Category</th>
                    <th scope="col" className="py-1 pr-3 font-semibold text-right">Share</th>
                    <th scope="col" className="py-1 font-semibold text-right">95% CI</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {chartData.map((d: any) => (
                    <tr key={d.code} className="border-t border-slate-100">
                      <td className="py-1 pr-3 text-slate-800">{d.label}</td>
                      <td className="py-1 pr-3 text-right">{d.sharePct}%</td>
                      <td className="py-1 text-right">{d.ciLowPct}–{d.ciHighPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-slate-500">Base: n = {currentTableData?.n}{currentTableData?.n_eff ? `, effective n = ${currentTableData.n_eff}` : ""}.</p>
            </details>
          </div>
        ) : (
          !currentQ.has_segments && !currentQ.has_timing && (
            <div className="py-8 text-center text-slate-500 text-sm">
              This cut was not computed. Pick another population, group or source.
            </div>
          )
        )}

        {/* Q2 Special Section: Months-at-action & Event-timing */}
        {currentQ.has_timing && (
          <div className="space-y-6 pt-6 border-t border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>When First-Time Investors Act (Stated Timing)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribution of stated months at action among first-time investors who explicitly report when they acted.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(months_at_action || {}).map(([gKey, gData]: [string, any]) => {
                const groupName =
                  gKey === "stop"
                    ? "Stopped SIP"
                    : gKey === "consider"
                    ? "Considering Stopping"
                    : gKey === "cont"
                    ? "Kept Going"
                    : gKey === "stop_ft"
                    ? "First-Time Stopped"
                    : gKey;

                return (
                  <div key={gKey} className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 font-bold text-slate-800">
                      <span>{groupName}</span>
                      <span className="font-mono text-slate-500">n = {gData.n_w}</span>
                    </div>
                    <div className="space-y-1">
                      {["0-3", "4-6", "7-12", "13-24", "25+"].map((bucket) => {
                        const val = gData[bucket];
                        if (val === undefined) return null;
                        const pct = (val * 100).toFixed(0);
                        return (
                          <div key={bucket} className="flex justify-between items-center text-slate-600">
                            <span>{bucket} months:</span>
                            <span className="font-mono font-semibold text-slate-900">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Event Timing Table */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 mt-4 mb-2">
                What Happens When: Most Common Dated Events Across Journey (Second Read J1)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-left font-semibold">
                      <th className="py-2.5 px-3">Months Window</th>
                      <th className="py-2.5 px-3">Sample Size</th>
                      <th className="py-2.5 px-3">Most Frequent Events & Shares</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(event_timing || {})
                      .sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10))
                      .map(([windowKey, winData]: [string, any]) => (
                      <tr key={windowKey} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{windowKey} months</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">n = {winData.n_events}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {winData.top?.slice(0, 5).map(([evCode, share]: [string, number], i: number) => (
                            <span key={evCode} className="inline-block mr-3">
                              {labels[evCode] || evCode}: <strong className="font-mono text-slate-900">{(share * 100).toFixed(0)}%</strong>
                              {i < 4 ? ";" : ""}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Q3 Special Section: Routes to a Stop Table */}
        {currentQ.has_routes && (
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Route className="w-4 h-4 text-indigo-600" />
                <span>Routes to a Stop by Source (Early-Journey Core, n={stop_routes["E|pooled"]?.n ?? ""})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                A story can describe more than one route. Proportions differ across communities: Reddit stoppers lean toward returns; YouTube and app reviews lean heavily toward payment and friction.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-left font-semibold">
                    <th className="py-2.5 px-3">Stop Route</th>
                    <th className="py-2.5 px-3 text-center">Pooled</th>
                    <th className="py-2.5 px-3 text-center">Reddit</th>
                    <th className="py-2.5 px-3 text-center">YouTube</th>
                    <th className="py-2.5 px-3 text-center">App Reviews</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {[
                    { key: "payment_lapse", name: "Payment lapse (failed debit, mandate, first debit)" },
                    { key: "app_friction", name: "App friction (bugs, confusion, trust)" },
                    { key: "returns_disappointment", name: "Returns disappointment (loss, flat, market fall)" },
                    { key: "cash_flow", name: "Cash flow (crunch, income change, life event)" },
                    { key: "costs_tax", name: "Costs, tax, exit load" },
                    { key: "advice_external", name: "Advice from others" },
                    { key: "not_stated", name: "Not stated" },
                  ].map((routeItem) => {
                    const pooled = stop_routes["E|pooled"]?.[routeItem.key]?.share;
                    const reddit = stop_routes["E|reddit"]?.[routeItem.key]?.share;
                    const youtube = stop_routes["E|youtube"]?.[routeItem.key]?.share;
                    const appreviews = stop_routes["E|appreviews"]?.[routeItem.key]?.share;

                    return (
                      <tr key={routeItem.key} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-sans font-medium text-slate-900">{routeItem.name}</td>
                        <td className="py-2 px-3 text-center text-slate-900 font-bold">
                          {pooled !== undefined ? `${(pooled * 100).toFixed(0)}%` : "-"}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700">
                          {reddit !== undefined ? `${(reddit * 100).toFixed(0)}%` : "-"}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700">
                          {youtube !== undefined ? `${(youtube * 100).toFixed(0)}%` : "-"}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700">
                          {appreviews !== undefined ? `${(appreviews * 100).toFixed(0)}%` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50/80 font-sans font-semibold text-slate-600">
                    <td className="py-2 px-3">Total Stop Episodes (n)</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-900 font-bold">
                      {stop_routes["E|pooled"]?.n ?? "-"}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-slate-900 font-bold">
                      {stop_routes["E|reddit"]?.n ?? "-"}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-slate-900 font-bold">
                      {stop_routes["E|youtube"]?.n ?? "-"}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-slate-900 font-bold">
                      {stop_routes["E|appreviews"]?.n ?? "-"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Q8 Special Section: Segment Table with CIs */}
        {currentQ.has_segments && (
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Stop Share by Investor Segment (Early Journey Core)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Stop share = stop ÷ (stop + continue) among early-journey stories stating that segment. It compares segments rather than representing a general population prevalence.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-left font-semibold">
                    <th className="py-2.5 px-3">Segment Dimension</th>
                    <th className="py-2.5 px-3">Segment Value</th>
                    <th className="py-2.5 px-3 text-right">Sample (n)</th>
                    <th className="py-2.5 px-3 text-right">Stop Share</th>
                    <th className="py-2.5 px-3 text-right">Wilson 95% CI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(segments?.["MAIN"]?.["E"] || {}).map(([segKey, segItems]: [string, any]) => {
                    return segItems.slice(0, 6).map((item: any, idx: number) => {
                      const sharePct = (item.stop_share * 100).toFixed(0);
                      const ciLow = (item.ci95[0] * 100).toFixed(0);
                      const ciHigh = (item.ci95[1] * 100).toFixed(0);

                      return (
                        <tr key={`${segKey}-${idx}`} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-medium text-slate-800 capitalize">
                            {idx === 0 ? segKey.replace(/_/g, " ") : ""}
                          </td>
                          <td className="py-2 px-3 text-slate-900 font-semibold">{labels[item.value] || item.value}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">n = {item.n}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{sharePct}%</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            [{ciLow}% – {ciHigh}%]
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Verbatim research findings bullets */}
        <div className="pt-6 border-t border-slate-200 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>Verbatim Findings for Question {currentQ.num} (findings_part1.md §2)</span>
          </h3>

          <div className="space-y-2">
            {currentQ.verbatim_bullets.map((bullet: string, i: number) => (
              <div key={i} className="flex items-start space-x-2 text-xs sm:text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-indigo-600 font-bold mt-0.5">•</span>
                <div className="min-w-0 flex-1">
                  <MarkdownBlocks text={bullet} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

