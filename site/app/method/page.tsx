import React from "react";
import Link from "next/link";
import methodData from "@/data/method.json";
import validationData from "@/data/validation.json";
import summaryData from "@/data/summary.json";
import { ArrowRight, CheckCircle2, ShieldAlert, Cpu, FileCode, DollarSign, Database, GitBranch, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Method & Validation | SIP Continuity Discovery Engine",
  description: "Detailed pipeline architecture, prompt specifications, validation benchmarks, corrections log, and budget ledger.",
};

export default function MethodPage() {
  const { pipeline_steps, models_prompts, corrections, ledger } = methodData;
  const { summary: valSummary, g1_heldout, g2_agreement, g3_agreement } = validationData;
  const { cant_tell_us } = summaryData;

  const heldout = valSummary.validation_checks.held_out;
  const sonnetMain = valSummary.validation_checks.sonnet_main;
  const sonnetJ1 = valSummary.validation_checks.sonnet_j1;
  const groqHaiku = valSummary.validation_checks.groq_vs_haiku;
  const groqSonnet = valSummary.validation_checks.groq_vs_sonnet;
  const h8 = valSummary.validation_checks.h8_instability;
  const j1VsMain = valSummary.validation_checks.j1_vs_main;

  return (
    <div className="py-8 max-w-6xl mx-auto space-y-16">
      {/* Page Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Method, Architecture & Validation
        </h1>
        <p className="mt-2 text-base text-muted-foreground max-w-3xl">
          An open, auditable record of how the discovery engine collects, scrubs, filters, extracts, validates, and analyzes public first-time SIP investor data.
        </p>
      </div>

      {/* 1. Pipeline Architecture Flow */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">1. Pipeline Architecture & Counts</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Step-by-step data funnelling from raw public platforms to strict early-journey analytical consensus.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pipeline_steps.map((st: any, idx: number) => (
            <div
              key={idx}
              className="rounded-xl border border-border bg-card p-4 space-y-2 flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-primary font-bold uppercase tracking-wider">
                  Step {idx + 1}
                </span>
                <h3 className="text-sm font-semibold text-foreground">{st.step}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{st.detail}</p>
              </div>
              <div className="pt-2 border-t border-border/60">
                <div className="text-[10px] uppercase font-mono text-muted-foreground">Volume</div>
                <div className="text-sm font-bold text-foreground font-mono">{st.records}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Models & Prompts Table */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">2. Models & Prompts</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Standardized batch inference settings across pipeline stages. Extraction utilizes deterministic parameters with Anthropic prompt caching.
        </p>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2.5 px-3 font-medium">Stage</th>
                <th className="py-2.5 px-3 font-medium">Model</th>
                <th className="py-2.5 px-3 font-medium">Prompt Specification</th>
                <th className="py-2.5 px-3 font-medium text-right">Max Tokens</th>
                <th className="py-2.5 px-3 font-medium text-center">Thinking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {models_prompts.map((mp: any) => (
                <tr key={mp.stage}>
                  <td className="py-2.5 px-3 font-medium text-foreground">{mp.stage}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{mp.model}</td>
                  <td className="py-2.5 px-3 font-mono text-primary text-[11px]">{mp.prompt_file}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{mp.max_tokens}</td>
                  <td className="py-2.5 px-3 text-center capitalize text-muted-foreground">{mp.thinking}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Validation Benchmarks */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">3. Validation & Reliability Audits</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Multiple independent benchmarks conducted throughout development to quantify accuracy, inter-rater reliability, and cross-model stability.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* G1 Held-out */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">G1 Held-out Human Test</h3>
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">n = {heldout.n}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">Held-out test run once after all tuning (gate v1.1 + extract v1.2a + H11 rules).</p>
            <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gate Relevance:</span>
                <strong className="text-foreground">{(heldout.gate_relevant_agreement * 100).toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Action Primary:</span>
                <strong className="text-foreground">{(heldout.action_primary_agreement * 100).toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actions Invented:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{heldout.action_filled_when_human_unknown} (zero)</strong>
              </div>
            </div>
          </div>

          {/* Sonnet Audits */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Blind Sonnet 3.5 Audits</h3>
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">n = {sonnetMain.n} + {sonnetJ1.n}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">Blind Sonnet audit comparing extraction items and journey items against Haiku baseline.</p>
            <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Action Agreement:</span>
                <strong className="text-foreground">{(sonnetMain.action_primary_agreement * 100).toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trigger Agreement:</span>
                <strong className="text-foreground">{(sonnetMain.trigger_primary_agreement * 100).toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">First SIP Month Align:</span>
                <strong className="text-foreground">{(sonnetJ1.first_sip_month_agreement * 100).toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          {/* Groq Cross-Family Check */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Cross-Family Check (Groq)</h3>
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">n = {groqSonnet.n}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">Cross-family blind audit comparing Groq gpt-oss-120b against Sonnet matched by UID.</p>
            <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Groq vs Sonnet (Action):</span>
                <strong className="text-foreground">{(groqSonnet.action_primary.agreement * 100).toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Groq vs Sonnet (Trigger):</span>
                <strong className="text-foreground">{(groqSonnet.trigger_primary.agreement * 100).toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">First-Time Status:</span>
                <strong className="text-foreground">{(groqSonnet.first_time_status.agreement * 100).toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          {/* H8 Run-to-Run Stability */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">H8 Run Stability</h3>
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">n = {h8.n.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">Run-to-run consistency evaluated across duplicate inferences.</p>
            <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Action Re-run Agreement:</span>
                <strong className="text-foreground">{(h8.action_primary_agreement * 100).toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Instability Rate:</span>
                <strong className="text-amber-600 dark:text-amber-400">{(h8.action_primary_instability_rate * 100).toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolution:</span>
                <span className="text-foreground font-medium">J1 second date-aware read</span>
              </div>
            </div>
          </div>

          {/* J1 Second Read */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">J1 Strict Journey Read</h3>
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">n = {j1VsMain.n.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">Second date-aware read distinguishing active status from real actions.</p>
            <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Action Recovered (JC):</span>
                <strong className="text-foreground">{j1VsMain.jc_recovery_count} episodes</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Strict Consensus Agreement:</span>
                <strong className="text-foreground">{(j1VsMain.overall_agreement_rate * 100).toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Filter Impact:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Zero hallucinated actions</span>
              </div>
            </div>
          </div>

          {/* Theme Agreement Checks (G2/G3) */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Theme Agreement (G2/G3)</h3>
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">G2 & G3</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Theme coding failed human agreement in two rounds (below the 0.6 bar), so themes are demoted to illustrative colour rather than quantitative evidence.
            </p>
            <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outcome:</span>
                <strong className="text-rose-600 dark:text-rose-400">Demoted from evidence</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Primary Evidence:</span>
                <strong className="text-foreground">Strict grounded mechanics</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Corrections and Rejected Outputs (§6) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-bold text-foreground">4. Corrections & Rejected Outputs</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Scientific rigor requires transparent reporting of rejected prompts, bugs detected during review, and discarded methodologies.
        </p>

        <div className="space-y-3">
          {corrections.map((corr: any) => (
            <div
              key={corr.id}
              className="rounded-lg border border-border bg-card p-4 space-y-1 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">
                  #{corr.id}
                </span>
                <h3 className="text-xs font-semibold text-foreground">{corr.title}</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed pl-6">{corr.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. What the engine cannot tell us */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">5. Engine Limitations & Honest Boundaries</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Verbatim limitations from research findings (§4), highlighting observational biases and boundaries of social-web text mining.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cant_tell_us.map((lim: string, idx: number) => (
            <div
              key={idx}
              className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-1.5 text-xs"
            >
              <div className="font-semibold text-foreground flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Limitation {idx + 1}
              </div>
              <p className="text-muted-foreground leading-relaxed">{lim}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Budget & Financial Ledger */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-foreground">6. Financial Ledger & API Spend</h2>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            Strict Cap: ${ledger.cap_usd}.00 USD
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3.5">
            <div className="text-[11px] font-medium text-muted-foreground">Total Production Spend</div>
            <div className="mt-1 text-xl font-bold text-foreground font-mono">
              ${ledger.production_spend_usd.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Main and journey passes</div>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/30 p-3.5">
            <div className="text-[11px] font-medium text-muted-foreground">Unit Test Spend</div>
            <div className="mt-1 text-xl font-bold text-foreground font-mono">
              ${ledger.test_spend_usd.toFixed(4)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Pre-flight checks</div>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/30 p-3.5">
            <div className="text-[11px] font-medium text-muted-foreground">Cumulative Total</div>
            <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              ${ledger.cumulative_spend_usd.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {((ledger.cumulative_spend_usd / ledger.cap_usd) * 100).toFixed(1)}% of budget used
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/30 p-3.5">
            <div className="text-[11px] font-medium text-muted-foreground">Budget Headroom</div>
            <div className="mt-1 text-xl font-bold text-foreground font-mono">
              ${(ledger.cap_usd - ledger.cumulative_spend_usd).toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Unspent surplus</div>
          </div>
        </div>
      </section>
    </div>
  );
}

