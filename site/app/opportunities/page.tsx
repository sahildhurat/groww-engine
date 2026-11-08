import React from "react";
import Link from "next/link";
import opportunitiesData from "@/data/opportunities.json";
import summaryData from "@/data/summary.json";
import { ArrowRight, CheckCircle2, AlertCircle, Quote, Sparkles, Building, Layers } from "lucide-react";

export const metadata = {
  title: "Opportunity Areas | SIP Continuity Discovery Engine",
  description: "Five product opportunity areas (A–E) derived from early-journey first-time investor friction, with reach, stop-vs-continue separation, Groww share, and human validation.",
};

export default function OpportunitiesPage() {
  const { areas } = opportunitiesData;
  const oppsSummary = summaryData.opportunities;

  return (
    <div className="py-8 max-w-6xl mx-auto space-y-12">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Five Opportunity Areas (A–E)
        </h1>
        <p className="mt-2 text-base text-muted-foreground max-w-3xl">
          From early-journey stories (≤ 12 months from the first SIP). Each area below shows its definition, how often it appears among people who stopped and people who kept going, and the human check.
        </p>
      </div>

      <div className="space-y-16">
        {areas.map((area: any) => {
          const sumMeta = oppsSummary.find((s: any) => s.id === area.id);
          const letter = sumMeta?.letter || area.id.charAt(0);
          const addressable = sumMeta?.addressable || "Yes";

          return (
            <section
              key={area.id}
              id={area.id}
              className="scroll-mt-20 rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border/60 pb-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-base shadow-sm">
                      {letter}
                    </span>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      {area.name}
                    </h2>
                  </div>
                  <p className="mt-3 text-base text-foreground/90 font-medium leading-relaxed max-w-3xl">
                    {area.definition}
                  </p>
                </div>
                <div className="flex md:flex-col items-end gap-2 shrink-0">
                  <Link
                    href={`/stories?area=${area.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-3.5 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition"
                  >
                    Explore all stories
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Early Journey Reach</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">
                    {area.reach_E_pct}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    weighted share; n = {area.n_E.toLocaleString()} early-journey episodes
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Groww Share</div>
                  <div className="mt-1 text-2xl font-bold text-foreground">
                    {area.groww_share_pct !== null ? `${area.groww_share_pct}%` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    of area episodes on Groww
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Addressability</div>
                  <div className="mt-1 text-sm font-semibold text-foreground leading-snug">
                    {addressable}
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Human Check</div>
                  {area.human_check ? (
                    <div>
                      <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {area.human_check.yes_share_pct}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {area.human_check.yes}/{area.human_check.yes + area.human_check.no} agreed (95% CI {area.human_check.ci95_pct[0]}–{area.human_check.ci95_pct[1]}%)
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-muted-foreground italic">
                      Inferred from explicit mechanics
                    </div>
                  )}
                </div>
              </div>

              {/* Separation Table */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                  Stop vs Continue Separation by Source
                </h3>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3 font-medium">Source</th>
                        <th className="py-2.5 px-3 font-medium text-right">Stop %</th>
                        <th className="py-2.5 px-3 font-medium text-right">Continue %</th>
                        <th className="py-2.5 px-3 font-medium text-right">Diff (Stop - Cont)</th>
                        <th className="py-2.5 px-3 font-medium text-right">95% CI of Diff</th>
                        <th className="py-2.5 px-3 font-medium text-center">Sig.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {["reddit", "youtube", "appreviews", "pooled"].map((srcKey) => {
                        const s = area.separation[srcKey];
                        if (!s) return null;
                        const label = srcKey === "reddit" ? "Reddit" : srcKey === "youtube" ? "YouTube" : srcKey === "appreviews" ? "App Reviews" : "Pooled";
                        const isSig = s.diff_ci95 && s.diff_ci95[0] > 0;
                        const isNegSig = s.diff_ci95 && s.diff_ci95[1] < 0;
                        const mark = isSig ? "✓" : isNegSig ? "✗" : "~";

                        return (
                          <tr key={srcKey} className={srcKey === "pooled" ? "bg-muted/20 font-semibold" : ""}>
                            <td className="py-2.5 px-3">{label}</td>
                            <td className="py-2.5 px-3 text-right">{(s.stop * 100).toFixed(1)}%</td>
                            <td className="py-2.5 px-3 text-right">{(s.cont * 100).toFixed(1)}%</td>
                            <td className={`py-2.5 px-3 text-right font-medium ${s.diff > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                              {s.diff > 0 ? "+" : ""}{(s.diff * 100).toFixed(1)}%
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">
                              {s.diff_ci95 ? `[${(s.diff_ci95[0] * 100).toFixed(1)}%, ${(s.diff_ci95[1] * 100).toFixed(1)}%]` : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                mark === "✓" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                                mark === "✗" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {mark}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Human Check Notes */}
              {area.human_check && area.human_check.notes && area.human_check.notes.length > 0 && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-100/60 dark:bg-amber-950/40 p-4 text-xs space-y-2">
                  <div className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                    Human Review Nuances & Edge Cases (from sample audit)
                  </div>
                  <div className="space-y-1.5 text-slate-800 dark:text-slate-200">
                    {area.human_check.notes.map((n: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="font-mono text-xs text-muted-foreground">#{n[0]}:</span>
                        <span className={`font-semibold ${n[1] === "yes" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                          [{n[1]}]
                        </span>
                        <span className="text-foreground/90">{n[2]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Example Stories */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-1.5">
                    <Quote className="h-3.5 w-3.5" />
                    Example Verbatim Stories ({area.example_stories?.length || 0})
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    All quotes scrubbed & privacy-checked
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(area.example_stories || []).map((st: any) => (
                    <div
                      key={st.uid}
                      className="rounded-lg border border-border/80 bg-background/50 p-4 space-y-3 flex flex-col justify-between text-xs hover:border-primary/40 transition"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                            {st.uid}
                          </span>
                          <span className="capitalize font-medium">
                            {st.source?.replace("_", " ")}
                          </span>
                        </div>

                        {st.quote ? (
                          <p className="italic text-foreground/90 border-l-2 border-primary/50 pl-2.5 py-0.5">
                            &ldquo;{st.quote}&rdquo;
                          </p>
                        ) : (
                          <p className="text-muted-foreground italic pl-2.5 py-0.5">
                            [No standalone quote meeting strict privacy criteria]
                          </p>
                        )}

                        {st.unmet_need?.v && (
                          <div className="text-muted-foreground text-[11px] bg-muted/40 p-2 rounded">
                            <span className="font-semibold text-foreground/80">Unmet need: </span>
                            {st.unmet_need.v}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-border/50 text-[11px]">
                        <span className="text-muted-foreground capitalize">
                          Action: <strong className="text-foreground">{st.action?.replace(/_/g, " ")}</strong>
                        </span>
                        <Link
                          href={`/stories?q=${encodeURIComponent(st.uid)}`}
                          className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                        >
                          View record
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

