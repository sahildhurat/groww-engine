import Link from "next/link";
import summaryData from "@/data/summary.json";
import { FormattedText } from "@/components/FormattedText";
import { ArrowRight, CheckCircle2, AlertTriangle, HelpCircle, Layers, TrendingUp, ShieldAlert, Sparkles } from "lucide-react";

export default function OverviewPage() {
  const { answer_in_five_lines, funnel, opportunities, cant_tell_us } = summaryData;

  return (
    <div className="space-y-12">
      {/* Hero header */}
      <div className="border-b border-slate-200 pb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-semibold text-indigo-800 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Part 1 Deliverable · Discovery Engine Live Dashboard</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Why First-Time Investors Stop Their SIP in the First Year
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-3xl">
          An interactive discovery dashboard showing how the engine gathers public personal finance discourse, extracts structured investor journeys, validates findings against human and model audits, and isolates key continuity friction points.
        </p>
      </div>

      {/* (a) The Answer in Five Lines */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              The Answer in Five Lines
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verbatim synthesis from research findings §0 (derived strictly from underlying analysis results)
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
            Executive Summary
          </span>
        </div>

        <div className="grid gap-4">
          {answer_in_five_lines.map((line, idx) => {
            const isCaveat = idx === answer_in_five_lines.length - 1;
            return (
              <div
                key={idx}
                className={`p-4 rounded-lg flex items-start space-x-3.5 ${
                  isCaveat
                    ? "bg-amber-50/70 border border-amber-200/80 text-amber-950"
                    : "bg-slate-50/80 border border-slate-200/60 text-slate-800"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isCaveat ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  ) : (
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs">
                      {idx + 1}
                    </span>
                  )}
                </div>
                <div className="text-sm sm:text-base leading-relaxed">
                  <FormattedText text={line} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* (b) Data Funnel */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Data Funnel: From 1.6M Public Records to Core Problem</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Most collected discourse is general investing chatter; the early-journey continuity core is isolated and analysed strictly.
            </p>
          </div>
          <Link
            href="/method"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            <span>Inspect pipeline validation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Funnel Stage</th>
                <th className="py-3 px-4 text-right">Count</th>
                <th className="py-3 px-4">Methodology Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {funnel.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-900">{item.step}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-indigo-950">{item.count}</td>
                  <td className="py-3 px-4 text-slate-600 text-xs">{item.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* (c) Opportunity Table (A-E) */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>The Five Opportunity Areas (Early-Journey Episodes)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Separation = stop share minus continue share within that source. Marks: ✓ = higher among stops with 95% confidence, ~ = indistinguishable, ✗ = continuers higher.
            </p>
          </div>
          <Link
            href="/opportunities"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            <span>View deep-dive analysis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-3">Area</th>
                <th className="py-3.5 px-3">Reach (n)</th>
                <th className="py-3.5 px-3 text-center">Reddit Stop vs Cont</th>
                <th className="py-3.5 px-3 text-center">YouTube</th>
                <th className="py-3.5 px-3 text-center">App Reviews</th>
                <th className="py-3.5 px-3 text-center">Groww Share</th>
                <th className="py-3.5 px-3">Addressable?</th>
                <th className="py-3.5 px-3 text-center">Human Check</th>
                <th className="py-3.5 px-3 text-right">Stories</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {opportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3 font-medium text-slate-900">
                    <Link
                      href={`/opportunities#${opp.id}`}
                      className="text-indigo-600 hover:text-indigo-900 hover:underline flex items-center space-x-1"
                    >
                      <span className="font-bold">{opp.letter}.</span>
                      <span>{opp.name}</span>
                    </Link>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-xs whitespace-nowrap">
                    <span className="font-bold text-slate-900">{opp.reach_pct}%</span>{" "}
                    <span className="text-slate-500">({opp.reach_n.toLocaleString()})</span>
                  </td>
                  <td className="py-3.5 px-3 text-center text-xs whitespace-nowrap">
                    {opp.separation.reddit.stop_pct !== null ? (
                      <span className="font-mono">
                        {opp.separation.reddit.stop_pct}% vs {opp.separation.reddit.cont_pct}%{" "}
                        <strong className="text-emerald-700 ml-1">{opp.separation.reddit.mark}</strong>
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center text-xs whitespace-nowrap">
                    {opp.separation.youtube.stop_pct !== null ? (
                      <span className="font-mono">
                        {opp.separation.youtube.stop_pct}% vs {opp.separation.youtube.cont_pct}%{" "}
                        <strong className="text-emerald-700 ml-1">{opp.separation.youtube.mark}</strong>
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center text-xs whitespace-nowrap">
                    {opp.separation.appreviews.stop_pct !== null ? (
                      <span className="font-mono">
                        {opp.separation.appreviews.stop_pct}% vs {opp.separation.appreviews.cont_pct}%{" "}
                        <strong className="text-emerald-700 ml-1">{opp.separation.appreviews.mark}</strong>
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center text-xs font-mono">
                    {opp.groww_share_pct !== null ? `${opp.groww_share_pct}%` : "-"}
                  </td>
                  <td className="py-3.5 px-3 text-xs text-slate-700 max-w-xs">{opp.addressable}</td>
                  <td className="py-3.5 px-3 text-center text-xs whitespace-nowrap">
                    {opp.human_check && opp.human_check.yes_count !== null ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {opp.human_check.yes_share_pct}% ({opp.human_check.yes_count}/{(opp.human_check.yes_count || 0) + (opp.human_check.no_count || 0)}
                        {opp.human_check.no_count === null ? " answered" : ""})
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">N/A</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <Link
                      href={`/stories?area=${opp.id}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                    >
                      See stories →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed" data-testid="reach-note">
          Reach is a weighted share. Records from the half-sampled tier count twice, so reach is an area&apos;s weighted
          early-journey episodes divided by all weighted early-journey episodes (35,440.0), not n divided by 32,868. The n in
          brackets is the raw number of episodes showing the area. The human check counts reviewers&apos; yes answers out of the
          items they answered.
        </p>
      </section>

      {/* (d) What the engine cannot tell us */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span>What the Engine Cannot Tell Us (→ Topics for User Interviews)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verbatim constraints from research findings §4. Public posts have observational boundaries that must be investigated through qualitative field research.
          </p>
        </div>

        <div className="grid gap-3.5">
          {cant_tell_us.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-800 text-sm flex items-start space-x-3"
            >
              <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <FormattedText text={item} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

