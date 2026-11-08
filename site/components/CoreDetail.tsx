import core from "@/data/core.json";

// Opportunity Areas page (9 Nov 2026): the A-or-B evidence in detail. Numbers from tools/build_core_data.py, which
// reads reports/analysis/{part1_core_v1, part1_core_recency_v1, moment_hazard_v1, exit_evidence_v1}.json.
const fmt = (n: number) => n.toLocaleString("en-IN");
const YEARS: [string, string][] = [
  ["before_2024", "Before 2024"],
  ["2024", "2024"],
  ["2025", "2025"],
  ["2026", "2026"],
];
const EXIT_SOURCES: [keyof typeof core.exits, string][] = [
  ["pooled", "All sources"],
  ["reddit", "Reddit"],
  ["youtube", "YouTube"],
  ["appreviews", "App reviews"],
  ["groww_scope", "Posts naming Groww"],
];

export function CoreDetail() {
  const fp = core.failed_payments;
  const ex = core.exits.pooled;
  const max = Math.max(...core.moments.map((m) => m.pct));

  return (
    <section id="core" className="scroll-mt-20 rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-8">
      <div className="border-b border-border/60 pb-5">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          A or B in detail: money that didn&apos;t move, or a status people couldn&apos;t read
        </h2>
        <p className="mt-2 text-base text-muted-foreground max-w-3xl">
          Areas A and B are the two strongest separators below. Taken together, they appear in {core.groups.stop.pct}% of
          early-journey stop stories and {core.groups.cont.pct}% of continuers&apos; stories. Three more cuts follow.
        </p>
      </div>

      <div className="space-y-3" data-testid="core-moments">
        <h3 className="text-lg font-semibold text-foreground">Which moments come before a stop</h3>
        <p className="text-sm text-muted-foreground max-w-3xl">
          For each moment in an early-journey story, the share of labelled stories (stopped, considering or kept going)
          that end in a stop. All sources together, with 95% confidence intervals.
        </p>
        <div className="space-y-2">
          {core.moments.map((m) => (
            <div key={m.code} className="grid grid-cols-[minmax(0,13rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="text-foreground">{m.label}</span>
              <div className="h-3 rounded bg-slate-100 overflow-hidden" aria-hidden>
                <div
                  className={`h-full ${m.code === "payment_failed" || m.code === "first_debit_or_gap" ? "bg-emerald-600" : "bg-slate-400"}`}
                  style={{ width: `${(m.pct / max) * 100}%` }}
                />
              </div>
              <span className="font-mono text-xs text-foreground whitespace-nowrap">
                <strong>{m.pct}%</strong> ({fmt(m.stop)}/{fmt(m.n)}) [{m.ci95?.[0]}–{m.ci95?.[1]}]
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-3" data-testid="core-failed-payments">
          <h3 className="text-lg font-semibold text-foreground">When a payment failed</h3>
          <p className="text-sm text-muted-foreground">
            Claude read the {fp.n} early-journey stories with a failed-payment moment one by one and coded what happened to
            the money.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <strong>
                {fp.debited_no_units.stop} of {fp.debited_no_units.n}
              </strong>{" "}
              stories where money was debited but the order failed or didn&apos;t show end in a stop (
              {Math.round((fp.debited_no_units.stop / fp.debited_no_units.n) * 100)}%).
            </li>
            <li className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <strong>
                {fp.never_became_units.stop} of {fp.never_became_units.n}
              </strong>{" "}
              stories where the money never became units (didn&apos;t go through, or debited without an order) end in a stop (
              {Math.round((fp.never_became_units.stop / fp.never_became_units.n) * 100)}%).
            </li>
          </ul>
        </div>

        <div className="space-y-3" data-testid="core-exits">
          <h3 className="text-lg font-semibold text-foreground">Why people fully left</h3>
          <p className="text-sm text-muted-foreground">
            Full exits (stopped everything, let the SIP lapse, or moved platform) from the date-aware second read, among
            the {ex.n_cause} of {ex.n_exits} that state a cause. Main reason:
          </p>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 pr-2 font-medium" />
                <th className="py-2 px-2 font-medium text-right">Money movement</th>
                <th className="py-2 px-2 font-medium text-right">App or support</th>
                <th className="py-2 px-2 font-medium text-right">Returns or market</th>
                <th className="py-2 pl-2 font-medium text-right">Cash need</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {EXIT_SOURCES.map(([k, name]) => {
                const e = core.exits[k];
                return (
                  <tr key={k}>
                    <td className="py-2 pr-2 text-foreground">
                      {name} <span className="text-xs text-muted-foreground">(n={e.n_cause})</span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-xs font-bold">{e.money.pct}%</td>
                    <td className="py-2 px-2 text-right font-mono text-xs">{e.app_support.pct}%</td>
                    <td className="py-2 px-2 text-right font-mono text-xs">{e.returns_or_market.pct}%</td>
                    <td className="py-2 pl-2 text-right font-mono text-xs">{e.cash.pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">
            Money-led exits that state no cause of stopping (money not back yet, an unwanted debit) are left out of these
            shares. Small groups: read the per-source rows as direction only.
          </p>
        </div>
      </div>

      <div className="space-y-3" data-testid="core-recency">
        <h3 className="text-lg font-semibold text-foreground">By post year</h3>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Share of early-journey stop stories showing A or B, all sources together. App-review stop stories are mostly
          older, so most of the fall is source mix; the Reddit-only check is on the Overview.
        </p>
        <div className="flex flex-wrap gap-3">
          {YEARS.map(([k, name]) => {
            const y = core.recency.stop_core_by_year[k as keyof typeof core.recency.stop_core_by_year];
            return (
              <div key={k} className="rounded-lg border border-border px-4 py-2 text-sm">
                <span className="text-muted-foreground">{name}</span>{" "}
                <strong className="font-mono">{y.pct}%</strong>{" "}
                <span className="text-xs text-muted-foreground">(n={y.n})</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Report files:{" "}
        {core.sources.map((s, i) => (
          <span key={s.file}>
            <code>{s.file}</code> (sha256 {s.sha256}…){i < core.sources.length - 1 ? "; " : "."}
          </span>
        ))}
      </p>
    </section>
  );
}
