"""Builds the AI Evidence Log in plain English (v2, 14 Nov 2026): docs/evidence/ai_evidence_log_v1.md and its byte copy
site/data/evidence.md (the /evidence page). Replaces build_evidence_log_v1.py, mvp_golden_section_v1.py and
evidence_additions_v1.py: one script now writes the whole page.

Every number on the page is read from a file by this script; none is typed. No personal names: the human labeller is
"the researcher". The page is ordered by the brief's three asks: 1 sources and volume, 2 the hand-labelled test set,
3 where AI output was rejected or corrected. Sections 5 and 6 keep their numbers because the deck cites them.

Usage: python -I analysis/build_evidence_log_v2.py <research_repo_root>
Inputs from the research repo (D:/sip-continuity-research): reports/spec02_clean.md, data/snapshots/v1.10/manifest.json,
  data/interim/gate_v1_1_v1.10_anthropic_haiku_batch.jsonl, data/processed/v1.10/analysis_v2.jsonl.gz,
  data/manual/g1_key.json, reports/g1_heldout_results.json, reports/stopb_results.json, reports/dev_recheck_results.json,
  reports/h11_rescore_results.json, reports/sonnet_audit_results.json, reports/validation_summary.json,
  reports/g2_agreement_v0.json, reports/g3_agreement_v1.json, reports/analysis/findings_check_results_v1.json,
  reports/residual_recall_v1.9.json, reports/telegram_whatsapp_mentions.json.
Inputs from this repo: reports/analysis/part1_v1.json, reports/analysis/areas_fields_only_v1.json,
  docs/analysis/findings_part1.md, reports/mvp/sensecheck_golden_v1.json, reports/mvp/eval_results_20261109.json,
  reports/mvp/runs/*.json.
"""
from __future__ import annotations

import ast, collections, gzip, hashlib, json, math, re, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

RES = Path(sys.argv[1])
PUB = Path(__file__).resolve().parent.parent
DATE = '14 Nov 2026'
USED = []


def J(root, rel):
    USED.append((root, rel))
    return json.loads((root / rel).read_bytes())


def n(x):
    return f"{x:,}" if isinstance(x, int) else f"{x:,.0f}"


def pc(x, d=0):
    return f"{x * 100:.{d}f}%"


def kk(k, m):
    return f"{k} of {m}"


def month(s):
    return datetime.strptime(s, '%Y-%m').strftime('%B %Y')


# ======================================================================= inputs: section 1
clean_md = (RES / 'reports/spec02_clean.md').read_text(encoding='utf-8'); USED.append((RES, 'reports/spec02_clean.md'))
clean_by_src, clean_total = {}, None
for line in clean_md.splitlines():
    m = re.match(r"\|\s*`ok`\s*\|\s*([\d,]+)\s*\|", line)
    if m:
        clean_total = int(m.group(1).replace(',', ''))
    m = re.match(r"\|\s*([a-z_]+)\s*\|\s*([\d,]+)\s*\|.*\|\s*([\d,]+)\s*\|\s*$", line)
    if m and m.group(1) != 'Source':
        clean_by_src[m.group(1)] = int(m.group(2).replace(',', ''))
assert clean_total == sum(clean_by_src.values()), 'clean totals do not reconcile'
manifest = J(RES, 'data/snapshots/v1.10/manifest.json')

gate_n, gate_pos, gate_origin = collections.Counter(), collections.Counter(), collections.Counter()
seen = set()
USED.append((RES, 'data/interim/gate_v1_1_v1.10_anthropic_haiku_batch.jsonl'))
with open(RES / 'data/interim/gate_v1_1_v1.10_anthropic_haiku_batch.jsonl', encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        if r['uid'] in seen:
            continue
        seen.add(r['uid'])
        src = r['uid'].split(':')[0]
        gate_n[src] += 1; gate_origin[r.get('origin')] += 1
        if r.get('gate_positive'):
            gate_pos[src] += 1

ep, ep_scope, ep_tier = collections.Counter(), collections.Counter(), collections.Counter()
dups = targeted = 0
posted = []
seen = set()
USED.append((RES, 'data/processed/v1.10/analysis_v2.jsonl.gz'))
with gzip.open(RES / 'data/processed/v1.10/analysis_v2.jsonl.gz', 'rt', encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        if r['uid'] in seen:
            dups += 1; continue
        seen.add(r['uid'])
        if r.get('targeted'):
            targeted += 1; continue
        ep[r['uid'].split(':')[0]] += 1; ep_scope[r.get('scope')] += 1; ep_tier[(r.get('tier'), r.get('w2'))] += 1
        p = r.get('posted')
        if p and p != 'unknown':
            posted.append(p)
ep_total = sum(ep.values())
P1 = J(PUB, 'reports/analysis/part1_v1.json')
pops = P1['populations']
rr = J(RES, 'reports/residual_recall_v1.9.json')
tw = J(RES, 'reports/telegram_whatsapp_mentions.json')
t2b_w = sorted({str(w) for (t, w) in ep_tier if t == 'T2b'})
t2b_n = sum(v for (t, w), v in ep_tier.items() if t == 'T2b')
social = gate_n['manual']

# ======================================================================= inputs: sections 2-4
key = J(RES, 'data/manual/g1_key.json')
G1 = J(RES, 'reports/g1_heldout_results.json')
held = [r for r in key['records'] if r['split'] == 'heldout']
gate, ext = G1['gate'], G1['extract']
fls = ext['filled_label_scores']
size = G1['sample_size']
fa = fls['action_primary']
SB = J(RES, 'reports/stopb_results.json')['scores']
DR = J(RES, 'reports/dev_recheck_results.json')
HR = J(RES, 'reports/h11_rescore_results.json')['H11_either']
V = J(RES, 'reports/validation_summary.json')['validation_checks']
SON = J(RES, 'reports/sonnet_audit_results.json'); sm = SON['main_pass_agreement']
FC = J(RES, 'reports/analysis/findings_check_results_v1.json')['results']
G2 = J(RES, 'reports/g2_agreement_v0.json'); G3 = J(RES, 'reports/g3_agreement_v1.json')
DEV = key['dev_records']
v12 = SB['filled_label_scores']['haiku_v1_2a']['action_primary']; v12k = SB['extract']['haiku_v1_2a']['action_primary_k']
v13 = DR['extract']['filled_label_scores']['action_primary']; v13k = DR['extract']['action_primary_k']

SGL = {'reddit_post': 'Reddit post', 'reddit_comment': 'Reddit comment', 'appstore': 'App Store', 'playstore': 'Play Store',
       'youtube': 'YouTube', 'tradingqna': 'TradingQ&A', 'x': 'X', 'social_manual': 'social'}
REL = {'r': 'SIPs/funds', 'a': 'other investing'}
TYP = {'exp': 'own story', 'q': 'question', 'adv': 'advice', 'other': 'other'}
CODE = {'redeemed_withdrew': 'withdrew money', 'switched_platform': 'switched apps', 'started_new': 'started a SIP',
        'stopped_cancelled': 'stopped', 'customer_support': 'customer support'}


def plain(x):
    if isinstance(x, str) and x.startswith('{'):
        x = ast.literal_eval(x)
    x = str(x.get('v')) if isinstance(x, dict) else str(x)
    return CODE.get(x, x.replace('_', ' '))


type_miss = [d for d in gate['details'] if not d['type_match']]
exp_as_q = [d['g1_id'] for d in type_miss if d['sahil_type'] == 'exp' and d['model_type'] == 'q']
act_dis = [d for d in ext['disagreements'] if d['field'] == 'action_primary']
act_missed = [d for d in act_dis if d['model'] == 'unknown']
act_wrong = [d for d in act_dis if d['model'] != 'unknown']
missed_after_q = [d['g1_id'] for d in act_missed if d['g1_id'] in exp_as_q]
feat_dis = [d for d in ext['disagreements'] if d['field'] == 'feature_mentioned']
feat_missed = [d for d in feat_dis if d['model'] == 'unknown' and d['sahil'] != 'none']
feat_cs = sum(1 for d in feat_missed if 'customer_support' in d['sahil'])
iac_dis = [d for d in ext['disagreements'] if d['field'] == 'in_app_confusion']
iac_over = [d for d in iac_dis if d['sahil'] == 'unknown' and d['model'] != 'unknown']
iac_miss = [d for d in iac_dis if d['model'] == 'unknown' and d['sahil'] != 'unknown']
iac_diff = [d for d in iac_dis if d not in iac_over and d not in iac_miss]
rel_miss = [d for d in gate['details'] if not d['rel_match']]
src_mix = collections.Counter(r['source_group'] for r in held)
A_ = FC['A payments']; B_ = FC['B money & support']; C_ = FC['C returns']
a_n = sum(A_['counts'].values()); b_ans = B_['counts']['yes'] + B_['counts'].get('no', 0); c_n = sum(C_['counts'].values())
kyc_a = sum(1 for x in A_['notes'] if 'KYC' in x[2])
kyc_all = sum(1 for a in FC.values() for x in a.get('notes', []) if 'KYC' in x[2])
ins = [x for x in A_['notes'] if 'insurance' in x[2].lower()]
ins_yes = sum(1 for x in ins if x[1] == 'yes')

# ======================================================================= inputs: sections 7-9 (this repo)
AF = J(PUB, 'reports/analysis/areas_fields_only_v1.json')
findings = (PUB / 'docs/analysis/findings_part1.md').read_bytes().decode('utf-8').replace('\r\n', '\n')
USED.append((PUB, 'docs/analysis/findings_part1.md'))

# ======================================================================= the page
L = []
add = L.append

add("# AI Evidence Log: the SIP-continuity discovery engine (Groww)")
add("**What this page is.** The evidence behind the AI discovery engine built for the brief *\"increase the share of first-time "
    "mutual-fund investors who still have an active SIP 12 months after starting\"*. The brief asked for three things, and the "
    "first three sections answer them in order:")
add("1. **What the engine read:** its sources, and how many posts (section 1).\n"
    "2. **A test set of 20 posts labelled by hand:** how often the engine agreed with the researcher, and where it got things wrong (section 2).\n"
    "3. **Where we rejected or corrected the AI's output, and why:** three cases, plus smaller fixes (section 3).")
add("Sections 4 to 9 add further accuracy checks, the MVP's own test, what this evidence can't show, and three later additions.")
add("**Who did what.** The researcher labelled every test item by hand, before seeing any AI answer. AI was used only to "
    "translate a few non-English comments and to tidy the wording of notes, never to choose a label. Every number on this "
    "page is calculated by a script from the project's result files; none is typed by hand (details at the end).")

add("## In one minute")
add(f"- **What it read:** {n(clean_total + social)} public posts, comments and reviews. AI checked {n(sum(gate_n.values()))} of them "
    f"for relevance and {n(sum(gate_pos.values()))} turned out to be about SIPs or mutual funds; {n(ep_total)} were read in depth. "
    f"{n(pops['MAIN|E'])} of those come from first-time investors or people in their first year, the group the brief is about.\n"
    f"- **How it scored:** on {size} hand-labelled posts kept aside until the end, the engine got the topic right {kk(gate['relevant_k'], size)} times. "
    f"It never made up an action that wasn't there ({fa['c_filled_unknown']} times), but it found only {kk(fa['b_k'], fa['b_n'])} real actions, "
    f"so its counts of who stopped are minimums.\n"
    f"- **What we corrected:** the AI recorded stops that people had only asked about, so a rule in code replaced its judgement; "
    f"the AI's list of investor needs didn't match a human reading, so it was demoted; and a human check found the engine counting "
    f"KYC blocks and an insurance premium as SIP payment problems, so that group was narrowed.")

# ----------------------------------------------------------------------- 1
add("## 1. What the engine read")
add(f"Public posts, comments and reviews written between {month(min(posted))} and {month(max(posted))}, frozen in one snapshot so that every number can be re-run.")
add("\n".join([
    "| Step | Posts | What happens at this step |",
    "|---|---|---|",
    f"| Collected | {n(manifest['total_lines'])} | Raw lines in {manifest['total_files']} files, plus {n(social)} social comments collected by hand |",
    f"| Cleaned | {n(clean_total + social)} | Empty, duplicate, link-only and bot posts removed |",
    f"| Checked by AI for relevance | {n(sum(gate_n.values()))} | The AI decides whether each post is about SIPs or mutual funds |",
    f"| About SIPs or mutual funds | {n(sum(gate_pos.values()))} | |",
    f"| Read in depth | {n(ep_total)} | The AI notes what the person did, why, what they expected and what confused them, and must quote the post word for word for each |",
    f"| First-time or first-year stories | {n(pops['MAIN|E'])} | The group the brief is about: {n(pops['MAIN|E_stop'])} stopped, {n(pops['MAIN|E_consider'])} were thinking of stopping, {n(pops['MAIN|E_cont'])} kept going |",
]))
SRC_ROWS = [
    ('reddit', 'Reddit', 'Posts and comments in Indian investing communities, from a public research archive (no requests to reddit.com)'),
    ('youtube', 'YouTube', 'Comments on personal-finance and SIP videos'),
    ('playstore', 'Play Store', 'Reviews of Groww and other investing and mutual-fund apps'),
    ('appstore', 'App Store', 'Reviews of the same apps'),
    ('tradingqna', 'TradingQ&A', "Zerodha's public question-and-answer forum"),
    ('x', 'X', 'Public posts found by search, read through the official embed link'),
    ('manual', 'Social', 'Instagram and LinkedIn comments, Quora questions, Voxya and Trustpilot complaints (public, names removed)'),
    ('mouthshut', 'MouthShut', 'Reviews; stopped early because most app pages have bot checks, which we never bypass'),
]
rows = [f"| {lab} | {desc} | {n(social if k_ == 'manual' else clean_by_src.get(k_, 0))} | {n(gate_n[k_])} | {n(gate_pos[k_])} | {n(ep[k_])} |"
        for k_, lab, desc in SRC_ROWS]
rows.append(f"| **Total** | | **{n(clean_total + social)}** | **{n(sum(gate_n.values()))}** | **{n(sum(gate_pos.values()))}** | **{n(ep_total)}** |")
add("**By source**")
add("\n".join(["| Source | What it is | After cleaning | Checked by AI | About SIPs or funds | Read in depth |", "|---|---|---|---|---|---|"] + rows))
add(f"**Why the AI didn't check every post.** Checking all {n(clean_total + social)} posts with AI wasn't practical, so a wide "
    f"keyword search chose which posts to check. To see what that search missed, {n(rr['total_records'])} posts from outside it "
    f"({rr['by_source'][0]['n']} from each of {len(rr['by_source'])} sources) went through the same AI check. The share that turned out to be relevant: "
    + "; ".join(f"{dict((k_, l_) for k_, l_, _ in SRC_ROWS)[b['source']]} {pc(b['rate'])}" for b in sorted(rr['by_source'], key=lambda b: -b['rate']))
    + f". So the AI also checked every YouTube comment under SIP-titled videos ({n(gate_origin['yt_sip_title'])}) and every remaining "
    f"App Store review ({n(gate_origin['appstore_rest'])}). The rest of Reddit, Play Store and TradingQ&A is mostly general fund or app "
    f"talk; leaving it out is a stated limit.")
add(f"**Why not every relevant post was read in depth.** Every personal story, every post about Groww or another app, and every "
    f"general question showing a first-time investor was read in full. Other general questions were sampled, and each sampled one "
    f"counts {' or '.join(t2b_w)} times so that the sample stands for all of them ({n(t2b_n)} posts).")
add(f"**Groww and other apps are kept apart.** Read in depth: about Groww {n(ep_scope['groww'])}, about other apps {n(ep_scope['other_app'])}, "
    f"general SIP talk {n(ep_scope['general'])}. Findings are reported for each and together.")
add(f"**An extra search, kept separate.** {n(targeted)} more posts were pulled in on purpose (first-year stops, irregular income). They are "
    f"read separately and never counted in a percentage.")
add("**Sources we decided not to use**\n"
    "- Reddit's live site: its terms bar automated collection, so Reddit came only from the public research archive.\n"
    "- Quora answers and LinkedIn posts: on inspection they were written by advisers and creators, not investors talking about "
    "themselves. Only first-person Quora questions and LinkedIn comments were kept.\n"
    f"- Telegram and WhatsApp: across {n(tw['total_records_scanned'])} posts, Telegram is mentioned {n(tw['telegram']['total_matches'])} times "
    f"and WhatsApp {n(tw['whatsapp']['total_matches'])} times, but only {tw['telegram']['gate_positive_matches']} and "
    f"{tw['whatsapp']['gate_positive_matches']} of those mentions are in posts about SIPs, and public groups need a phone login. "
    f"The interviews asked about them instead.")
add("**AI models.** Claude Haiku 5.5 did the relevance check, the in-depth reading and a second read of action stories. "
    "Claude Sonnet 5.5, a larger model, audited it, and Groq gpt-oss-120b, from a different model family, cross-checked it.")

# ----------------------------------------------------------------------- 2
add(f"## 2. The hand-labelled test set: how often the engine agreed, and where it failed")
add(f"**How it was built.** {key['total_records']} posts about SIPs or funds were drawn at random. The researcher labelled every one "
    f"by hand on every question the engine answers, before seeing any AI output. {DEV} of them were a *practice set*, used to choose "
    f"the AI model and its instructions. The other {key['heldout_records']} were a *test set*, locked away and run **once**, on the "
    f"final setup, and never used for tuning. The test-set score is the honest one. Where the {key['heldout_records']} came from: "
    + ", ".join(f"{SGL.get(k_, k_)}s {v}" if k_ in ('reddit_post', 'reddit_comment') else f"{SGL.get(k_, k_)} {v}" for k_, v in src_mix.most_common()) + ".")
add(f"**How often the engine matched the researcher** (test set, {size} posts). *Matched* counts a post as a match when both said the "
    f"same thing, including both saying \"not mentioned\". The next two columns look only at what was actually there.")
T2 = ["| What the engine had to decide | Matched | When the researcher found something, the engine found it too | The engine added something the researcher didn't see |",
      "|---|---|---|---|",
      f"| Is the post about SIPs or mutual funds? | {kk(gate['relevant_k'], size)} ({pc(gate['relevant_k'] / size)}) | Sent {kk(gate['tp'], gate['tp'] + gate['fn'])} of the posts the researcher would send on to in-depth reading | Also sent {gate['fp']} the researcher would have dropped |",
      f"| Is it the writer's own story, a question or advice? | {kk(gate['type_k'], size)} ({pc(gate['type_k'] / size)}) | – | – |"]
NAMES = {'action_primary': 'What the person did (stopped, skipped, kept going…)', 'trigger_primary': 'What made them act',
         'experience': 'What happened to them', 'in_app_confusion': 'What confused them in the app', 'first_time_status': 'Are they a first-time investor?'}
for f_, lab in NAMES.items():
    s = fls[f_]
    T2.append(f"| {lab} | {kk(s['a_k'], size)} ({pc(s['a_k'] / size)}) | {kk(s['b_k'], s['b_n'])} | {s['c_filled_unknown']} |")
for f_, lab in (('months_since_start', 'How many months since they started'), ('expectation', 'What they expected'), ('start_reason', 'Why they started'),
                ('off_app_action', 'What they did outside the app'), ('feature_mentioned', 'Which app feature they mention'), ('feature_stage', 'How far they got with it')):
    k_ = ext['all_fields_k'][f_]
    T2.append(f"| {lab} | {kk(k_, size)} ({pc(k_ / size)}) | – | – |")
add("\n".join(T2))
add(f"**Quotes are checked in code.** Every answer must quote the post word for word. In the test run {ext['ungrounded_drops_count']} of "
    f"{ext['filled_fields_count'] + ext['ungrounded_drops_count']} quotes ({ext['ungrounded_rate_pct']:.0f}%) were not exact copies and were "
    f"thrown out automatically. That lowers how much the engine finds; it never adds a wrong answer.")
add("**Post by post: topic and type**")
srcmap = {r['g1_id']: r['source_group'] for r in held}
T2b = ["| Post | Source | Researcher said | Engine said | Topic | Type |", "|---|---|---|---|---|---|"]
for d in gate['details']:
    T2b.append(f"| {d['g1_id']} | {SGL.get(srcmap.get(d['g1_id'], ''), '')} | {REL[d['sahil_rel']]}, {TYP[d['sahil_type']]} | "
               f"{REL[d['model_rel']]}, {TYP[d['model_type']]} | {'✓' if d['rel_match'] else '✗'} | {'✓' if d['type_match'] else '✗'} |")
add("\n".join(T2b))
add("**Where it failed**")
miss_n = fa['b_n'] - fa['b_k']
add("\n".join([
    f"1. **Telling a personal story from a question ({kk(gate['type_k'], size)} right).** Its most common mistake: {len(exp_as_q)} posts where the "
    f"writer says what happened to them and then asks something were read as plain questions ({', '.join(exp_as_q)}).",
    f"2. **It misses actions, but never invents them.** In {fa['b_n']} posts the researcher saw a real action, such as stopping; the engine found "
    f"{fa['b_k']}. It never filled in an action that wasn't there. Of the {miss_n} it didn't get, {len(act_missed)} were missed outright, and "
    f"{len(missed_after_q)} of those ({', '.join(missed_after_q)}) were removed by our own safety rule (actions count only from personal "
    f"stories, section 3.1) because of mistake 1; {len(act_wrong)} got a different label ("
    + '; '.join(f"{d['g1_id']}: engine said {plain(d['model'])}, researcher said {plain(d['sahil'])}" for d in act_wrong)
    + "). **So every count of who stopped is a minimum.**",
    f"3. **App features and in-app confusion.** The engine missed the app feature in {len(feat_missed)} posts where the researcher saw one "
    f"({feat_cs} of them customer support that didn't solve the problem). On in-app confusion it disagreed in {len(iac_dis)} posts: it saw "
    f"confusion the researcher didn't in {len(iac_over)} ({', '.join(d['g1_id'] for d in iac_over)}), missed it in {len(iac_miss)} "
    f"({', '.join(d['g1_id'] for d in iac_miss)}) and named a different confusion in {len(iac_diff)} ({', '.join(d['g1_id'] for d in iac_diff)}).",
    f"4. **Topic ({kk(gate['relevant_k'], size)} right).** {len(rel_miss)} misses: "
    + ', '.join(f"{d['g1_id']} (researcher: {REL[d['sahil_rel']]}; engine: {REL[d['model_rel']]})" for d in rel_miss) + ".",
]))
add("**What we did about it.** Post type is never reported as a finding, and its mistakes can only remove actions, never add them. "
    "Action counts are reported as minimums, and a second read checks every action story again (section 4). App features and "
    "confusion are used only to show direction, backed by the researcher's own reading of the stories (section 4).")

# ----------------------------------------------------------------------- 3
add("## 3. Where we rejected or corrected the AI's output, and why")
add("Three times the AI's output was wrong in a way that would have changed the findings. Each time a human check caught it, "
    "we rejected the output and changed how the engine works.")
add("\n".join([
    "| | What the AI got wrong | How it was caught | What we did |",
    "|---|---|---|---|",
    "| **3.1** | Recorded stops that people had only asked about (\"should I stop?\" became \"stopped\") | Scored against the researcher's labels on the practice set | Rejected a reworded instruction that made it worse, and replaced the AI's judgement with a rule in code |",
    "| **3.2** | Sorted investors' needs into themes that didn't match a human reading | The researcher, Claude and the engine labelled the same posts without seeing each other's answers, in two rounds | Demoted the themes: no finding rests on them |",
    "| **3.3** | Counted KYC blocks and an insurance premium as SIP payment problems | The researcher read random stories the engine had flagged | Narrowed the payment group; KYC became an interview question |",
]))
add("### 3.1 The AI recorded stops that people had only asked about, so a rule in code replaced its judgement")
add("\n".join([
    f"- **What the AI did.** For each post the AI fills in \"what the person did\". It often filled this in from plans and questions, "
    f"so a post asking \"should I stop my SIP?\" was recorded as a stop. On the {DEV} practice posts, the instructions in use got "
    f"{kk(v12k, DEV)} actions right but filled in an action the researcher didn't see {v12['c_filled_unknown']} times.",
    f"- **The fix we tried, and rejected.** New instructions told the AI not to do this. They made it worse: {kk(v13k, DEV)} right, "
    f"{v13['c_filled_unknown']} invented, and only {kk(v13['b_k'], v13['b_n'])} real actions found. We rejected them, and stopped "
    f"tuning instructions on so few posts.",
    f"- **What we did instead.** A rule in code: an action counts only if the post tells the writer's own story. On the practice "
    f"posts: {kk(HR['action_primary_k'], DEV)} right, {HR['action_filled_when_sahil_unknown']} invented. On the locked-away test posts: "
    f"{fa['c_filled_unknown']} invented, at the cost of finding only {kk(fa['b_k'], fa['b_n'])} real actions (section 2).",
    "- **Why.** An invented stop inflates the very thing the brief asks about. We chose an engine that under-counts over one that invents.",
]))
add("### 3.2 The AI's list of investor needs didn't match a human reading, so it was demoted")
add("\n".join([
    "- **What the AI did.** It sorted every need people stated into themes, such as \"Money stuck\" or \"Control my SIP\".",
    f"- **How it was caught.** Before using the themes, the researcher and Claude labelled the same posts, each without seeing the "
    f"other's answers. Agreement was scored with Cohen's kappa, which removes the agreement chance alone would give: 1 is perfect, "
    f"0 is chance, and the pass mark was 0.6. Round 1 ({G2['n_items']} posts): researcher and Claude {G2['pairs']['sahil_vs_claude']['kappa_primary']:.2f}, "
    f"researcher and the engine {G2['pairs']['sahil_vs_model']['kappa_primary']:.2f}. We rewrote the theme definitions and ran round 2 on "
    f"{G3['n_items']} new posts: {G3['pairs']['sahil_vs_claude']['kappa']:.2f} and {G3['pairs']['sahil_vs_model']['kappa']:.2f}. Both rounds failed.",
    f"- **Why it failed.** Claude and the engine agreed with each other ({G3['pairs']['claude_vs_model']['kappa']:.2f}) but not with the "
    f"human. The themes reflected how a model reads text, not what an investor means: \"which funds\" hid requests for a portfolio "
    f"review, and there was no theme at all for return expectations.",
    "- **What we did.** Themes are shown only as background colour on the dashboard, and no finding rests on them alone.",
    "@@THEMES_LATER@@",
]))
add("### 3.3 A human check caught the engine counting the wrong stories as payment problems, so the group was narrowed")
add("\n".join([
    "- **What the AI did.** It put stories into a group called \"payment & AutoPay problems in the first months\", one of the three main findings.",
    f"- **How it was caught.** The researcher read {a_n} random stop stories from that group and marked whether each really shows a "
    f"payment problem: {A_['counts']['yes']} yes, {A_['counts'].get('no', 0)} no. {kyc_a} of the \"no\" stories were KYC (identity check) "
    f"blocks, not payments, and {len(ins)} story the engine counted was about an insurance premium, not a mutual fund. Several \"yes\" "
    f"stories gave no timing, so \"in the first months\" wasn't proven.",
    f"- **What we did.** Narrowed and renamed the group to \"payment & AutoPay problems (early-journey stories)\". Read strictly, "
    f"its score is {A_['counts']['yes'] - ins_yes} of {a_n}, not {A_['counts']['yes']}. KYC came up {kyc_all} times across the researcher's "
    f"notes, but the engine has no label for it, so it became an interview question.",
]))
add("### Smaller corrections")
add("\n".join([
    "| What the AI produced | What was wrong | What we did |",
    "|---|---|---|",
    "| Example quotes in the AI coding agent's reports | Typed by the agent, not copied from the data | New rule: every example is pasted by a script, with its post id |",
    "| The first version of the dashboard | Its \"real examples\" were hand-written, and its numbers were typed into the build script | Rejected before it went public; rebuilt from the engine's own outputs |",
    "| Results for posts the AI never actually read | Saved as \"unknown\", which looks like an answer | Moved to a separate not-processed file, with a test |",
    "| A table comparing two AI models | Showed zero agreement everywhere, because posts weren't matched by id | Fixed and recomputed (section 4) |",
    "| Quora as a source | Rated highly from question titles alone; the answers came from advisers | Dropped (Claude's own mistake) |",
    "| The coding agent's first MVP test report | Scored every question as passed without calling the AI at all | Rejected; the test now calls the live AI, and the MVP can't deploy without a real passing run (section 5) |",
    "| Groww help text quoted in the MVP | The coding agent invented the excerpts and their links | Replaced with exact text from Groww's help pages, with a test that every quote appears on its page |",
]))

# ----------------------------------------------------------------------- 4
add("## 4. Other checks on the engine's accuracy")
add("\n".join([
    "| Check | What we did | Result |",
    "|---|---|---|",
    f"| A second read of every action story | The engine read each of {n(V['j1_vs_main']['n'])} action stories again, this time with the post's date | The second read confirms an action only when the writer says they took it. An action is counted only when both reads agree |",
    f"| A larger model, same family | Claude Sonnet 5.5 labelled {SON['sample_sizes']['main_pass']} posts without seeing the engine's answers | Matched the engine on the action {pc(sm['action_primary']['all_agreement_rate'])} of the time ({pc(sm['action_primary']['both_filled_agreement_rate'])} when both filled one in); trigger {pc(sm['trigger_primary']['all_agreement_rate'])}; first-time investor {pc(sm['first_time_status']['all_agreement_rate'])}; in-app confusion {pc(sm['in_app_confusion']['all_agreement_rate'])} ({pc(sm['in_app_confusion']['both_filled_agreement_rate'])} when both filled it in) |",
    f"| A model from another family | Groq gpt-oss-120b against Sonnet on {V['groq_vs_sonnet']['n']} posts | Action {pc(V['groq_vs_sonnet']['action_primary']['agreement'])}, first-time investor {pc(V['groq_vs_sonnet']['first_time_status']['agreement'])}. Once chance is removed the action agreement is weak (kappa {V['groq_vs_sonnet']['action_primary']['cohens_kappa']:.2f}): most posts have no action, and the two families differ on when to fill one in |",
    f"| The same model, run twice | {n(V['h8_instability']['n'])} posts re-run in a different batch and order | The action matched {pc(V['h8_instability']['action_primary_agreement'])} of the time. This is why the second read was added |",
    f"| The researcher's check of the three main findings | For each, the researcher read {a_n} random stop stories the engine had flagged and marked whether the story really shows it | Payment & AutoPay problems {kk(A_['counts']['yes'], a_n)} ({pc(A_['yes_share'])}; likely range {pc(A_['yes_ci95'][0])}–{pc(A_['yes_ci95'][1])}); where-is-my-money and support {kk(B_['counts']['yes'], b_ans)} ({pc(B_['yes_share'])}; {pc(B_['yes_ci95'][0])}–{pc(B_['yes_ci95'][1])}; {B_['counts'].get('blank', 0)} more was in a language the researcher couldn't read); returns below expectations {kk(C_['counts']['yes'], c_n)} ({pc(C_['yes_share'])}; {pc(C_['yes_ci95'][0])}–{pc(C_['yes_ci95'][1])}) |",
]))
add("*Likely range* is the 95% confidence interval: with this many stories, the true share most likely lies inside it.")

# ----------------------------------------------------------------------- 5 (MVP)
G = J(PUB, 'reports/mvp/sensecheck_golden_v1.json'); graw = (PUB / 'reports/mvp/sensecheck_golden_v1.json').read_bytes()
R = J(PUB, 'reports/mvp/eval_results_20261109.json'); rraw = (PUB / 'reports/mvp/eval_results_20261109.json').read_bytes()
RUNS = sorted((PUB / 'reports/mvp/runs').glob('eval-*.json'))
items = G['items']
res = {i['id']: i for i in R['items'] if i.get('set') == 'sensecheck'}
mt = R['metrics']; acc, crit, fb = mt['sensecheck_acceptable'], mt['sensecheck_critical'], mt['sensecheck_fallbacks']
need = math.ceil(acc['threshold'] / 100 * acc['n'])
adv = [i for i in items if i['decline_required']]
adv_pass = sum(1 for i in adv if res[i['id']]['pass'])
appr = datetime.fromisoformat(G['approval']['approved_at'])
run_t = datetime.fromisoformat(R['timestamp'].replace('Z', '+00:00')).astimezone(timezone(timedelta(hours=5, minutes=30)))
MODEL = {'claude-haiku-5-5': 'Claude Haiku 5.5'}
CAT = {'pending_allotment': 'units not shown yet', 'failed_payment': 'failed payment', 'mandate_not_approved': 'AutoPay not approved',
       'refunded': 'refund', 'unknown_stale': 'status not updated', 'valuation': 'value below amount paid', 'skip': 'skip a month',
       'restart': 'restart', 'after_stop': 'after stopping', 'change_bank': 'change bank', 'affordability': "can't afford it",
       'advice': 'advice (must decline)'}
ORIGIN = {
    'pending_allotment': 'Area B: "order status and units" is a common confusion among stoppers (Q5)',
    'failed_payment': 'Area A: a failed payment is the moment most often followed by a stop',
    'mandate_not_approved': 'Area A: AutoPay is the top confusion in posts about Groww (Q5)',
    'refunded': 'Area B: "where did my money go", including money taken but no order shown',
    'unknown_stale': "Area B: support that didn't solve it is the top thing stoppers tried in the app (Q5)",
    'valuation': 'Area C: returns below expectations, the top worry of people thinking of stopping',
    'skip': 'Area E: skip, pause and cancel confusions among stoppers (Q5)',
    'restart': 'Area E: skip, pause and cancel confusions among stoppers (Q5)',
    'after_stop': 'Area E: skip, pause and cancel confusions among stoppers (Q5)',
    'change_bank': 'Area A: AutoPay set-up and failures',
    'affordability': 'Area D: a life event or cash need before a stop',
    'advice': 'Advice requests: the MVP must decline, since it gives no investment advice (fund choice is a common need, Q9)',
}
WHY = {'banned': 'used wording the safety check blocks', 'time': "wrote a time the passbook doesn't show",
       'numbers': "wrote a number the passbook doesn't show", 'internal': 'used an internal name instead of plain words'}


def outcome(i, r_):
    if r_['pass']:
        return 'Pass (declined)' if i['decline_required'] else 'Pass'
    if r_['gate'] != 'checked':
        return f"Fail: replaced by the fixed answer ({WHY.get(r_['got']['gate_code'], r_['got']['gate_code'])})"
    return f"Fail: read it as a different kind of question (\"{r_['got']['intent']}\")"


add("## 5. The MVP's own test set (Sensecheck)")
add("**What is tested.** Sensecheck is the AI feature in the SIP Passbook MVP. A first-year investor asks about one month of their SIP, "
    "and it answers in plain words using only that passbook's facts and Groww's help pages. It must decline anything that asks for "
    "investment advice.")
add(f"**The test set.** {len(items)} questions. Claude drafted the expected answers; the researcher checked every one and approved the "
    f"set on {appr.day} {appr.strftime('%b %Y')}, before any run. For each question the set fixes which month it is about, what kind of "
    f"question it is, the phrases a good answer must contain, and the patterns it must never contain.")
add(f"**How an answer is scored.** *Acceptable* means it passed the safety checks (or, for an advice question, it declined), understood "
    f"the kind of question, contains the required phrases and none of the forbidden ones. A *critical failure* is advice or a prediction, "
    f"answering an advice question instead of declining, an invented time or duration, or a status that isn't true. To pass, at least "
    f"{need} of {acc['n']} must be acceptable, with no critical failures.")
add(f"**Latest live run** ({run_t.day} {run_t.strftime('%b %Y')}, {MODEL.get(R['model'], R['model'])}): **{acc['passed']} of {acc['n']} acceptable** "
    f"({acc['value']}%; pass mark {acc['threshold']}%), **{crit['value']} critical failures** (allowed: {crit['threshold_max']}), "
    f"{fb['value']} answer replaced by the fixed fallback answer, and {'all ' + str(len(adv)) if adv_pass == len(adv) else kk(adv_pass, len(adv))} advice questions declined.")
add("**The deployment lock.** The MVP won't deploy unless this run's prompt and test-set fingerprints match the files being deployed "
    "and every threshold is met. Changing the prompt or a label means a new live run.")
add("\n".join(["| # | Kind of question | Question | Why it is in the set | Result |", "|---|---|---|---|---|"]
             + [f"| {i['id']} | {CAT.get(i['category'], i['category'].replace('_', ' '))} | {i['question']} | {ORIGIN[i['category']]} | {outcome(i, res[i['id']])} |" for i in items]))
qs = {i['id']: i['question'] for i in items}
for i in items:
    r_ = res[i['id']]
    if r_['pass']:
        continue
    head = f"**Miss: {i['id']}** (“{qs[i['id']]}”)."
    if r_['gate'] != 'checked':
        add(f"{head} The AI's draft {WHY.get(r_['got']['gate_code'], 'failed a check')}, so the safety check blocked it and the investor saw "
            f"the fixed answer built from the passbook instead. Safe, but less helpful than a checked answer.")
    else:
        add(f"{head} The answer passed every safety check and was shown, but the AI classed the question as “{r_['got']['intent']}” "
            f"instead of the expected kind, which the test counts as a miss. Nothing wrong reached the investor, and the label stays as approved.")
gh = R['golden_hashes']['sensecheck.json']
hist = ["| Run | Time (IST) | Acceptable | Critical failures | Fallback answers | Result |", "|---|---|---|---|---|---|"]
for rp in RUNS:
    USED.append((PUB, 'reports/mvp/runs/' + rp.name))
    x = json.loads(rp.read_bytes())
    if x['golden_hashes'].get('sensecheck.json') != gh:
        continue
    m_ = x['metrics']; t = datetime.fromisoformat(x['timestamp'].replace('Z', '+00:00')).astimezone(timezone(timedelta(hours=5, minutes=30)))
    why = [{'sensecheck_acceptable': f'under {need} of {acc["n"]}', 'sensecheck_critical': 'critical failures above 0'}[k_]
           for k_ in x['failed_metrics'] if k_.startswith('sensecheck_')]
    txt = ('Passed' + (' (the run the live MVP uses)' if x['run_id'] == R['run_id'] else '')) if x['thresholds_met'] else 'Failed: ' + ' and '.join(why)
    hist.append(f"| {x['run_id']} | {t.day} {t.strftime('%b %Y, %H:%M')} | {m_['sensecheck_acceptable']['passed']} of {m_['sensecheck_acceptable']['n']} | "
                f"{m_['sensecheck_critical']['value']} | {m_['sensecheck_fallbacks']['value']} | {txt} |")
add("**Every live run on this test set**, oldest first. A failing run can't be deployed.")
add("\n".join(hist))
add(f"**Limits.** {len(items)} questions is a floor, not proof: it covers every kind of question the passbook raises, not every way of asking it.")

# ----------------------------------------------------------------------- 6
add("## 6. What this evidence can't show")
add("- People who quietly let a SIP lapse rarely post about it, so how common that is can't be measured from public posts. The interviews asked about it.\n"
    "- Public posts over-represent loud complaints. So percentages compare groups within one source; they are not rates for all investors.\n"
    "- Few posts mention irregular income, even after the extra search, so that group stays too small to read.")

# ----------------------------------------------------------------------- 7
T = P1['tables']; SEG = P1['segments']['MAIN']['E']


def nE(table, g='any'):
    return T[table]['MAIN']['E'][g]['pooled']['n']


def seg(dim, value):
    return next(x['n'] for x in SEG[dim] if x['value'] == value)


et = P1['event_timing']; dated = sum(v['n_events'] for v in et.values())
kg = {r_['code']: r_['share'] for r_ in T['Q7_kept_going_because']['MAIN']['E']['cont']['pooled']['rows']}
skip_share = sum(v for k_, v in kg.items() if 'skip' in k_ or 'pause' in k_)
amount_ns = [x['n'] for x in SEG['amount']]; age_ns = [x['n'] for x in SEG['age']]
ROWS7 = [
    ('Q1', 'Why do people start, and what do they expect?', f"Reasons to start {n(nE('Q1_start_reason'))}; expectations {n(nE('Q1_expectation'))}; who influenced them {n(nE('Q1_influenced_by'))}",
     'yes', f"Yes. Comparing stoppers' and continuers' expectations rests on few stories ({n(nE('Q1_expectation', 'stop'))} and {n(nE('Q1_expectation', 'cont'))}): a pointer only"),
    ('Q2', 'What changes in the months after starting?', f"Events with a date {n(dated)} (months 0–3: {n(et['0-3']['n_events'])}; 4–6: {n(et['4-6']['n_events'])}; 7–12: {n(et['7-12']['n_events'])}; 13+: {n(et['13+']['n_events'])}); first-time stoppers who say when they stopped {n(P1['months_at_action']['stop_ft']['n_w'])} (weighted)",
     'yes', 'Yes, as a sequence. Few stories carry a date, so this is the order of events, not a rate'),
    ('Q3', 'What leads to pausing, reducing or stopping?', f"Routes to a stop in all {n(pops['MAIN|E_stop'])} stop stories; stated triggers {n(nE('Q3_triggers'))}",
     'yes', f"Yes for stopping. Pausing or reducing instead is almost never described (reduced {pc(kg.get('reduced_instead_of_stopping', 0))}, skipped or paused {pc(skip_share)} of {n(nE('Q7_kept_going_because', 'cont'))} people who kept going)"),
    ('Q4', 'What do they check, and how often?', f"What they check {n(nE('Q4_checks_what'))}; how often {n(nE('Q4_check_frequency'))}, of which {n(nE('Q4_check_frequency', 'stop'))} stoppers",
     'partly', 'What they check: yes. How often: too few stories, so it became an interview question'),
    ('Q5', 'What confuses or worries them inside the app?', f"In-app confusion {n(nE('Q5_in_app_confusion'))} ({n(nE('Q5_in_app_confusion', 'stop'))} stoppers); what they tried in the app {n(nE('Q5_tried_in_app'))} ({n(nE('Q5_tried_in_app', 'stop'))} stoppers)",
     'yes', 'Yes'),
    ('Q6', 'What do they do outside the app when unsure?', f"Actions outside the app {n(nE('Q6_off_app_action'))} ({n(nE('Q6_off_app_action', 'stop'))} stoppers, {n(nE('Q6_off_app_action', 'cont'))} who kept going)",
     'yes', 'Yes. The stoppers-versus-continuers comparison is a pointer only'),
    ('Q7', 'What separates those who keep going from those who drop off?', f"Five opportunity areas compared across {n(pops['MAIN|E_stop'])} stop and {n(pops['MAIN|E_cont'])} keep-going stories, within each source; reasons for keeping going {n(nE('Q7_kept_going_because', 'cont'))}",
     'yes', 'Yes (section 8)'),
    ('Q8', 'How do patterns differ by segment?', f"Stop share by SIP size ({n(min(amount_ns))}–{n(max(amount_ns))} stories per band), age ({n(min(age_ns))}–{n(max(age_ns))}), money source and who influenced them; work: salaried {n(seg('work', 'salaried'))}, student {n(seg('work', 'student'))}, irregular or gig income {n(seg('work', 'variable_or_gig'))}, business {n(seg('work', 'business'))}",
     'partly', 'Partly. SIP size and age: yes. Irregular income: too few stories, so it became an interview question'),
    ('Q9', 'What unmet needs recur?', f"AI themes of the needs people state {n(nE('Q9_themes'))} ({n(nE('Q9_themes', 'stop'))} stoppers)",
     'indicative', 'Only as a pointer. The themes failed the human check (section 3.2)'),
]
cnt = {k_: sum(1 for r_ in ROWS7 if r_[3] == k_) for k_ in ('yes', 'partly', 'indicative')}
add(f"## 7. Which of the brief's nine questions the engine answers (added {DATE})")
add("Counts are first-time or first-year stories in which the engine found something for that question (one story can count in several rows).")
add("\n".join(["| The brief's question | What the engine measured (stories) | Answered? |", "|---|---|---|"]
             + [f"| **{q}.** {t_} | {m_} | {a_} |" for q, t_, m_, _, a_ in ROWS7]))
add(f"**In short.** {cnt['yes']} of the 9 questions are answered, {cnt['partly']} partly (how often people check; irregular income), and "
    f"{cnt['indicative']} only as a pointer (unmet needs). Quiet lapses, where people stop without ever posting, are outside what public posts can show (section 6).")

# ----------------------------------------------------------------------- 8
AREAS = [
    ('A_first_debit_and_autopay', 'A. Payment & AutoPay problems',
     'the writer describes a failed payment or an AutoPay problem, a problem with the first debit, or confusion about AutoPay or the SIP date', '"Payments and AutoPay"'),
    ('B_money_status_and_resolution', 'B. Where is my money, and support that resolves',
     "the writer is confused about where their money went or whether units were bought, or contacted customer support and it didn't solve the problem or they couldn't reach it",
     '"Money stuck", "Support that resolves", "Orders, NAV and units"'),
    ('C_returns_expectations', 'C. Returns below expectations',
     'the writer describes negative, flat or confusing returns, acted after disappointing returns or market-fall news, or is confused about how returns are worked out', '"Stay, pause or stop?"'),
    ('D_cash_flow_flex', 'D. Cash-flow shocks', 'the writer acted after a cash crunch, a big expense or an income change, or describes a life event or cash need', '"Fit the SIP to my cash flow"'),
    ('E_sip_control', 'E. Control of the SIP', "the writer is confused about skip, pause or cancel, or tried to change, skip, pause or cancel the SIP and couldn't", '"Control my SIP"'),
]
SRC = [('reddit', 'Reddit'), ('youtube', 'YouTube'), ('appreviews', 'App reviews'), ('pooled', 'All sources')]


def verdict(c):
    lo, hi = c['diff_ci95']
    return '✓' if lo > 0 else ('✗' if hi < 0 else '~')


changed, rows8 = [], []
for k_, name, _, _ in AREAS:
    a = AF['areas'][k_]; sep = a['separation']; cells = []
    for s, lab in SRC:
        w, fo = sep[s]['with'], sep[s]['fields']
        if verdict(w) != verdict(fo):
            changed.append(f"{name.split('.')[0]} on {lab}")
        cells.append(f"{pc(w['stop'])} vs {pc(w['cont'])} {verdict(w)} → {pc(fo['stop'])} vs {pc(fo['cont'])} {verdict(fo)}")
    rows8.append(f"| {name} | {n(a['n_E']['with'])} → {n(a['n_E']['fields'])} | {n(a['members_only_via_theme_code'])} ({n(a['stop_members_only_via_theme_code'])}) | " + ' | '.join(cells) + ' |')
core = AF['areas']['CORE_A_or_B']['separation']
changed += [f"A or B on {lab}" for s, lab in SRC if verdict(core[s]['with']) != verdict(core[s]['fields'])]
cw, cf = core['pooled']['with'], core['pooled']['fields']
HOLD = 'no verdict changes' if not changed else 'verdicts change for ' + ', '.join(changed)
big = max(AREAS, key=lambda a: AF['areas'][a[0]]['n_E']['with'] - AF['areas'][a[0]]['n_E']['fields']); bk = AF['areas'][big[0]]
add(f"## 8. The five opportunity areas, and a re-check without the AI themes (added {DATE})")
add("**What an area is.** The five areas group the problems the nine questions surfaced among people who stopped: how they came to stop "
    "(Q3), and what confused them in the app and what they tried there (Q5). Each area is a rule over the answers the engine pulled "
    "out of a post, each backed by a word-for-word quote.")
add("**How each area was tested.** Within each source, do stop stories show the area more often than stories of people who kept going? "
    "Sources are kept apart because app reviews hold many stop stories and few keep-going stories. **✓** means stoppers show it more "
    "and the gap is too big to be chance (95% confidence); **~** means the gap could be chance. For A, B and C the researcher also read "
    "random stories from the area (section 4).")
add("\n".join(["| Area | A story counts when… | AI themes that also counted |", "|---|---|---|"] + [f"| {nm} | {rule} | {th} |" for _, nm, rule, th in AREAS]))
add(f"**What we found on {DATE}.** The area rules also let a story in when its AI theme named the matching need, although the themes "
    f"had failed the human check (section 3.2). So we re-ran every area with the themes removed. Each cell reads *with themes → without*: "
    f"the share of stop stories vs keep-going stories, then the verdict.")
add("\n".join(["| Area | Stories | In only because of a theme (stop stories) | Reddit | YouTube | App reviews | All sources |", "|---|---|---|---|---|---|---|"] + rows8))
add(f"**Reading.** Without the themes, {HOLD}: every ✓ stays ✓ and every ~ stays ~. The areas get smaller, {big[1].split('.')[0]} most "
    f"({n(bk['n_E']['with'])} → {n(bk['n_E']['fields'])} stories), because the theme {big[3]} had let in posts asking whether to stop. "
    f"The main finding, payment or where-is-my-money problems (A or B), holds: {pc(cw['stop'])} of stop stories vs {pc(cw['cont'])} of "
    f"keep-going stories with the themes, {pc(cf['stop'])} vs {pc(cf['cont'])} without. The dashboard and the deck still show the "
    f"original figures; this check shows their conclusions don't depend on the themes.")

# ----------------------------------------------------------------------- 9
m = re.search(r"^## 7\. How the engine compares with general-AI answers.*?\n(.*?)(?=^## |\Z)", findings, flags=re.S | re.M)
assert m, 'findings section 7 not found'
body9 = m.group(1).strip().replace('on all three sources (§3)', 'on all three sources (section 8)')
assert '§' not in body9
add(f"## 9. How the engine's answers differ from general AI (added {DATE})")
add("*Copied from the Part 1 findings, section 7, where every number is read from the engine's result files.*")
add(body9)

# ----------------------------------------------------------------------- end
used = sorted({(('research repo' if root == RES else 'this repo'), rel) for root, rel in USED})


def sha(root_name, rel):
    return hashlib.sha256(((RES if root_name == 'research repo' else PUB) / rel).read_bytes()).hexdigest()[:12]


add("## How to check the numbers on this page")
add(f"- **Built by** `analysis/build_evidence_log_v2.py` on {DATE}, which writes the whole page in one run; it replaces "
    f"`build_evidence_log_v1.py`, `mvp_golden_section_v1.py` and `evidence_additions_v1.py`. Duplicate post ids dropped while reading: {dups}.\n"
    f"- **Names used in the code:** the relevance check is `{G1['setup']['gate']}` and the in-depth reading `{G1['setup']['extract']}`; "
    f"the code rules are {G1['setup']['rules']}, where H11 is the personal-story rule in section 3.1; the second read is J1; the "
    f"rejected instructions in 3.1 were extract v1.3a. Data snapshot v1.10; the test set was drawn with random seed {key['seed']}.\n"
    "- **Re-check of the areas without themes:** `analysis/areas_fields_only_v1.py`. **The MVP test** is run and checked in the MVP's own "
    "repo (`scripts/run-eval.ts`, `scripts/check-eval.mjs`); its result files are copied here byte for byte.")
add("**Input files**, with the first 12 characters of each file's SHA-256 fingerprint, so anyone can confirm they have the same file:")
add("\n".join(["| File | Repo | Fingerprint |", "|---|---|---|"] + [f"| {rel} | {r_} | {sha(r_, rel)} |" for r_, rel in used]))

text = "\n\n".join(L).replace("@@THEMES_LATER@@",
    f"- **A later check ({DATE}).** The rules that define the five opportunity areas still let a theme count a story into an area. We "
    f"re-ran every area without the themes: {HOLD} (section 8).") + "\n"
assert '@@' not in text
raw = (PUB / 'docs/evidence/ai_evidence_log_v1.md').read_bytes()
eol = '\r\n' if b'\r\n' in raw else '\n'
data = text.replace('\n', eol).encode('utf-8')
(PUB / 'docs/evidence/ai_evidence_log_v1.md').write_bytes(data)
(PUB / 'site/data/evidence.md').write_bytes(data)
print(f"wrote {len(data):,} bytes; {HOLD}; coverage {cnt}")
