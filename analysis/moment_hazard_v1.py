"""Which moments are followed by an exit? For each timeline event in early-journey stories, the share of labelled stories
(strict stop / continue / considering) that end in a stop, within source, with Wilson 95% CIs; plus the investor-level
full-exit share where the re-read covers the story. Also tallies Claude's hand coding of the 'payment_failed' event.
Usage: PYTHONHASHSEED=0 python -I analysis/moment_hazard_v1.py <repo_root> <out.json>"""
import gzip, json, sys, collections as C
from pathlib import Path
ROOT = Path(sys.argv[1]); sys.path.insert(0, str(ROOT))
from analysis.defs import grp, is_early_journey, wilson  # noqa: E402
EXITS = ('stopped_all', 'lapsed_payment', 'switched_platform')
src = lambda sg: 'reddit' if sg.startswith('reddit') else ('appreviews' if sg in ('playstore', 'appstore') else ('youtube' if sg == 'youtube' else 'other'))
H = {}
for line in open(ROOT / 'data/interim/reread_v1_haiku.jsonl', encoding='utf-8'):
    r = json.loads(line); H[r['uid']] = r
seen = set(); rows = []
with gzip.open(ROOT / 'data/processed/v1.10/analysis_v2.jsonl.gz', 'rt', encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        if r['uid'] in seen: continue
        seen.add(r['uid'])
        if r.get('targeted') or not is_early_journey(r): continue
        rows.append(r)
def evs(r):
    e = r.get('events')
    if isinstance(e, str):
        try: e = json.loads(e)
        except Exception: return []
    return [x for x in (e or []) if isinstance(x, dict)]
EVENTS = ['payment_failed', 'first_debit_or_gap', 'life_event_or_cash_need', 'confused_in_app', 'saw_loss_or_flat', 'advice_received', 'checked_returns', 'considered_stopping']
out = {'note': 'labelled = strict stop / cont / consider; stop share = stop / labelled; full exit = re-read action in stopped_all, lapsed_payment, switched_platform among labelled stories the re-read covers', 'hazard': {}}
for code in EVENTS:
    out['hazard'][code] = {}
    for s in ('reddit', 'youtube', 'appreviews', 'pooled'):
        lab = [r for r in rows if any(x.get('v') == code for x in evs(r)) and (s == 'pooled' or src(r['source_group']) == s) and grp(r.get('action_strict')) in ('stop', 'cont', 'consider')]
        k = sum(1 for r in lab if grp(r['action_strict']) == 'stop')
        cov = [H[r['uid']] for r in lab if r['uid'] in H]
        kx = sum(1 for x in cov if x['action_now'] in EXITS)
        out['hazard'][code][s] = {'n': len(lab), 'stop': k, 'stop_share': round(k / len(lab), 3) if lab else None, 'ci': wilson(k, len(lab)),
                                  'n_reread': len(cov), 'full_exit': kx, 'full_exit_share': round(kx / len(cov), 3) if cov else None, 'full_exit_ci': wilson(kx, len(cov))}
FC = json.loads((ROOT / 'data/manual/failure_event_coding_v1.json').read_text(encoding='utf-8'))
it = FC['items']
fc = {}
for code in FC['codebook']:
    for s in ('reddit', 'pooled'):
        sel = [x for x in it if x['code'] == code and (s == 'pooled' or src(x['source_group']) == s)]
        k = sum(1 for x in sel if x['group'] == 'stop')
        fc.setdefault(code, {})[s] = {'n': len(sel), 'stop': k, 'stop_share': round(k / len(sel), 3) if sel else None, 'ci': wilson(k, len(sel))}
ab = [x for x in it if x['code'] in ('instalment_did_not_go_through', 'debited_but_order_failed_or_not_shown')]
kab = sum(1 for x in ab if x['group'] == 'stop')
out['failure_coding'] = {'n': len(it), 'by_code': fc, 'no_units_combined': {'n': len(ab), 'stop': kab, 'stop_share': round(kab / len(ab), 3), 'ci': wilson(kab, len(ab))},
                         'sub_did_not_go_through': dict(C.Counter(s for x in it if x['code'] == 'instalment_did_not_go_through' for s in x['sub'])),
                         'recovery_if_continued': dict(C.Counter(x['recovery_if_continued'] for x in it if x['group'] != 'stop')),
                         'n_continued': sum(1 for x in it if x['group'] != 'stop')}
import re
WHH = [('reason_status_or_next_step', r"clear|reason|status|guidance|knowing|what to do|next|notification|communicat|transparen"),
       ('pay_the_missed_instalment', r"manual|missed|one-time|re-initiate|pay the|retry"),
       ('support_that_resolves', r"support|customer care|helpline|ticket|grievance|response"),
       ('refund', r"refund"), ('kyc', r"kyc|e-sign|re-kyc"), ('autopay_or_mandate_setup', r"auto-?pay|mandate|upi")]
fu = {x['uid'] for x in it if x['code'] in ('instalment_did_not_go_through', 'debited_but_order_failed_or_not_shown')}
whh = [str(r.get('would_have_helped')) for r in rows if r['uid'] in fu and str(r.get('would_have_helped')) not in ('None', 'unknown')]
out['failure_would_have_helped'] = {'note': "the engine's model-written 'would have helped' summary, keyword themes, multi-label; colour only", 'n': len(whh),
                                     **{k: sum(1 for w in whh if re.search(p_, w, re.I)) for k, p_ in WHH}}
restarted = [r for r in rows if any(x.get('v') == 'restarted' for x in evs(r))]
stopped_ev = [r for r in rows if any(x.get('v') == 'stopped' for x in evs(r))]
out['restart'] = {'stories_with_restart_event': len(restarted), 'stories_with_stop_event': len(stopped_ev)}
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), indent=1, sort_keys=True)
for code, d in out['hazard'].items(): print(code, {s: (x['stop'], x['n'], x['stop_share'], x['full_exit'], x['n_reread']) for s, x in d.items()})
print(json.dumps(out['failure_coding'], indent=0)[:1500]); print(out['restart'])
