# Part 1 findings: why first-time investors stop their SIP in the first year

**Version** v2.0 (final), 2 Nov 2026: v1.2 + §7, a claim-by-claim comparison with six general-AI answers to the same brief and four further checks. §0–§6 are unchanged from v1.2. Built by `analysis/build_findings_v2.py` from `reports/analysis/part1_v1.json` and `part1_opps_v1.json` (input `analysis_v2.jsonl.gz`, 92,399 rows). Every number below is read from those files.

## 0. The answer in five lines

1. **Most of what we collected is general SIP talk. The problem-specific core is small and we analyse it separately:** 32,868 early-journey episodes (first-time investors, or within 12 months of starting), of which **684 are stop stories, 405 are considering stopping, and 1156 kept going**.
2. **Losses make first-year investors *think* about stopping; mechanics make them *actually* stop.** Among those considering stopping, 55% describe negative returns. Among those who stopped, the most common routes are payment lapse (35%) and app friction (30%); returns disappointment is 21%.
3. **The two strongest separators between stoppers and continuers are payment/AutoPay problems and 'where is my money' / unresolved support.** Both point the same way on Reddit, YouTube and app reviews (opportunity table, §3).
4. **It happens early:** 49% of first-time stoppers who say when they stopped did so within 3 months, and 25% at months 7–12. In dated events, months 0–3 mix set-up problems (first-debit problem or failed payment 7%, confused in the app 6%) with early losses (9%); from month 4, seeing losses or flat returns dominates (24%–29%).
5. **Continuers hold a long-term frame** (71% of their reasons). Almost nobody describes skipping, pausing or reducing *instead of* stopping (reduced instead 1%; skipped or paused instead 0%; n=298). The flexibility exists in apps but is rarely described as the thing that kept someone going.

**Caveat that shapes Part 3.** Public posts over-represent loud failures; people who simply drift away rarely post. The payment/friction story is strongly evidenced; the size of quiet drift is not knowable from public data and is the main thing the interviews must test.

## 1. What data answers the problem

| Step | Count |
|---|---|
| Clean public records collected (Reddit, YouTube, Play/App Store, TradingQ&A, X, social; `reports/RUN_REPORT.md`) | 1,630,416 + 741 social |
| Gated by AI for relevance (pool v2 + O2) | 231,654 |
| Analysed episodes (gate-positive, extracted, labelled) | 90,755 |
| **Early-journey episodes (E)** | **32,868** |
| E stop / considering / continue stories (strict labels, second read J1) | **684 / 405 / 1156** |
| Targeted top-up (income stability, first-year stops; not in any share below) | 1,642 episodes, 46 stop / 66 continue |

Shares are "of those who mention the field", weighted for sampling. Stop-vs-continue claims are only made when they hold within a single source, because app reviews hold many stop stories and few continue stories.

## 2. The nine questions

### Q1. Why do people start, and what do they expect?
- Reasons (E, n=3419): a specific goal 27%; other 20%; friend/colleague 13%; first salary/income 10%; family 9%; creator/media 6%; grow wealth 5%.
- Expectations (E, n=3616): steady growth 45%; a specific return number 22%; quick gains 18%; safety 9%; no idea 5%.
- Who influenced them (E, n=5065): own research 75%; creator/YouTube 7%; friend/colleague 6%; family 5%; advisor 4%; the app 3%.
- Stoppers more often expected quick gains (22%, n=42) than continuers (16%, n=145); continuers more often expected steady growth (55% vs 35%). Small n: indicative.

### Q2. What changes in the months after starting?
- **When first-time investors act** (stated timing): stoppers 49% at 0–3 months, 12% at 4–6, 25% at 7–12; considering stopping peaks later (30% at 7–12).
- **What happens when** (dated events in the second read):

| Months since start | Most common events |
|---|---|
| 0-3 (n=1471) | started 56%; saw a loss or flat returns 9%; confused in the app 6%; considered stopping 6%; increased 5%; first-debit problem/gap 4% |
| 4-6 (n=248) | saw a loss or flat returns 24%; considered stopping 17%; increased 13%; checked returns 10%; stopped 6%; confused in the app 6% |
| 7-12 (n=488) | saw a loss or flat returns 29%; increased 15%; considered stopping 15%; checked returns 13%; switched 6%; stopped 5% |
| 13+ (n=625) | saw a loss or flat returns 29%; checked returns 20%; considered stopping 17%; increased 11%; stopped 6%; switched 6% |

- Reading: months 0–3 mix set-up problems (first-debit problem or failed payment 7%, app confusion 6%) with early losses (9%); from month 4, losses or flat returns (24%–29%) and thinking about stopping dominate. Dated events are a minority of stories, so this is the shape, not a rate.

### Q3. What leads to pausing, reducing or stopping?
- **Routes to a stop** (E stop stories, n=684; a story can have more than one):

| Route | Pooled | Reddit | YouTube | App reviews |
|---|---|---|---|---|
| Payment lapse (failed/missed debit, mandate, first debit) | 35% | 17% | 41% | 80% |
| App friction (bugs, confusion, trust) | 30% | 20% | 26% | 60% |
| Returns disappointment (loss, flat, market fall) | 21% | 28% | 6% | 9% |
| Cash flow (crunch, income change, life event) | 9% | 11% | 10% | 2% |
| Costs, tax, exit load | 3% | 3% | 1% | 4% |
| Advice from others | 5% | 6% | 1% | 3% |
| Not stated | 29% | 37% | 34% | 4% |
| n | 684 | 435 | 88 | 149 |

- Reddit stoppers lean to returns (28%); YouTube and app-review stoppers lean to payments (41%, 80%). Both routes are real; the mix depends on who posts where.

### Q4. What do they check, and how often?
- What (E, n=1453): % returns 33%; XIRR 28%; portfolio value 18%; ₹ gain/loss 17%; NAV 4%; nothing 2%.
- Continuers most often check XIRR (34%); those considering stopping check % returns (40%) and ₹ gain/loss (33%); stoppers check portfolio value (35%).
- How often is rarely stated (E, n=191): rarely 42%; daily 31%; monthly 15%; never 9%; weekly 3%. Too thin for stop-vs-continue: an interview question.

### Q5. What confuses or worries them inside the app?
- E stoppers (n=306): SIP date / first debit 20%; skip/pause/cancel 20%; where my money went 17%; order status/units 16%; AutoPay/mandate 13%; other 6%.
- E continuers (n=142): SIP date / first debit 16%; AutoPay/mandate 16%; how returns are calculated 15%; other 14%; why it's negative 13%; order status/units 8%.
- Groww posts (all, n=3942): AutoPay/mandate 22%; other 18%; order status/units 13%; where my money went 12%; SIP date / first debit 9%; skip/pause/cancel 9%.
- **What they tried in the app before stopping** (E stoppers, n=256): support, not resolved 40%; cancel, used 14%; help/AI search, not resolved 8%; cancel, could not access 3%; AutoPay, not resolved 3%. For Groww posts (all, n=1690): support, not resolved 46%; help/AI search, not resolved 5%; edit SIP, could not access 4%.

### Q6. What do they do outside the app when unsure?
- E (n=3492): asked on Reddit/forums 27%; none 22%; searched online 20%; YouTube/creators 14%; advisor/CA 5%; family 5%; friend/colleague 4%.
- Continuers more often turn to community (Reddit 35%, YouTube 10%); stoppers more often say they did nothing (35%) or went to an advisor (9%) or the bank (8%).
- Telegram and WhatsApp barely appear in SIP talk (5 and 55 gate-positive mentions in 1.63M records; `reports/telegram_whatsapp_mentions.json`).

### Q7. What separates continuers from those who drop off?
- Continuers' reasons (E, n=298): long-term view 71%; understood volatility/averaging 12%; small, affordable amount 8%; saw recovery 3%; goal reminder 2%; family/friend advice 2%.
- Separation, by area, within source: see the opportunity table (§3). First-months payment problems and money/order status with unresolved support separate on all three sources; returns disappointment separates on Reddit only.
- Continuers also see losses: negative returns are mentioned by 21% of continuers and 21% of stoppers. Losses alone don't explain who leaves.

### Q8. How do patterns differ by segment?
Stop share = stop ÷ (stop + continue) among E stories with the segment stated. It compares segments; it is not a population rate.

| Segment | Stop share [95% CI], n |
|---|---|
| SIP ≤ ₹1k/month | 39% [31%–49%], n=111 |
| SIP ₹1k–3k | 30% [21%–39%], n=102 |
| SIP ₹3k–10k | 19% [15%–25%], n=276 |
| SIP > ₹10k | 23% [19%–27%], n=458 |
| Salaried | 23% [19%–28%], n=315 |
| Student | 27% [20%–34%], n=157 |
| Variable/gig income | 33% [14%–61%], n=12 |
| Age ≤ 22 | 16% [12%–21%], n=226 |
| Age 23–27 | 28% [23%–34%], n=265 |
| Age 28–32 | 12% [6%–22%], n=72 |
| Money from salary | 21% [17%–27%], n=269 |
| Money from family | 36% [23%–51%], n=46 |
| Pocket money | 12% [6%–23%], n=56 |
| Started on own research | 28% [24%–33%], n=492 |
| Started via creator/YouTube | 17% [8%–32%], n=39 |
| Started via advisor | 46% [27%–66%], n=23 |
| Expected steady growth | 16% [10%–25%], n=96 |
| Expected quick gains | 29% [15%–47%], n=31 |

- Clearest gradient: **small SIPs stop more** (≤ ₹1k 39% vs > ₹10k 23%).
- Income stability stays thin even after the targeted top-up (variable/gig n=12 in the main data): the engine can't answer this cell; it goes to interviews.

### Q9. What unmet needs recur?
- Needs by group (AI theme coding of the stated need; **indicative only**: human–AI agreement was low, see below). E stoppers (n=524): fund choice/review 35%; money stuck 22%; stay, pause or stop? 14%; support that resolves 10%; payments/AutoPay 8%; control my SIP 7%.
- E considering (n=346): stay, pause or stop? 57%; fund choice/review 40%; control my SIP 11%; rules, tax, costs 6%; getting started/planning 4%. E continuers (n=807): fund choice/review 67%; stay, pause or stop? 17%; getting started/planning 11%; rules, tax, costs 3%; cash-flow fit 2%.
- Pattern: stoppers need their money and a working fix; people on the fence need help deciding whether to stay; continuers mostly want fund reviews (which we cannot give).

## 3. Opportunity areas (early-journey episodes)

Reach = share of E episodes showing the area. Cells = share among stop vs continue stories in that source. ✓ = difference above zero with 95% confidence; ~ = not distinguishable; ✗ = continuers higher.

| Area | Reach (n) | Reddit stop vs cont | YouTube | App reviews | Groww share | Addressable without fund advice or FOMO? |
|---|---|---|---|---|---|---|
| A. Payment & AutoPay problems (early-journey stories) | 5% (1,797) | 18% vs 4% ✓ | 42% vs 16% ✓ | 77% vs 34% ✓ | 19% | Yes |
| B. Where is my money / order status + support that resolves | 3% (1,083) | 13% vs 2% ✓ | 39% vs 6% ✓ | 82% vs 19% ✓ | 24% | Yes |
| C. Returns vs expectations (loss, flat, "is this normal?") | 14% (4,597) | 39% vs 26% ✓ | 18% vs 24% ~ | 13% vs 9% ~ | 6% | Partly: explain, don't advise; no fear or urgency |
| D. Cash-flow shocks (crunch, income change) | 2% (791) | 12% vs 5% ✓ | 10% vs 1% ✓ | 2% vs 0% ~ | 4% | Yes (skip/pause/reduce as a safety valve) |
| E. Control of the SIP (skip, pause, edit, cancel) | 2% (729) | 6% vs 1% ✓ | 44% vs 4% ✓ | 13% vs 12% ~ | 13% | Yes |

**Reading.** A and B are the strongest and most consistent separators, sit in the first months, and map to the metric directly (no successful instalment in the last 30 days = inactive). C has the widest reach and drives "thinking about stopping", but separates only on Reddit; it is the right lens for the 4–12 month wobble. D and E are smaller but consistent, and they are the levers that turn a would-be stop into a skip or a reduction.

### Human check of the top three findings (the researcher, blind, seeded random sample)
For each area, 20 early-journey stop stories the engine flagged were drawn at random (seed 20261102, `data/manual/findings_check_key.json`). The researcher marked whether each story really shows the area.

| Area | Yes | No | Not answered | Yes share [95% CI] |
|---|---|---|---|---|
| A. Payment & AutoPay problems | 16 | 4 | 0 | 80% [58%–92%] |
| B. Money status + unresolved support | 19 | 0 | 1 | 100% [83%–100%] |
| C. Returns disappointment | 15 | 5 | 0 | 75% [53%–89%] |

- What the "no"s were: in A, two KYC blocks, one SIP cancelled for an unstated reason and one start-up problem were flagged as payment problems. One story marked "yes" is about an insurance premium, not a mutual fund (a relevance error the reviewer noted), so a strict reading of A is one lower. Several "yes" stories had no timing, so A is "payment problems in early-journey stories", not proven to be the first months. In C, by the reviewer's notes, three flagged stories show no disappointment (one says the SIP beats FDs), one only describes a payment pattern and one could not be read. The one unanswered B story is in Tamil.
- KYC came up three times in the notes as an early blocker. The engine has no KYC code, so this goes to the interviews.

### Example quotes per stop route (seeded random, verbatim, English only)
- *Payment lapse* (reddit, general): "after 13 days I tried again and it worked"
- *Payment lapse* (appreviews, other_app): "I got an error stating 'REQUESTED URL WAS REJECTED'. But I can't see the transaction pending in kfinkart, neither my account was reimbursed."
- *App friction* (youtube, general): "maine same procedure mai sip star Kiya tha but 5 bar sip cancel huwa , aisa kyu huwa hai bata sakte ho kya"
- *App friction* (appreviews, other_app): "they are deducting 200, 400 hundred daily and I can't find statment for the same.. till date ho much they have deducted"
- *Returns disappointment* (reddit, general): "I'll be honest that i got greedy while picking MF and chose the ones with highest returns. I also stopped my SIP into some as the market was crashing."
- *Returns disappointment* (reddit, general): "I started my investment journey about 3 days ago and I'm very new to this."
- *Cash flow* (reddit, general): "Currently paused SIPs for last 3 months as had some expenses to cover, starting back next month."
- *Cash flow* (reddit, general): "I started investing in mutual funds and debt fund in nov of 2025, but had to withdraw due to an emergency. My MF were in negative"

## 4. What the engine cannot tell us (→ interviews)
- **Quiet drift**: people who stop thinking about it and let the SIP lapse rarely post. Size unknown.
- **Income stability** cells (variable/gig, business) stay below 30 stories.
- **How often people check**: thin.
- **Unmet-need themes**: human–AI agreement on the theme list stayed below the 0.6 κ bar (G2 researcher–Claude κ 0.287, G3 κ 0.357; model–researcher κ 0.323; Claude–model κ 0.817). Themes are used as colour, not as evidence.
- **Whether a SIP feels like a monthly expense or like something you own**: the engine has no code for this feeling, so it can't size it or test whether it separates people who stop from people who keep going. Interviews test it.

## 5. Method and validation pointers
- Labels: strict action labels require a second, date-aware read (J1) to confirm the writer acted; counts are lower bounds (G1 held-out: 2 of 8 real actions found, 0 invented).
- Structured fields were checked against Sonnet on 300 items: action 77%, trigger 85%, the other fields 83%–100% (agreement counts 'unknown' = 'unknown'; where both models filled the field it is lower, e.g. in-app confusion 63%). A second model family (Groq) was also checked; figures in `reports/validation_summary.json` and `reports/sonnet_audit_results.json`.
- Weights: T2b episodes carry weight 2; targeted top-up rows carry no weight in shares.
- Scripts: `analysis/defs.py` (shared definitions), `analysis/part1_v1.py`, `analysis/part1_opps_v1.py`, `analysis/build_findings_v2.py`, `analysis/claims_check_v1.py`, `analysis/build_check_sheet.py`.

## 6. How to verify any number here
1. Every number comes from two JSON files: `reports/analysis/part1_v1.json` (questions, segments, routes, timing, quotes) and `reports/analysis/part1_opps_v1.json` (opportunity table). Human checks: `reports/g2_agreement_v0.json`, `reports/g3_agreement_v1.json`, `reports/analysis/findings_check_results_v1.json`.
2. To recompute: `python -I analysis/part1_v1.py data/processed/v1.10/analysis_v2.jsonl.gz reports/analysis/part1_v1.json`, then `python -I analysis/part1_opps_v1.py ...`, then `python -I analysis/claims_check_v1.py <repo> reports/analysis/claims_check_v1.json` and `python -I analysis/build_findings_v2.py ...` (run with `PYTHONHASHSEED=0`). The input export is fixed (sha256 62ab271b…).
3. To check a definition: "early-journey" (E), the groups, weights and intervals are in the docstring at the top of `analysis/part1_v1.py`; the five opportunity indicators are the `areas()` function in `analysis/defs.py`, used by `analysis/part1_opps_v1.py`.
4. To read the stories behind a number: filter `analysis_v2.jsonl.gz` by `action_strict` and the field in question; each coded field carries the exact span it was based on (`s`).

## 7. How the engine compares with general-AI answers (added in v2.0)
Six write-ups of Parts 1–2 made with general AI tools (web search plus synthesis) were compared with the engine, claim by claim (`docs/research/ai_baselines_comparison_v1.md`). Five of the six tell one story: disappointing returns erode confidence, people stop in months 3–9, influencer-led youngsters are most at risk, and goals and reassurance fix it. The engine agrees with parts of it and corrects the rest.

| What general AI says | What the engine shows | Verdict |
|---|---|---|
| Disappointing returns are why people stop | Losses drive *considering* (55% of that group describe negative returns), but stoppers and continuers mention them at the same rate (21% vs 21%); "market fall" is the trigger for 5% of stoppers and 10% of continuers | Explains who wobbles, not who leaves |
| Months 3–9 are the critical window | 49% of first-time stoppers who give a timing stopped in months 0–3; considering peaks at months 7–12 (30%) | Stops come earlier |
| Failed debits matter but can't be sized | Payment & AutoPay problems separate stoppers from continuers on all three sources (§3) | Agree; the engine adds the size signal |
| Influencer-led starters stop most | Stop share: started via creator/YouTube 17% [8%–32%], n=39; own research 28% [24%–33%], n=492 | Not supported (small n) |
| Salary-date mismatch, over-commitment and bounce fees cause cancellations | In stoppers' extracted evidence: salary timing 0 of 684, amount too high 5 of 684, bounce/ECS charges 6 of 684 | Barely visible in public text; tested in interviews |
| People cancel AutoPay in GPay/PhonePe | 2 of 684 stoppers' evidence mentions it | Not seen; one interview probe |
| Goals keep people going | Continuers' reasons: long-term view 71%, goal reminder 2% | A long-term frame protects; explicit goals are rarely the reason |

### Four further checks
- **Stoppers go quieter.** Outside the app, stoppers more often did nothing (35% vs 30% of continuers) and less often asked a community (Reddit/forums 23% vs 35%); when they did reach out, it was more often an advisor (9%) or the bank (8%). n = 114 stop, 136 continue: indicative.
- **XIRR readers stay.** Continuers most often check XIRR (34%); those considering stopping watch % returns (40%) and ₹ gain/loss (33%), and only 15% XIRR. n = 145 continue, 60 considering.
- **The headline is not a market-crash artefact.** Only 36 of 684 early-journey stop stories were posted in March–May 2026, the correction window. In that window returns disappointment (31%) and cash flow (19%) are larger stop routes than in other months (20%, 8%), and payment lapse smaller (22% vs 36%). Market state matters, but it does not drive the corpus-wide picture.
- **Money source.** Stop share among early-journey stories that state where the money came from: family money 36% [23%–51%], n=46; salary 21% [17%–27%], n=269; pocket money 12% [6%–23%], n=56. Small cells: a direction for the interviews, not a finding.

Method note: "mentions in extracted evidence" search only the verbatim spans and quotes the engine extracted, not the full posts, so they are lower bounds.
