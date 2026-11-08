"""Builds site/data/*.json from Claude's analysis results and corpus (SPEC-05 §2)."""

from __future__ import annotations

import gzip
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
from pathlib import Path

# Add project root to sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from analysis.defs import AREAS, areas, grp, is_early_journey, routes, v

SITE_DATA_DIR = WORKSPACE_ROOT / "site" / "data"

# Label mappings for clean human-readable UI presentation
CODE_LABELS = {
    # Q1 start reasons
    "goal_specific": "A specific goal",
    "other": "Other reason",
    "friend_colleague": "Friend or colleague",
    "first_salary_or_income": "First salary or income",
    "family_push": "Family push",
    "finfluencer_media": "Creator or media",
    "grow_wealth": "Grow wealth",
    "tax_saving": "Tax saving",
    "beat_fd_inflation": "Beat FD or inflation",
    "app_onboarding_offer": "App onboarding offer",
    "employer_or_advisor": "Employer or advisor",
    "unknown": "Not stated",
    # Q1 expectations
    "steady_growth": "Steady growth",
    "number_stated": "Specific return number",
    "quick_gains": "Quick gains",
    "safety": "Safety & capital preservation",
    "no_idea": "No clear idea",
    # Q1 influencers
    "self": "Own research",
    "finfluencer": "Creator or YouTube",
    "friend": "Friend",
    "colleague": "Colleague",
    "family": "Family",
    "advisor": "Advisor or CA",
    "app": "The investing app",
    # Q3 stop routes
    "payment_lapse": "Payment lapse (failed/missed debit, mandate)",
    "app_friction": "App friction (bugs, confusion, trust)",
    "returns_disappointment": "Returns disappointment (loss, flat, crash)",
    "cash_flow": "Cash flow (crunch, income change, life event)",
    "costs_tax": "Costs, tax, exit load",
    "advice_external": "Advice from others",
    "not_stated": "Not stated",
    # Q3 triggers
    "returns_disappointing": "Returns disappointing",
    "market_fall_news": "Market fall / crash news",
    "cash_crunch_expense": "Cash crunch / emergency expense",
    "income_change": "Income change / job loss",
    "payment_mandate_problem": "Payment / mandate failure",
    "app_issue_or_ux": "App issue or UX friction",
    "confusion_product_or_app": "Confusion about product or app",
    "trust_concern_platform": "Trust concern regarding platform",
    "fees_tax_exit_load": "Fees, tax, or exit load",
    "advice_from_someone": "Advice from someone",
    "influencer_or_media": "Influencer or media advice",
    "better_alternative": "Found better alternative",
    "goal_changed_or_reached": "Goal changed or reached",
    "forgot_or_didnt_notice": "Forgot or didn't notice",
    "none": "None stated",
    # Q3 experience
    "negative_returns": "Negative returns",
    "flat": "Flat returns",
    "positive": "Positive returns",
    "confusing_numbers": "Confusing numbers",
    "payment_problem": "Payment problem",
    "app_problem": "App problem",
    "small_absolute_value": "Small absolute gain/loss",
    # Q4 checks_what
    "returns_pct": "Returns percentage (%)",
    "xirr": "XIRR",
    "portfolio_value": "Total portfolio value",
    "rupee_gain_loss": "Rupee (₹) gain or loss",
    "nav": "NAV",
    "nothing": "Nothing",
    # Q4 check_frequency
    "daily": "Daily",
    "weekly": "Weekly",
    "monthly": "Monthly",
    "rarely": "Rarely",
    "never": "Never",
    # Q5 in_app_confusion
    "sip_date_first_debit": "SIP date / first debit",
    "skip_pause_cancel": "Skip, pause, cancel",
    "where_money_went": "Where my money went",
    "order_status_units": "Order status / units allotment",
    "autopay_mandate": "AutoPay / mandate setup",
    "returns_calculation": "How returns are calculated",
    "why_negative": "Why portfolio is negative",
    "exit_load_tax": "Exit load / capital gains tax",
    "plan_type_direct_regular": "Direct vs regular plan",
    # Q5 tried_in_app
    "customer_support": "Customer support",
    "help_or_ai_search": "Help / AI search",
    "cancel": "Cancel SIP",
    "edit_sip": "Edit SIP",
    "skip": "Skip instalment",
    "pause": "Pause SIP",
    "autopay": "AutoPay settings",
    "pay_now": "Pay now / one-time payment",
    # Q6 off_app_action
    "reddit_forum": "Reddit or forums",
    "searched_web": "Searched online",
    "youtube_finfluencer": "YouTube or creators",
    "advisor_ca": "Financial advisor or CA",
    "compared_fd_rd": "Compared with FD or RD",
    "bank": "Bank visit or branch",
    # Q7 kept_going_because
    "long_term_view": "Long-term view / discipline",
    "volatility_averaging": "Understood volatility & rupee-cost averaging",
    "small_affordable_amount": "Small, affordable instalment amount",
    "saw_recovery": "Saw portfolio recovery",
    "goal_reminder": "Goal reminder",
    "family_friend_advice": "Family or friend encouragement",
    # Q9 themes
    "C01": "Which fund / fund review / portfolio review",
    "C02": "Stay, pause or stop? / Market fall guidance",
    "C03": "Money stuck / Missing debits or credits",
    "C04": "Support that resolves / AMC or app responsiveness",
    "C05": "Control my SIP in-app / Skip, pause, edit, cancel",
    "C06": "Payments & AutoPay / Mandates, bank debits",
    "C07": "Orders, NAV, units / Order execution & allotment",
    "C08": "See my investment clearly / Dashboard, portfolio, XIRR",
    "C09": "Rules, tax, costs / Exit load, capital gains, regulations",
    "C10": "Account & paperwork / KYC, bank change, nominee",
    "C11": "Getting started & planning / Step-by-step guidance",
    "C12": "Fit SIP to cash flow / Flexible dates, irregular income",
    "C13": "Is my money safe? / Regulatory protection, fraud concerns",
    # Groups
    "stop": "Stopped SIP",
    "consider": "Considering stopping",
    "cont": "Kept going",
    # Sources
    "pooled": "All sources (pooled)",
    "reddit": "Reddit",
    "youtube": "YouTube",
    "appreviews": "App reviews (Play/App Store)",
    "other": "Other sources",
    # Populations
    "E": "Early journey (≤ 12 months / first time)",
    "all": "All episodes in corpus",
}

# Plain opportunity area titles from findings v1.2
AREA_META = {
    "A_first_debit_and_autopay": {
        "letter": "A",
        "name": "Payment & AutoPay problems (early-journey stories)",
        "addressable": "Yes",
        "chk_key": "A payments",
    },
    "B_money_status_and_resolution": {
        "letter": "B",
        "name": "Where is my money / order status + support that resolves",
        "addressable": "Yes",
        "chk_key": "B money & support",
    },
    "C_returns_expectations": {
        "letter": "C",
        "name": "Returns vs expectations (loss, flat, \"is this normal?\")",
        "addressable": "Partly: explain, don't advise; no fear or urgency",
        "chk_key": "C returns",
    },
    "D_cash_flow_flex": {
        "letter": "D",
        "name": "Cash-flow shocks (crunch, income change)",
        "addressable": "Yes (skip/pause/reduce as a safety valve)",
        "chk_key": None,
    },
    "E_sip_control": {
        "letter": "E",
        "name": "Control of the SIP (skip, pause, edit, cancel)",
        "addressable": "Yes",
        "chk_key": None,
    },
}


def load_private_terms_set() -> list[str]:
    terms_file = WORKSPACE_ROOT / "config" / "private_terms.txt"
    if not terms_file.exists():
        return []
    terms = []
    for line in terms_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            terms.append(line)
    return terms


def sanitize_data(obj: any) -> any:
    """Sanitize data structure to remove private terms and replace with 'human'/'the researcher'."""
    terms = load_private_terms_set()
    if isinstance(obj, dict):
        new_d = {}
        for k, val in obj.items():
            new_k = k
            for term in terms:
                new_k = re.sub(re.escape(term), "human", new_k, flags=re.IGNORECASE)
            new_d[new_k] = sanitize_data(val)
        return new_d
    elif isinstance(obj, list):
        return [sanitize_data(x) for x in obj]
    elif isinstance(obj, str):
        s = obj
        for term in terms:
            s = re.sub(rf"\b{term}'s\b", "the researcher's", s, flags=re.IGNORECASE)
            s = re.sub(rf"\bby {term}\b", "by the researcher", s, flags=re.IGNORECASE)
            s = re.sub(rf"\b{term}\b", "the researcher", s, flags=re.IGNORECASE)
        return s
    else:
        return obj


def get_git_commit_sha() -> str:
    """Get short git sha from VERCEL_GIT_COMMIT_SHA or git HEAD."""
    git_sha = os.environ.get("VERCEL_GIT_COMMIT_SHA")
    if git_sha:
        return git_sha[:7]
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=str(WORKSPACE_ROOT),
            text=True,
        ).strip()
    except Exception:
        return "unknown"


def copy_evidence_log() -> None:
    """Copy docs/evidence/ai_evidence_log_v1.md byte for byte into site/data/evidence.md (SPEC-05 §9.8)."""
    src = WORKSPACE_ROOT / "docs" / "evidence" / "ai_evidence_log_v1.md"
    dst = SITE_DATA_DIR / "evidence.md"
    dst.write_bytes(src.read_bytes())
    print(f"[copy_evidence_log] Copied evidence log byte-for-byte ({dst.stat().st_size} bytes)")


def build_prompts() -> None:
    """Build site/data/prompts.json from markdown prompt files."""
    gate_file = WORKSPACE_ROOT / "prompts" / "gate_v1_1.md"
    extract_file = WORKSPACE_ROOT / "prompts" / "extract_v1_2a.md"

    prompts_obj = {
        "gate_version": "gate_v1_1",
        "extract_version": "extract_v1_2a",
        "gate_system_prompt": gate_file.read_text(encoding="utf-8"),
        "extract_system_prompt": extract_file.read_text(encoding="utf-8"),
    }
    (SITE_DATA_DIR / "prompts.json").write_text(json.dumps(prompts_obj, ensure_ascii=False, indent=2), encoding="utf-8")
    print("[build_prompts] Wrote site/data/prompts.json")


def build_summary() -> dict:
    """Build summary.json: answer in 5 lines, data funnel, opportunity table, cant tell us."""
    findings_md = (WORKSPACE_ROOT / "docs" / "analysis" / "findings_part1.md").read_text(encoding="utf-8")
    part1_opps = json.loads((WORKSPACE_ROOT / "reports" / "analysis" / "part1_opps_v1.json").read_text(encoding="utf-8"))
    findings_chk = json.loads((WORKSPACE_ROOT / "reports" / "analysis" / "findings_check_results_v1.json").read_text(encoding="utf-8"))["results"]
    part1_v1 = json.loads((WORKSPACE_ROOT / "reports" / "analysis" / "part1_v1.json").read_text(encoding="utf-8"))

    # Read verified volume numbers from source files (no typed fallbacks)
    pool_stats = json.loads((WORKSPACE_ROOT / "reports" / "pool_stratum_table_v1.10.json").read_text(encoding="utf-8"))
    clean_count = pool_stats["total_clean"]

    addon_summary = json.loads((WORKSPACE_ROOT / "reports" / "addon_pipeline_summary.json").read_text(encoding="utf-8"))
    social_count = addon_summary["clean_items_gated"]

    gate_census_data = json.loads((WORKSPACE_ROOT / "reports" / "gate_census_o2_results.json").read_text(encoding="utf-8"))
    gate_census_count = gate_census_data["total_gated"] - 19

    # Extract verbatim Answer in Five Lines from §0
    sec0_match = re.search(r"## 0\. The answer in five lines\s*\n\n(.*?)(?=\n## 1\. )", findings_md, re.DOTALL)
    sec0_text = sec0_match.group(1).strip() if sec0_match else ""
    lines_raw = [p.strip() for p in sec0_text.split("\n\n") if p.strip()]
    five_lines = []
    if lines_raw:
        numbered_items = [re.sub(r"^\d+\.\s*", "", item).strip() for item in lines_raw[0].split("\n") if item.strip()]
        five_lines.extend(numbered_items)
        for extra in lines_raw[1:]:
            five_lines.append(extra.strip())

    git_sha = get_git_commit_sha()

    # Extract Data Funnel counts directly from part1_v1.json populations
    pops = part1_v1["populations"]
    funnel = [
        {
            "step": "Clean public records collected",
            "count": f"{clean_count:,} + {social_count} social",
            "detail": "Reddit, YouTube, Play/App Store, TradingQ&A, X, social manual",
        },
        {
            "step": "Gated by AI for relevance",
            "count": f"{gate_census_count:,}",
            "detail": "AI relevance check on every record in the pool",
        },
        {
            "step": "Analysed episodes",
            "count": f"{pops['MAIN|all']:,}",
            "detail": "Gate-positive, extracted with H11 deterministic overrides",
        },
        {
            "step": "Early-journey core episodes (E)",
            "count": f"{pops['MAIN|E']:,}",
            "detail": "First-time investor signal OR timing ≤ 12 months",
        },
        {
            "step": "E stop / consider / continue stories",
            "count": f"{pops['MAIN|E_stop']:,} / {pops['MAIN|E_consider']:,} / {pops['MAIN|E_cont']:,}",
            "detail": "Strict labels validated by date-aware second read (J1)",
        },
        {
            "step": "Targeted top-up episodes",
            "count": f"{pops['TOPUP|all']:,} ({pops['TOPUP|all_stop']:,} stop / {pops['TOPUP|all_cont']:,} cont)",
            "detail": "Variable-income & first-year stops (evaluated separately, zero weight in shares)",
        },
    ]

    # Build opportunity table
    opps_list = []
    for area_id, area_data in part1_opps["areas"].items():
        meta = AREA_META.get(area_id, {})
        chk_info = findings_chk.get(meta.get("chk_key", "")) if meta.get("chk_key") else None
        sep = area_data.get("separation", {})

        def format_sep(src_key: str) -> dict:
            s = sep.get(src_key)
            if not s:
                return {"stop": None, "cont": None, "mark": "~", "diff_ci": [None, None]}
            ci = s.get("diff_ci95", [0, 0])
            mark = "✓" if ci[0] is not None and ci[0] > 0 else "✗" if ci[1] is not None and ci[1] < 0 else "~"
            return {
                "stop_pct": round(s["stop"] * 100, 1),
                "cont_pct": round(s["cont"] * 100, 1),
                "diff_pct": round(s["diff"] * 100, 1),
                "diff_ci95": [round(ci[0] * 100, 1) if ci[0] is not None else None, round(ci[1] * 100, 1) if ci[1] is not None else None],
                "mark": mark,
                "n_stop": s.get("n_stop"),
                "n_cont": s.get("n_cont"),
            }

        opps_list.append({
            "id": area_id,
            "letter": meta.get("letter", ""),
            "name": meta.get("name", area_id),
            "definition": part1_opps.get("definitions", {}).get(area_id, ""),
            "reach_pct": round(area_data.get("reach_E", 0.0) * 100, 1),
            "reach_n": area_data.get("n_E", 0),
            "groww_share_pct": round(area_data.get("groww_share_of_area", 0.0) * 100, 1) if area_data.get("groww_share_of_area") is not None else None,
            "addressable": meta.get("addressable", "Yes"),
            "separation": {
                "reddit": format_sep("reddit"),
                "youtube": format_sep("youtube"),
                "appreviews": format_sep("appreviews"),
                "pooled": format_sep("pooled"),
            },
            "human_check": {
                "yes_count": chk_info.get("counts", {}).get("yes") if chk_info else None,
                "no_count": chk_info.get("counts", {}).get("no") if chk_info else None,
                "yes_share_pct": round(chk_info.get("yes_share", 0) * 100, 1) if chk_info else None,
                "yes_ci95_pct": [round(chk_info["yes_ci95"][0] * 100, 1), round(chk_info["yes_ci95"][1] * 100, 1)] if chk_info and chk_info.get("yes_ci95") else None,
            } if chk_info else None,
        })

    # Verbatim what engine cannot tell us (§4)
    sec4_match = re.search(r"## 4\. What the engine cannot tell us.*?\n(.*?)(?=\n## 5\. )", findings_md, re.DOTALL)
    sec4_text = sec4_match.group(1).strip() if sec4_match else ""
    cant_tell_us = [p.strip().lstrip("-").strip() for p in sec4_text.split("\n- ") if p.strip()]

    raw_summary = {
        "title": "Discovery Engine: First-Year SIP Continuity Findings",
        "git_sha": git_sha,
        "answer_in_five_lines": five_lines,
        "funnel": funnel,
        "opportunities": opps_list,
        "cant_tell_us": cant_tell_us,
    }
    return sanitize_data(raw_summary)


def build_questions() -> dict:
    """Build questions.json: 9 tabs with charts, CIs, n, and verbatim bullets."""
    findings_md = (WORKSPACE_ROOT / "docs" / "analysis" / "findings_part1.md").read_text(encoding="utf-8")
    part1_v1 = json.loads((WORKSPACE_ROOT / "reports" / "analysis" / "part1_v1.json").read_text(encoding="utf-8"))

    q_bullets = {}
    for q_num in range(1, 10):
        pat = rf"### Q{q_num}\..*?\n(.*?)(?=\n### Q\d|\n## 3\. )"
        m = re.search(pat, findings_md, re.DOTALL)
        if m:
            text = m.group(1).strip()
            bullets = [b.strip().lstrip("-").strip() for b in text.split("\n- ") if b.strip()]
            q_bullets[f"Q{q_num}"] = bullets

    questions_config = [
        {"id": "Q1", "num": 1, "title": "Why do people start, and what do they expect?", "tables": ["Q1_start_reason", "Q1_expectation", "Q1_influenced_by"]},
        {"id": "Q2", "num": 2, "title": "What changes in the months after starting?", "tables": ["Q2_events"], "has_timing": True},
        {"id": "Q3", "num": 3, "title": "What leads to pausing, reducing or stopping?", "tables": ["Q3_triggers", "Q3_experience"], "has_routes": True},
        {"id": "Q4", "num": 4, "title": "What do they check, and how often?", "tables": ["Q4_checks_what", "Q4_check_frequency"]},
        {"id": "Q5", "num": 5, "title": "What confuses or worries them inside the app?", "tables": ["Q5_in_app_confusion", "Q5_tried_in_app"]},
        {"id": "Q6", "num": 6, "title": "What do they do outside the app when unsure?", "tables": ["Q6_off_app_action"]},
        {"id": "Q7", "num": 7, "title": "What separates continuers from those who drop off?", "tables": ["Q7_kept_going_because"]},
        {"id": "Q8", "num": 8, "title": "How do patterns differ by segment?", "tables": [], "has_segments": True},
        {"id": "Q9", "num": 9, "title": "What unmet needs recur?", "tables": ["Q9_themes"]},
    ]

    res = {
        "labels": CODE_LABELS,
        "questions": [],
        "months_at_action": part1_v1.get("months_at_action", {}),
        "event_timing": part1_v1.get("event_timing", {}),
        "stop_routes": part1_v1.get("stop_routes", {}),
        "segments": part1_v1.get("segments", {}),
    }

    raw_tables = part1_v1.get("tables", {})

    for qc in questions_config:
        qid = qc["id"]
        q_entry = {
            "id": qid,
            "num": qc["num"],
            "title": qc["title"],
            "verbatim_bullets": q_bullets.get(qid, []),
            "has_timing": qc.get("has_timing", False),
            "has_routes": qc.get("has_routes", False),
            "has_segments": qc.get("has_segments", False),
            "tables": {},
        }

        for t_key in qc["tables"]:
            t_data = raw_tables.get(t_key, {})
            q_entry["tables"][t_key] = t_data

        res["questions"].append(q_entry)

    return sanitize_data(res)


def build_opportunities() -> dict:
    """Build opportunities.json: per area A-E indicators, reach, separation, human check, 5 quotes."""
    part1_opps = json.loads((WORKSPACE_ROOT / "reports" / "analysis" / "part1_opps_v1.json").read_text(encoding="utf-8"))
    findings_chk = json.loads((WORKSPACE_ROOT / "reports" / "analysis" / "findings_check_results_v1.json").read_text(encoding="utf-8"))["results"]

    # Pick 5 example stories per area with quote_ok = True
    area_examples = {a: [] for a in AREAS}
    seen_uids = set()

    with gzip.open(WORKSPACE_ROOT / "data" / "processed" / "v1.10" / "analysis_v2.jsonl.gz", "rt", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            uid = r["uid"]
            if uid in seen_uids:
                continue
            seen_uids.add(uid)
            if not is_early_journey(r) or not r.get("quote") or not r.get("quote_ok", False):
                continue
            matched_areas = areas(r)
            for a in matched_areas:
                if len(area_examples[a]) < 5:
                    area_examples[a].append({
                        "uid": uid,
                        "source": r.get("source_group"),
                        "scope": r.get("scope"),
                        "action": r.get("action_strict"),
                        "quote": r.get("quote"),
                        "unmet_need": r.get("unmet_need"),
                    })

    # Format output with plain area names and stripped 90-char excerpts from human-check notes (§9.3.2)
    areas_list = []
    for area_id, defn in AREAS.items():
        data = part1_opps["areas"].get(area_id, {})
        meta = AREA_META.get(area_id, {})
        chk_key = meta.get("chk_key")
        chk = findings_chk.get(chk_key) if chk_key else None

        # Clean notes: keep only [idx, mark, reviewer_note], drop 90-char story excerpt (§9.3.2)
        cleaned_notes = []
        if chk and chk.get("notes"):
            for n in chk["notes"]:
                # n is [idx, yes_no, note_text, excerpt_90_chars]
                if len(n) >= 3:
                    cleaned_notes.append([n[0], n[1], n[2]])
                else:
                    cleaned_notes.append(n)

        areas_list.append({
            "id": area_id,
            "name": meta.get("name", area_id),
            "definition": defn,
            "reach_E": data.get("reach_E", 0.0),
            "reach_E_pct": round(data.get("reach_E", 0.0) * 100, 1),
            "n_E": data.get("n_E", 0),
            "groww_share": data.get("groww_share_of_area"),
            "groww_share_pct": round(data.get("groww_share_of_area", 0.0) * 100, 1) if data.get("groww_share_of_area") is not None else None,
            "separation": data.get("separation", {}),
            "human_check": {
                "yes": chk.get("counts", {}).get("yes") if chk else None,
                "no": chk.get("counts", {}).get("no") if chk else None,
                "yes_share": chk.get("yes_share") if chk else None,
                "yes_share_pct": round(chk.get("yes_share", 0) * 100, 1) if chk else None,
                "ci95_pct": [round(chk["yes_ci95"][0] * 100, 1), round(chk["yes_ci95"][1] * 100, 1)] if chk and chk.get("yes_ci95") else None,
                "notes": cleaned_notes[:5],
            } if chk else None,
            "example_stories": area_examples.get(area_id, []),
        })

    return sanitize_data({"definitions": AREAS, "areas": areas_list})


def build_segments() -> dict:
    """Build segments.json: segment tables with Wilson 95% CIs and n."""
    part1_v1 = json.loads((WORKSPACE_ROOT / "reports" / "analysis" / "part1_v1.json").read_text(encoding="utf-8"))
    findings_md = (WORKSPACE_ROOT / "docs" / "analysis" / "findings_part1.md").read_text(encoding="utf-8")

    sec_q8 = re.search(r"### Q8\. How do patterns differ by segment\?.*?\n(.*?)(?=\n### Q9|\n## 3\. )", findings_md, re.DOTALL)
    bullets = [b.strip().lstrip("-").strip() for b in sec_q8.group(1).split("\n- ") if b.strip()] if sec_q8 else []

    return sanitize_data({
        "verbatim_bullets": bullets,
        "segments": part1_v1.get("segments", {}),
    })


def build_validation() -> dict:
    """Build validation.json: G1 held-out, Sonnet audit, Groq, H8, G2/G3 theme agreement."""
    val_summary = json.loads((WORKSPACE_ROOT / "reports" / "validation_summary.json").read_text(encoding="utf-8"))
    g1_heldout = json.loads((WORKSPACE_ROOT / "reports" / "g1_heldout_results.json").read_text(encoding="utf-8"))
    g2_agreement = json.loads((WORKSPACE_ROOT / "reports" / "g2_agreement_v0.json").read_text(encoding="utf-8"))
    g3_agreement = json.loads((WORKSPACE_ROOT / "reports" / "g3_agreement_v1.json").read_text(encoding="utf-8"))
    findings_chk = json.loads((WORKSPACE_ROOT / "reports" / "analysis" / "findings_check_results_v1.json").read_text(encoding="utf-8"))

    # Strip one_line_meaning strings from validation_summary (§9.2.4)
    for _, chk_data in val_summary.get("validation_checks", {}).items():
        if isinstance(chk_data, dict) and "one_line_meaning" in chk_data:
            del chk_data["one_line_meaning"]

    raw_val = {
        "summary": val_summary,
        "g1_heldout": g1_heldout,
        "g2_agreement": g2_agreement,
        "g3_agreement": g3_agreement,
        "findings_check": findings_chk,
    }
    return sanitize_data(raw_val)


def build_method() -> dict:
    """Build method.json: pipeline diagram, models, prompts, corrections log, limits, costs."""
    ledger = json.loads((WORKSPACE_ROOT / "data" / "state" / "anthropic_ledger.json").read_text(encoding="utf-8"))
    pool_stats = json.loads((WORKSPACE_ROOT / "reports" / "pool_stratum_table_v1.10.json").read_text(encoding="utf-8"))
    clean_count = pool_stats["total_clean"]

    addon_summary = json.loads((WORKSPACE_ROOT / "reports" / "addon_pipeline_summary.json").read_text(encoding="utf-8"))
    social_count = addon_summary["clean_items_gated"]

    gate_census_data = json.loads((WORKSPACE_ROOT / "reports" / "gate_census_o2_results.json").read_text(encoding="utf-8"))
    gate_census_count = gate_census_data["total_gated"] - 19

    val_summary = json.loads((WORKSPACE_ROOT / "reports" / "validation_summary.json").read_text(encoding="utf-8"))
    j1_count = val_summary["validation_checks"]["j1_vs_main"]["n"]

    part1_v1 = json.loads((WORKSPACE_ROOT / "reports" / "analysis" / "part1_v1.json").read_text(encoding="utf-8"))
    pops = part1_v1["populations"]

    # Pipeline diagram counts read directly from source files (§9.2.2)
    pipeline_steps = [
        {"step": "1. Public Collection", "detail": "Reddit, YouTube, Play/App Store, TradingQ&A, X, social manual", "records": f"{clean_count:,} + {social_count}"},
        {"step": "2. Scrub & Privacy", "detail": "PII scrubbed, author_hash HMAC, zero usernames or handles", "records": f"{clean_count:,}"},
        {"step": "3. AI Gate v1.1", "detail": "Haiku 5.5 message batch; relevance (r/a/n) and type (exp/q/adv)", "records": f"{gate_census_count:,} gated (O2 census)"},
        {"step": "4. Structured Extraction v1.2a", "detail": "Haiku 5.5 with H11 deterministic action rules and span grounding", "records": f"{pops['MAIN|all']:,} episodes"},
        {"step": "5. Second-Read Journey (J1)", "detail": "Date-aware event timeline extraction for strict action validation", "records": f"{j1_count:,} journey items"},
        {"step": "6. Strict Consensus Labels", "detail": "Deterministic consensus between main extraction and J1", "records": f"{pops['MAIN|E_stop']:,} stop / {pops['MAIN|E_consider']:,} consider / {pops['MAIN|E_cont']:,} cont (E)"},
        {"step": "7. Quantitative Analysis", "detail": "Wilson 95% CIs on Kish effective sample sizes, within-source", "records": f"{pops['MAIN|E']:,} early-journey core"},
    ]

    # Models and prompts with real pipeline parameters per stage (§9.2.3)
    models_prompts = [
        {"stage": "Gate", "model": "Claude Haiku 5.5 (claude-haiku-5-5)", "prompt_file": "prompts/gate_v1_1.md", "max_tokens": 4000, "thinking": "disabled", "batch_size": 40},
        {"stage": "Extraction", "model": "Claude Haiku 5.5 (claude-haiku-5-5)", "prompt_file": "prompts/extract_v1_2a.md", "max_tokens": 8000, "thinking": "disabled", "batch_size": 4},
        {"stage": "Journey J1", "model": "Claude Haiku 5.5 (claude-haiku-5-5)", "prompt_file": "prompts/journey_v1.md", "max_tokens": 8000, "thinking": "disabled", "batch_size": 4},
        {"stage": "Themes v1", "model": "Claude Haiku 5.5 (claude-haiku-5-5)", "prompt_file": "prompts/themes_v1.md", "max_tokens": 2000, "thinking": "disabled", "batch_size": 50},
        {"stage": "Interactive /try (Gate)", "model": "Claude Haiku 5.5 (claude-haiku-5-5)", "prompt_file": "prompts/gate_v1_1.md", "max_tokens": 400, "thinking": "disabled", "batch_size": 1},
        {"stage": "Interactive /try (Extract)", "model": "Claude Haiku 5.5 (claude-haiku-5-5)", "prompt_file": "prompts/extract_v1_2a.md", "max_tokens": 2000, "thinking": "disabled", "batch_size": 1},
    ]

    # Rejected outputs & corrections from SPEC-05 §6 & §9.2.3
    corrections = [
        {"id": 1, "title": "Extraction prompt v1.3a rejected", "detail": "Tried on G1-dev and rejected (action identification 11/20 vs 15/20 in v1.2a). Replaced by deterministic H11 rule."},
        {"id": 2, "title": "STOP C sample table transcription error", "detail": "Rows 5–10 were inadvertently typed rather than copied from JSON. Replaced with programmatic script copy and instituted Rule W8."},
        {"id": 3, "title": "Groq-vs-Sonnet cross-model agreement", "detail": "Initial audit showed κ = 0 due to unmatched UID keys across test runs. Resolved with strict UID matching."},
        {"id": 4, "title": "Publication date coverage backfill", "detail": "Export initially had posted='unknown' for main corpus due to add-on date rule mismatch; backfilled from UTC created_at (278 rows unparsable/unknown, 90,477 with posted YYYY-MM)."},
        {"id": 5, "title": "Theme codebook human agreement demotion", "detail": "Themes failed human agreement twice (κ 0.287 in G2, κ 0.357 in G3). Demoted from quantitative evidence to illustrative colour."},
        {"id": 6, "title": "Findings check re-classifications", "detail": "The researcher's blind check flagged insurance premium as payment failure and KYC blocks as payment problems. Area A definition was updated accordingly."},
        {"id": 7, "title": "Source rejections", "detail": "Quora answers rejected as advisor-dominated; LinkedIn comments rejected as B2B/advisor-heavy; Telegram broadcast channels rejected due to promotional spam."},
    ]

    method_obj = {
        "pipeline_steps": pipeline_steps,
        "models_prompts": models_prompts,
        "corrections": corrections,
        "ledger": {
            "cumulative_spend_usd": ledger["cumulative_spend_usd"],
            "production_spend_usd": ledger["production_spend_usd"],
            "test_spend_usd": ledger["test_spend_usd"],
            "cap_usd": ledger["cap_usd"],
        },
    }
    return sanitize_data(method_obj)


def build_examples() -> list[dict]:
    """Build examples.json: 6 real corpus engine output examples (W8, SPEC-05 §9.2.1).

    Selected with seed 20261102:
    - Area A: appstore:review:dhan:13379148727
    - Area B: reddit:post:1bhld0i
    - Area C: reddit:post:1uf348c
    - Area D: reddit:comment:n8lw365
    - Continuer: reddit:comment:o5om7ja
    - Gate-negative: reddit:post:1hgyuwr
    """
    target_items = [
        {
            "id": "ex1",
            "uid": "appstore:review:dhan:13379148727",
            "title": "First mutual fund order and onboarding support delay",
            "area_key": "A",
        },
        {
            "id": "ex2",
            "uid": "reddit:post:1bhld0i",
            "title": "SIP mandate rejection and order status inquiry",
            "area_key": "B",
        },
        {
            "id": "ex3",
            "uid": "reddit:post:1uf348c",
            "title": "Returns vs expectations and fund switching question",
            "area_key": "C",
        },
        {
            "id": "ex4",
            "uid": "reddit:comment:n8lw365",
            "title": "Daily SIP debit failure due to balance and bank charges",
            "area_key": "D",
        },
        {
            "id": "ex5",
            "uid": "reddit:comment:o5om7ja",
            "title": "Annual SIP step-up and disciplined continuation",
            "area_key": "continuer",
        },
        {
            "id": "ex6",
            "uid": "reddit:post:1hgyuwr",
            "title": "IPO application mandate failure inquiry",
            "area_key": "gate_negative",
        },
    ]

    target_uids = {item["uid"] for item in target_items}

    # Fetch text from sqlite index
    conn = sqlite3.connect(WORKSPACE_ROOT / "data" / "index" / "v1.10.sqlite")
    c = conn.cursor()
    corpus_texts = {}
    for item in target_items:
        u = item["uid"]
        c.execute("SELECT file, byte_offset, quote_ok FROM rec WHERE uid=?", (u,))
        row = c.fetchone()
        if not row:
            raise KeyError(f"Target example UID {u} not found in index")
        raw_file, byte_offset, _ = row
        with open(WORKSPACE_ROOT / raw_file, "rb") as rf:
            rf.seek(byte_offset)
            raw_bytes = rf.readline().decode("utf-8")
            raw_obj = json.loads(raw_bytes)
            text = raw_obj.get("text") or (raw_obj.get("title", "") + ("\n\n" + raw_obj.get("selftext", "") if raw_obj.get("selftext") else ""))
            corpus_texts[u] = text.strip()

    # Fetch gate outputs
    gate_map = {}
    with open(WORKSPACE_ROOT / "data" / "interim" / "gate_v1_1_v1.10_anthropic_haiku_batch.jsonl", "r", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            u = r.get("uid") or r.get("id")
            if u in target_uids:
                gate_map[u] = {
                    "rel": r.get("rel"),
                    "type": r.get("type"),
                    "sip": r.get("sip"),
                    "ft": r.get("ft"),
                }
                if len(gate_map) == len(target_uids):
                    break

    # Fetch extraction outputs from analysis_v2.jsonl.gz
    ext_map = {}
    with gzip.open(WORKSPACE_ROOT / "data" / "processed" / "v1.10" / "analysis_v2.jsonl.gz", "rt", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            u = r["uid"]
            if u in target_uids:
                ext_map[u] = r

    examples = []
    for item in target_items:
        u = item["uid"]
        g = gate_map[u]
        ext_r = ext_map.get(u)

        extraction = None
        if ext_r and g["rel"] == "r":
            extraction = {}
            for fld in [
                "action_primary", "actions_all", "trigger_primary", "triggers",
                "experience", "in_app_confusion", "unmet_need", "quote",
                "first_time_status", "months_since_start", "start_reason", "kept_going_because"
            ]:
                val = ext_r.get(fld)
                if val not in ("unknown", None, []):
                    extraction[fld] = val
            if ext_r.get("quote"):
                extraction["quote"] = ext_r["quote"]

        ex_obj = {
            "id": item["id"],
            "uid": u,
            "title": item["title"],
            "source": ext_r.get("source_group") if ext_r else "reddit_post",
            "note": "Real engine output from the corpus run",
            "model": "claude-haiku-5-5",
            "prompt_version": "gate_v1_1 / extract_v1_2a",
            "text": corpus_texts[u],
            "gate": g,
            "extraction": extraction,
            "routes": sorted(list(routes(ext_r))) if ext_r else [],
            "areas": sorted(list(areas(ext_r))) if ext_r else [],
        }
        examples.append(ex_obj)

    return sanitize_data(examples)


def build_stories() -> list[str]:
    """Build site/data/stories-*.json chunks <= 2 MB each, <= 10 MB total."""
    seen_uids = set()
    stories = []
    dropped_dups = 0

    with gzip.open(WORKSPACE_ROOT / "data" / "processed" / "v1.10" / "analysis_v2.jsonl.gz", "rt", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            uid = r["uid"]
            if uid in seen_uids:
                dropped_dups += 1
                continue
            seen_uids.add(uid)

            if not is_early_journey(r):
                continue

            g = grp(r.get("action_strict"))
            a = areas(r)
            # Retain all early-journey action stories + all opportunity area stories
            if g == "none" and not a:
                continue

            # quote_ok default is False if missing (§9.3.1)
            quote_ok = bool(r.get("quote_ok", False))
            q = r.get("quote") if quote_ok else None

            # Spans for evidence highlight: ONLY when quote_ok is True (§9.3.1)
            spans = {}
            if quote_ok:
                for fld in ["action_primary", "trigger_primary", "first_time_status", "in_app_confusion", "start_reason", "experience", "unmet_need"]:
                    val = r.get(fld)
                    if isinstance(val, dict) and val.get("s"):
                        spans[fld] = {"v": val.get("v"), "s": val.get("s")}
                    elif isinstance(val, list):
                        sp_list = [{"v": x.get("v"), "s": x.get("s")} for x in val if isinstance(x, dict) and x.get("s")]
                        if sp_list:
                            spans[fld] = sp_list

            work_val = r.get("work") or r.get("income_stability")
            if isinstance(work_val, dict):
                work_val = work_val.get("v")

            age_val = r.get("age")
            if not isinstance(age_val, (int, float)):
                try:
                    age_val = int(r.get("age_stated", {}).get("v") if isinstance(r.get("age_stated"), dict) else r.get("age_stated"))
                except Exception:
                    age_val = None

            amt_val = r.get("sip_amount_monthly")

            # first_time: unwrap first_time_status with v() (§9.3.3)
            ft_unwrapped = v(r.get("first_time_status"))
            gate_ft = r.get("gate_ft")
            first_time = bool(ft_unwrapped in ("stated", "likely") or gate_ft in ("s", "l"))

            stories.append({
                "uid": uid,
                "source": r.get("source_group"),
                "scope": r.get("scope"),
                "posted": r.get("posted"),
                "group": g,
                "action": r.get("action_strict"),
                "routes": sorted(list(routes(r))),
                "areas": sorted(list(a)),
                "quote": q,
                "spans": spans,
                "work": work_val if work_val not in ("unknown", None) else None,
                "age": age_val,
                "amount": amt_val,
                "first_time": first_time,
                "targeted": bool(r.get("targeted", False)),
            })

    print(f"[build_stories] Evaluated {len(seen_uids)} unique records, dropped {dropped_dups} duplicate UIDs.")
    print(f"[build_stories] Selected {len(stories)} early-journey stories with actions or opportunity areas.")

    # Chunk stories into <= 2 MB files
    SITE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    for existing in SITE_DATA_DIR.glob("stories-*.json"):
        existing.unlink()

    chunk_idx = 1
    current_chunk = []
    chunk_files = []
    current_size = 0
    max_chunk_bytes = 1_400_000  # 1.4 MB to stay strictly <= 2.0 MB (2,097,152 bytes)

    for s in stories:
        s_sanitized = sanitize_data(s)
        s_bytes = len(json.dumps(s_sanitized, ensure_ascii=False).encode("utf-8")) + 2
        if current_chunk and (current_size + s_bytes > max_chunk_bytes):
            chunk_file = SITE_DATA_DIR / f"stories-{chunk_idx}.json"
            chunk_file.write_text(json.dumps(current_chunk, ensure_ascii=False, indent=1), encoding="utf-8")
            chunk_files.append(chunk_file)
            print(f"[build_stories] Wrote {chunk_file.name}: {len(current_chunk)} stories, {chunk_file.stat().st_size / (1024*1024):.2f} MB")
            chunk_idx += 1
            current_chunk = []
            current_size = 0

        current_chunk.append(s_sanitized)
        current_size += s_bytes

    if current_chunk:
        chunk_file = SITE_DATA_DIR / f"stories-{chunk_idx}.json"
        chunk_file.write_text(json.dumps(current_chunk, ensure_ascii=False, indent=1), encoding="utf-8")
        chunk_files.append(chunk_file)
        print(f"[build_stories] Wrote {chunk_file.name}: {len(current_chunk)} stories, {chunk_file.stat().st_size / (1024*1024):.2f} MB")

    total_stories_size = sum(f.stat().st_size for f in chunk_files)
    print(f"[build_stories] Total stories size across {len(chunk_files)} chunks: {total_stories_size / (1024*1024):.2f} MB (limit <= 10 MB).")

    manifest = {
        "total_stories": len(stories),
        "chunk_count": len(chunk_files),
        "chunk_files": [f.name for f in chunk_files],
        "total_size_bytes": total_stories_size,
    }
    (SITE_DATA_DIR / "stories_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    return [f.name for f in chunk_files]


def main():
    SITE_DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("Building site/data/evidence.md...")
    copy_evidence_log()

    print("Building site/data/prompts.json...")
    build_prompts()

    print("Building site/data/summary.json...")
    summary = build_summary()
    (SITE_DATA_DIR / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")

    print("Building site/data/questions.json...")
    questions = build_questions()
    (SITE_DATA_DIR / "questions.json").write_text(json.dumps(questions, ensure_ascii=False, indent=1), encoding="utf-8")

    print("Building site/data/opportunities.json...")
    opps = build_opportunities()
    (SITE_DATA_DIR / "opportunities.json").write_text(json.dumps(opps, ensure_ascii=False, indent=1), encoding="utf-8")

    print("Building site/data/segments.json...")
    segments = build_segments()
    (SITE_DATA_DIR / "segments.json").write_text(json.dumps(segments, ensure_ascii=False, indent=1), encoding="utf-8")

    print("Building site/data/validation.json...")
    val = build_validation()
    (SITE_DATA_DIR / "validation.json").write_text(json.dumps(val, ensure_ascii=False, indent=1), encoding="utf-8")

    print("Building site/data/method.json...")
    method = build_method()
    (SITE_DATA_DIR / "method.json").write_text(json.dumps(method, ensure_ascii=False, indent=1), encoding="utf-8")

    print("Building site/data/examples.json...")
    examples = build_examples()
    (SITE_DATA_DIR / "examples.json").write_text(json.dumps(examples, ensure_ascii=False, indent=1), encoding="utf-8")

    print("Building site/data/stories-*.json chunks...")
    chunks = build_stories()

    print("\nAll site data files built successfully!")
    for p in sorted(SITE_DATA_DIR.glob("*.*")):
        print(f"  {p.name:25s} : {p.stat().st_size / 1024:8.1f} KB")


if __name__ == "__main__":
    main()
