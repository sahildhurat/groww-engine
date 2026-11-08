import { NextRequest, NextResponse } from "next/server";
import tryPrompts from "@/data/try_prompts.json";

// The pipeline's request shape (pipeline/llm.py): system = the prompt's SYSTEM section with {{CATEGORIES}} filled
// (site/data/try_prompts.json, built by tools/build_try_prompts.py), user = "Items:\n" + the items as JSON, thinking
// disabled, and every text block of the reply joined.
function itemsJson(id: string, text: string): string {
  // Python json.dumps(..., ensure_ascii=False) layout, as the pipeline sent it
  return `[{"id": "${id}", "src": "other", "ctx": "", "text": ${JSON.stringify(text)}}]`;
}

function truncateForGate(t: string, maxLen = 700): string {
  // pipeline/gate.py truncate_for_gate: keep the start and the last 150 characters
  const s = t.trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 150 - 5)} ... ${s.slice(-150)}`;
}

async function callModel(apiKey: string, system: string, items: string, maxTokens: number): Promise<{ text: string; inTok: number; outTok: number }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: maxTokens,
      thinking: { type: "disabled" },
      system: [{ type: "text", text: system }],
      messages: [{ role: "user", content: `Items:\n${items}` }],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw Object.assign(new Error(`model http ${res.status}`), { stage: "model_http", status: res.status });
  const json = await res.json();
  const text = Array.isArray(json.content)
    ? json.content.filter((b: any) => b && b.type === "text" && typeof b.text === "string").map((b: any) => b.text).join("")
    : "";
  return { text, inTok: json.usage?.input_tokens || 0, outTok: json.usage?.output_tokens || 0 };
}

// Find the item for `id` in the model's reply: a JSON array (as asked), a single object, or an object keyed by id,
// with or without code fences or a sentence around it. Anything else gives {} (all fields unknown).
function pickItem(raw: string, id: string): Record<string, any> {
  const t = raw.replace(/```json|```/g, "").trim();
  const candidates: string[] = [];
  const a0 = t.indexOf("["), a1 = t.lastIndexOf("]");
  if (a0 !== -1 && a1 > a0) candidates.push(t.slice(a0, a1 + 1));
  const o0 = t.indexOf("{"), o1 = t.lastIndexOf("}");
  if (o0 !== -1 && o1 > o0) candidates.push(t.slice(o0, o1 + 1));
  for (const c of candidates) {
    try {
      const v = JSON.parse(c);
      const arr = Array.isArray(v) ? v : v && typeof v === "object" ? (v.id ? [v] : v[id] ? [{ id, ...v[id] }] : [v]) : [];
      const hit = arr.find((x: any) => x && typeof x === "object" && x.id === id) || arr.find((x: any) => x && typeof x === "object");
      if (hit) return hit;
    } catch {
      /* try the next candidate */
    }
  }
  return {};
}

// In-memory rate limiting map: ip -> rate record
interface RateRecord {
  minuteCount: number;
  minuteStart: number;
  dayCount: number;
  dayStart: number;
}

const rateLimitMap = new Map<string, RateRecord>();

// Helper to check and increment rate limits
function checkRateLimit(ip: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const perMinuteLimit = parseInt(process.env.PER_IP_MINUTE || "5", 10);
  const perDayLimit = parseInt(process.env.PER_IP_DAILY || "30", 10);

  let rec = rateLimitMap.get(ip);
  if (!rec) {
    rec = { minuteCount: 0, minuteStart: now, dayCount: 0, dayStart: now };
    rateLimitMap.set(ip, rec);
  }

  // Reset minute window if > 60s
  if (now - rec.minuteStart > 60000) {
    rec.minuteCount = 0;
    rec.minuteStart = now;
  }

  // Reset daily window if > 24h
  if (now - rec.dayStart > 86400000) {
    rec.dayCount = 0;
    rec.dayStart = now;
  }

  if (rec.minuteCount >= perMinuteLimit) {
    return {
      allowed: false,
      reason: `Rate limit reached (${perMinuteLimit} calls per minute). Please wait a moment before trying again.`,
    };
  }

  if (rec.dayCount >= perDayLimit) {
    return {
      allowed: false,
      reason: `Daily limit reached (${perDayLimit} calls per day). Please try again tomorrow or view the cached examples.`,
    };
  }

  rec.minuteCount++;
  rec.dayCount++;
  return { allowed: true };
}

// Allowed categorical values for H1
const ALLOWED_ACTIONS = new Set([
  "stopped_or_cancelled",
  "paused_or_skipped",
  "skipped_or_paused",
  "reduced_amount",
  "considered_stopping",
  "continued",
  "continued_with_friction",
  "redeemed_withdrew",
  "switched_fund",
  "switched_platform",
  "increased_or_stepped_up",
  "lapsed_failed_debit",
  "unknown",
]);

const ALLOWED_TRIGGERS = new Set([
  "returns_disappointing",
  "market_fall_news",
  "cash_crunch_expense",
  "income_change",
  "payment_mandate_problem",
  "app_issue_or_ux",
  "confusion_product_or_app",
  "trust_concern_platform",
  "fees_tax_exit_load",
  "advice_from_someone",
  "influencer_or_media",
  "better_alternative",
  "goal_changed_or_reached",
  "forgot_or_didnt_notice",
  "none",
  "unknown",
]);

const FIRST_TIME_CUES = [
  "first", "1st", "beginner", "newbie", "started", "starting", "start",
  "pehle", "pehli", "shuru", "naye", "nayi", "new", "recently", "just opened"
];

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let gateInputTokens = 0;
  let gateOutputTokens = 0;
  let extInputTokens = 0;
  let extOutputTokens = 0;

  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    // 1. Rate limiting
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
    }

    // 2. Body parsing & validation
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (text.length < 20 || text.length > 2000) {
      return NextResponse.json(
        { error: "Text must be between 20 and 2,000 characters." },
        { status: 400 }
      );
    }

    // 3. Live feature check (fail-closed: LIVE_ENABLED must strictly equal "true")
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const isLiveEnabled = process.env.LIVE_ENABLED === "true" && Boolean(apiKey);

    if (!isLiveEnabled) {
      return NextResponse.json(
        {
          live_enabled: false,
          error: "Live engine calls are disabled or unconfigured. Please use the cached examples.",
        },
        { status: 503 }
      );
    }

    // 4. Gate Step with 20s timeout
    let stage = "gate";
    let gateParsed: Record<string, any> = {};
    try {
      const r = await callModel(apiKey!, tryPrompts.gate_system, itemsJson("try1", truncateForGate(text)), 400);
      gateInputTokens = r.inTok;
      gateOutputTokens = r.outTok;
      gateParsed = pickItem(r.text, "try1");
    } catch (err: any) {
      const timeout = err?.name === "TimeoutError" || err?.name === "AbortError";
      console.error(`[try_api] gate call failed: ${timeout ? "timeout" : err?.stage === "model_http" ? `http ${err.status}` : err?.name || "error"}`);
      return NextResponse.json(
        { error: timeout ? "Engine request timed out. Please try again or use the cached examples." : "Engine call failed. Please try again or inspect cached examples." },
        { status: timeout ? 504 : 502 }
      );
    }

    const rel = gateParsed.rel || "n";
    const gateType = gateParsed.type || "other";
    const sip = gateParsed.sip || 0;
    const ft = gateParsed.ft || "u";

    // Gate positive definition: relevant (rel == 'r') and describes an experience or question (type in {exp, q})
    const isGatePositive = rel === "r" && (gateType === "exp" || gateType === "q");

    let extractionResult: any = null;
    let groundedSpans: Array<{ field: string; value: any; span: string }> = [];

    // 5. Extraction Step (only if gate-positive), same request shape as the pipeline
    if (isGatePositive) {
      stage = "extract";
      let extOk = false;
      let extParsed: Record<string, any> = {};
      try {
        const r = await callModel(apiKey!, tryPrompts.extract_system, itemsJson("try1", text), 2000);
        extInputTokens = r.inTok;
        extOutputTokens = r.outTok;
        extParsed = pickItem(r.text, "try1");
        extOk = true;
      } catch (err: any) {
        console.error(`[try_api] extraction call failed: ${err?.stage === "model_http" ? `http ${err.status}` : err?.name || "error"}`);
      }

      if (extOk) {
        // Post-processing: Rules H1, H2, H4, H5, H11 & quote check
        const extType =
          typeof extParsed.type === "object" ? extParsed.type?.v : extParsed.type || gateType;
        const isExp = gateType === "exp" || extType === "exp";

        // H11 rule: If not own-experience, drop inferred actions and triggers
        if (!isExp) {
          extParsed.action_primary = "unknown";
          extParsed.actions_all = "unknown";
          extParsed.trigger_primary = "unknown";
          extParsed.triggers = "unknown";
        }

        // H1 rule: Allowed category codes
        if (typeof extParsed.action_primary === "object" && extParsed.action_primary?.v) {
          if (!ALLOWED_ACTIONS.has(extParsed.action_primary.v)) {
            extParsed.action_primary = "unknown";
          }
        }
        if (typeof extParsed.trigger_primary === "object" && extParsed.trigger_primary?.v) {
          if (!ALLOWED_TRIGGERS.has(extParsed.trigger_primary.v)) {
            extParsed.trigger_primary = "unknown";
          }
        }

        // H4 rule: Numbers in spans
        if (extParsed.months_since_start && typeof extParsed.months_since_start === "object") {
          if (typeof extParsed.months_since_start.s !== "string" || !/\d+/.test(extParsed.months_since_start.s)) {
            extParsed.months_since_start = "unknown";
          }
        }

        // H5 rule: First-time status cue
        if (extParsed.first_time_status && typeof extParsed.first_time_status === "object") {
          const spanLower = typeof extParsed.first_time_status.s === "string" ? extParsed.first_time_status.s.toLowerCase() : "";
          const hasCue = FIRST_TIME_CUES.some((cue) => spanLower.includes(cue));
          if (!hasCue) {
            extParsed.first_time_status = "unknown";
          }
        }

        // Quote check: must be a verbatim substring in text
        if (extParsed.quote && typeof extParsed.quote === "string") {
          if (!text.includes(extParsed.quote.trim())) {
            extParsed.quote = null;
          } else {
            extParsed.quote = extParsed.quote.trim();
          }
        }

        // Check span grounding on all fields
        const processedExtraction: Record<string, any> = {};

        for (const [key, val] of Object.entries(extParsed)) {
          if (key === "id") continue;

          if (val === "unknown" || val === null || val === undefined) {
            processedExtraction[key] = "unknown";
            continue;
          }

          if (Array.isArray(val)) {
            const validItems = val.filter((item: any) => {
              if (item?.s && typeof item.s === "string") {
                const spanStr = item.s.trim();
                const isGrounded = spanStr.length > 0 && text.includes(spanStr);
                if (isGrounded) {
                  groundedSpans.push({ field: key, value: item.v, span: spanStr });
                }
                return isGrounded;
              }
              return false;
            });
            processedExtraction[key] = validItems.length > 0 ? validItems : "unknown";
          } else if (typeof val === "object" && val !== null && "s" in val && typeof (val as any).s === "string") {
            const valObj = val as { v?: any; s: string };
            const spanStr = valObj.s.trim();
            const isGrounded = spanStr.length > 0 && text.includes(spanStr);
            if (isGrounded) {
              groundedSpans.push({ field: key, value: valObj.v, span: spanStr });
              processedExtraction[key] = val;
            } else {
              processedExtraction[key] = "unknown";
            }
          } else {
            processedExtraction[key] = val;
          }
        }

        extractionResult = processedExtraction;
      }
    }

    const latencyMs = Date.now() - startTime;

    // Privacy-compliant logging: timestamp, latency, tokens, verdict — NEVER raw text or error message!
    console.log(
      JSON.stringify({
        tag: "api_try_call",
        timestamp: new Date().toISOString(),
        latency_ms: latencyMs,
        tokens: {
          gate_input: gateInputTokens,
          gate_output: gateOutputTokens,
          ext_input: extInputTokens,
          ext_output: extOutputTokens,
        },
        gate_rel: rel,
        gate_type: gateType,
        is_gate_positive: isGatePositive,
      })
    );

    return NextResponse.json({
      live: true,
      prompts: {
        gate: tryPrompts.gate_version,
        extract: tryPrompts.extract_version,
      },
      gate: {
        rel,
        type: gateType,
        sip,
        ft,
        is_gate_positive: isGatePositive,
        verdict_text: !isGatePositive
          ? "Not about personal SIPs or mutual-fund investing by an individual."
          : `Relevant SIP item (${gateType === "exp" ? "Own experience" : "Question"})`,
      },
      extraction: extractionResult,
      grounded_spans: groundedSpans,
      latency_ms: latencyMs,
    });
  } catch (err: any) {
    // Only the error's type, never the text or the message (which could echo the input)
    console.error(`[try_api] unexpected failure: ${err?.name || "error"}`);
    return NextResponse.json(
      { error: "An unexpected error occurred during processing." },
      { status: 500 }
    );
  }
}
