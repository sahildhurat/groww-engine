import Link from "next/link";
import core from "@/data/core.json";
import { ArrowRight, AlertTriangle, Banknote } from "lucide-react";

// Overview panel (9 Nov 2026): areas A and B together, from reports/analysis/part1_core_v1.json and
// part1_core_recency_v1.json via tools/build_core_data.py. Same stories and definitions as the A-E table.
const fmt = (n: number) => n.toLocaleString("en-IN");

export function CorePanel() {
  const g = core.groups;
  const r = core.returns_compare;
  const rec = core.recency;
  const reddit = rec.reddit_2025_26;
  const tiles = [
    { label: "of people who stopped", d: g.stop, strong: true },
    { label: "of people considering stopping", d: g.consider, strong: false },
    { label: "of people who kept going", d: g.cont, strong: false },
  ];

  return (
    <section id="core" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6 scroll-mt-20">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <Banknote className="w-5 h-5 text-emerald-600" />
          <span>The strongest stop signal: money that didn&apos;t move, or a status people couldn&apos;t read</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Areas A (payment &amp; AutoPay) and B (where is my money, order status, support) together. Same early-journey
          stories and the same definitions as the table below; no new labels.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3" data-testid="core-tiles">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={`rounded-lg p-4 border ${t.strong ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
          >
            <p className={`text-3xl font-extrabold tracking-tight ${t.strong ? "text-emerald-800" : "text-slate-800"}`}>{t.d.pct}%</p>
            <p className="text-sm text-slate-700 mt-1">{t.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {fmt(t.d.k)} of {fmt(t.d.n)} stories · 95% CI {t.d.ci95?.[0]}–{t.d.ci95?.[1]}%
            </p>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">
        For comparison, returns vs expectations (C) appears in {r.stop.pct}% of stop stories, {r.consider.pct}% of
        considering stories and {r.cont.pct}% of continuers. Losses make people think about stopping; money that didn&apos;t
        move is in the stories of people who stopped.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">It separates in every source</h3>
          <table className="min-w-full text-sm" data-testid="core-by-source">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 px-3 font-medium text-right">Stopped</th>
                <th className="py-2 pl-3 font-medium text-right">Kept going</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {core.by_source.map((s) => (
                <tr key={s.source}>
                  <td className="py-2 pr-3 text-slate-800">{s.source}</td>
                  <td className="py-2 px-3 text-right font-mono text-xs">
                    <span className="font-bold text-slate-900">{s.stop.pct}%</span>{" "}
                    <span className="text-slate-500">({fmt(s.stop.k)}/{fmt(s.stop.n)})</span>
                  </td>
                  <td className="py-2 pl-3 text-right font-mono text-xs">
                    {s.cont.pct}% <span className="text-slate-500">({fmt(s.cont.k)}/{fmt(s.cont.n)})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">It&apos;s a first-months problem</h3>
          <table className="min-w-full text-sm" data-testid="core-timing">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3 font-medium">Stop stories that say when</th>
                <th className="py-2 px-3 font-medium text-right">A or B</th>
                <th className="py-2 pl-3 font-medium text-right">Returns (C)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {core.timing.map((t) => (
                <tr key={t.window}>
                  <td className="py-2 pr-3 text-slate-800">
                    {t.window} <span className="text-xs text-slate-500">(n={t.n})</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-xs font-bold text-slate-900">{t.core_pct}%</td>
                  <td className="py-2 pl-3 text-right font-mono text-xs">{t.returns_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-2">A story can show more than one area.</p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-950 space-y-2" data-testid="core-caveats">
        <p className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Read with care
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
          <li>
            <strong>It&apos;s narrow.</strong> A or B shows up in {core.reach.core_pct}% of early-journey talk (n=
            {fmt(core.reach.core_n)}); returns in {core.reach.returns_pct}% (n={fmt(core.reach.returns_n)}). Less talked
            about, most tied to stopping.
          </li>
          <li>
            <strong>It looks smaller in recent posts.</strong> Among stop stories it falls from{" "}
            {rec.stop_core_by_year.before_2024.pct}% of those posted before 2024 (n={rec.stop_core_by_year.before_2024.n}) to{" "}
            {rec.stop_core_by_year["2026"].pct}% in 2026 (n={rec.stop_core_by_year["2026"].n}), mostly because app-review stop
            stories are older. In Reddit 2025–26 alone it still separates ({reddit.core_A_or_B.stop_pct}% of{" "}
            {reddit.core_A_or_B.stop_n} stoppers vs {reddit.core_A_or_B.cont_pct}% of {reddit.core_A_or_B.cont_n} continuers;
            difference {reddit.core_A_or_B.diff_ci95?.[0]} to {reddit.core_A_or_B.diff_ci95?.[1]} points), but returns is the
            bigger topic there ({reddit.returns_C.stop_pct}% vs {reddit.returns_C.cont_pct}%).
          </li>
        </ul>
      </div>

      <Link
        href="/opportunities#core"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
      >
        <span>Which moments come before a stop, full exits and failed payments</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </section>
  );
}
