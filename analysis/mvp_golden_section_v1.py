"""Writes section 5 of the AI Evidence Log, "The MVP's own golden set (Sensecheck)", from the MVP's committed eval files.
Inputs (copied byte for byte from the MVP repo, sippassbook): reports/mvp/sensecheck_golden_v1.json (= eval/golden/sensecheck.json)
and reports/mvp/eval_results_20261109.json (= eval/results.json, the live run the MVP build gate accepts),
plus reports/mvp/runs/*.json (= eval/runs/, every live run on this golden set, for the run history).
Every number in the section is computed here; the only hand-written text is the method wording and, per category, the
Part 1 finding the questions come from (named, not quoted as a number).
Usage: python -I analysis/mvp_golden_section_v1.py   (rewrites docs/evidence/ai_evidence_log_v1.md and site/data/evidence.md)
"""
import hashlib, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
G_PATH = ROOT / 'reports/mvp/sensecheck_golden_v1.json'
R_PATH = ROOT / 'reports/mvp/eval_results_20261109.json'
RUNS = sorted((ROOT / 'reports/mvp/runs').glob('eval-*.json'))
graw, rraw = G_PATH.read_bytes(), R_PATH.read_bytes()
G, R = json.loads(graw), json.loads(rraw)

# Where each question type comes from in Part 1 (this engine): named findings, so a reader can open them.
ORIGIN = {
    'pending_allotment': 'Area B; Q5 "order status / units" among stoppers’ in-app confusions',
    'failed_payment': 'Area A; "a payment failed" is the moment most often followed by a stop (Opportunity Areas, A or B in detail)',
    'mandate_not_approved': 'Area A; Q5 "AutoPay / mandate" confusions, the top confusion in posts naming Groww',
    'refunded': 'Area B; Q5 "where my money went"; failed payments where money was debited but no order showed',
    'unknown_stale': 'Area B; Q5 "support, not resolved", the top thing stoppers tried in the app',
    'valuation': 'Area C; returns vs expectations, the top theme among people considering stopping',
    'skip': 'Area E; Q5 "skip / pause / cancel" confusions among stoppers',
    'restart': 'Area E; Q5 "skip / pause / cancel" confusions among stoppers',
    'after_stop': 'Area E; Q5 "skip / pause / cancel" confusions among stoppers',
    'change_bank': 'Area A; AutoPay / mandate set-up and failures',
    'affordability': 'Area D; "a life event or cash need" before a stop',
    'advice': 'Q9 "fund choice / review" needs; Sensecheck must decline (no investment advice)',
}
items = G['items']
res = {i['id']: i for i in R['items'] if i.get('set') == 'sensecheck'}
m = R['metrics']
acc, crit, fb = m['sensecheck_acceptable'], m['sensecheck_critical'], m['sensecheck_fallbacks']
adv = [i for i in items if i['decline_required']]
adv_pass = sum(1 for i in adv if res[i['id']]['pass'])
failed = [res[i['id']] for i in items if not res[i['id']]['pass']]
ts = R['timestamp'][:10]
appr = G['approval']

L = []
L.append("## 5. The MVP's own golden set (Sensecheck)")
L.append("**What is tested.** Sensecheck is the AI feature in the SIP Passbook MVP: it answers a first-year investor's question about one of their SIP months in plain words, using only that passbook's facts and Groww's help rules, and it must decline anything that asks for investment advice. Every answer is checked in code before it is shown; if a check fails, the investor sees a fixed answer built from the passbook instead.")
L.append(f"**The golden set.** {len(items)} hand-labelled questions (version {G['version']}). Claude drafted the labels; the researcher checked every item and approved the set on {appr['approved_at'][:10]} before the run. Each item fixes the month it is about, the expected intent, phrases an acceptable answer must contain, the help sources it may cite, and *critical* patterns (for example, saying units were allotted when they were not). {len(adv)} items ask for advice and must be declined.")
L.append(f"**Scoring.** {G['scoring']['acceptable']}")
L.append(f"**Latest live run** ({R['run_id']}, {R['model']}, {ts}): **{acc['passed']}/{acc['n']} acceptable ({acc['value']}%, threshold {acc['threshold']}%)**, **{crit['value']} critical failures** (allowed: {crit['threshold_max']}), {fb['value']} of {fb['n']} answers replaced by the fixed fallback, advice declined {adv_pass}/{len(adv)}.")
L.append("**The gate.** The MVP's build refuses to deploy unless this run's prompt and golden-set hashes match the files being deployed and every threshold is met (`scripts/check-eval.mjs` in the MVP repo). Changing the prompt or a label means a new live run.")
L.append("")
L.append("| Item | Type | Question | Where it comes from in Part 1 | Result |")
L.append("|---|---|---|---|---|")
for i in items:
    r = res[i['id']]
    out = 'Pass' if r['pass'] else f"Fail: {r['why'].split(';')[0]}"
    if i['decline_required'] and r['pass']: out = 'Pass (declined)'
    L.append(f"| {i['id']} | {i['category'].replace('_', ' ')} | {i['question']} | {ORIGIN[i['category']]} | {out} |")
L.append("")
GATE_WHY = {'banned': 'used wording the banned-phrase check blocks', 'time': 'wrote a clock time the passbook does not show',
            'numbers': 'wrote a number the passbook does not show', 'internal': 'used an internal name instead of plain words'}
qs = {i['id']: i['question'] for i in items}
for f in failed:
    head = f"**{'The miss' if len(failed) == 1 else 'Miss'}: {f['id']}** ({f['category'].replace('_', ' ')}, “{qs[f['id']]}”)."
    if f['gate'] != 'checked':
        why = GATE_WHY.get(f['got']['gate_code'], f"failed the {f['got']['gate_code']} check")
        L.append(f"{head} The model's draft {why}, so the check blocked it and the investor saw the fixed answer built from the passbook instead (“{f['got']['answer']}”). Safe, but less helpful than a checked answer.")
    else:
        L.append(f"{head} The answer passed every check in code and was shown, but the model classed the question as “{f['got']['intent']}” instead of the labelled intent, which the golden set counts as a miss. Nothing wrong reached the investor; the label stays as approved.")
L.append("**Run history on this golden set.** Every live run on the same approved labels, oldest first. A failing run cannot be deployed: the build accepts only a passing run whose prompt hash matches the deployed prompt.")
L.append("| Run | Time (IST) | Acceptable | Critical | Fallbacks | Result |")
L.append("|---|---|---|---|---|---|")
from datetime import datetime, timedelta, timezone
IST = timezone(timedelta(hours=5, minutes=30))
gh = R['golden_hashes']['sensecheck.json']
for rp in RUNS:
    rr = json.loads(rp.read_bytes())
    if rr['golden_hashes'].get('sensecheck.json') != gh: continue
    mm = rr['metrics']; t = datetime.fromisoformat(rr['timestamp'].replace('Z', '+00:00')).astimezone(IST)
    why_fail = [{'sensecheck_acceptable': 'under 18/20', 'sensecheck_critical': 'critical errors above 0'}[x] for x in rr['failed_metrics'] if x.startswith('sensecheck_')]
    res_txt = ('Passed' + (' (the run the build accepts)' if rr['run_id'] == R['run_id'] else '')) if rr['thresholds_met'] else 'Failed: ' + ' and '.join(why_fail)
    L.append(f"| {rr['run_id']} | {t.day} {t.strftime('%b %Y, %H:%M')} | {mm['sensecheck_acceptable']['passed']}/{mm['sensecheck_acceptable']['n']} | {mm['sensecheck_critical']['value']} | {mm['sensecheck_fallbacks']['value']} | {res_txt} |")
L.append(f"**Limits.** {len(items)} items is a floor, not proof: it covers each question type the passbook raises once or more, not every phrasing. Files: `reports/mvp/sensecheck_golden_v1.json` (sha256 {hashlib.sha256(graw).hexdigest()[:16]}…), `reports/mvp/eval_results_20261109.json` (sha256 {hashlib.sha256(rraw).hexdigest()[:16]}…), run files in `reports/mvp/runs/`, built by `analysis/mvp_golden_section_v1.py`.")
section = "\n\n".join(x for x in L if x != "") .replace("\n\n| Item", "\n\n| Item")
# keep the table rows together
section = re.sub(r"\n\n(\|)", r"\n\1", section).replace("**The gate.**", "**The gate.**")
section = section.replace("\n| Item", "\n\n| Item", 1)
section = section.replace("\n| Run |", "\n\n| Run |", 1)

doc_path = ROOT / 'docs/evidence/ai_evidence_log_v1.md'
doc = doc_path.read_text(encoding='utf-8')
new = re.sub(r"## 5\. The MVP's own golden set.*?(?=\n## 6\. )", section + "\n", doc, flags=re.S)
assert new != doc, 'section 5 not found'
doc_path.write_text(new, encoding='utf-8')
(ROOT / 'site/data/evidence.md').write_bytes(doc_path.read_bytes())
print(section[:1500])
