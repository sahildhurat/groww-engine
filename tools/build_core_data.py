"""Builds site/data/core.json: the "money didn't move or status unclear" (area A or B) evidence shown on the Overview and
Opportunity Areas pages. Reads only committed report files; every number on those panels comes from here.
Inputs: reports/analysis/part1_core_v1.json, part1_core_recency_v1.json, moment_hazard_v1.json, exit_evidence_v1.json
Usage: python -I tools/build_core_data.py
"""
import hashlib, json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
REP = ROOT / 'reports' / 'analysis'
def load(name):
    raw = (REP / name).read_bytes(); return json.loads(raw), hashlib.sha256(raw).hexdigest()
core, h1 = load('part1_core_v1.json'); rec, h2 = load('part1_core_recency_v1.json')
mh, h3 = load('moment_hazard_v1.json'); ex, h4 = load('exit_evidence_v1.json')
pct = lambda x: None if x is None else round(x * 100, 1)
ci = lambda c: [pct(c[0]), pct(c[1])] if c and c[0] is not None else None
G = core['groups']
def cell(src, grp, label='CORE_A_or_B'):
    x = G[src][grp]['labels'][label]; return {'pct': pct(x['share']), 'k': x['k'], 'n': G[src][grp]['n'], 'ci95': ci(x['ci95'])}
def sep(src, label='CORE_A_or_B'):
    s = G[src]['separation'][label]; return {'diff_pts': pct(s['diff']), 'diff_ci95': ci(s['diff_ci95'])}
out = {
    'label': 'Money didn’t move or the status was unclear (area A or B)',
    'groups': {g: cell('pooled', g) for g in ('stop', 'consider', 'cont')},
    'pooled_sep': sep('pooled'),
    'by_source': [{'source': name, 'stop': cell(src, 'stop'), 'cont': cell(src, 'cont'), **sep(src)}
                  for src, name in (('reddit', 'Reddit'), ('youtube', 'YouTube'), ('appreviews', 'App reviews'), ('groww_scope', 'Posts naming Groww'))],
    'returns_compare': {g: cell('pooled', g, 'C_returns_expectations') for g in ('stop', 'consider', 'cont')},
    'timing': [{'window': w, 'n': G[f'stop_timing_{k}']['stop']['n'],
                'core_pct': pct(G[f'stop_timing_{k}']['stop']['labels']['CORE_A_or_B']['share']),
                'returns_pct': pct(G[f'stop_timing_{k}']['stop']['labels']['C_returns_expectations']['share'])}
               for k, w in (('0-3', 'Months 0–3'), ('4-12', 'Months 4–12'))],
    'reach': {'core_pct': pct(core['reach']['CORE_A_or_B']['share_w']), 'core_n': core['reach']['CORE_A_or_B']['n'],
              'returns_pct': pct(core['reach']['C_returns_expectations']['share_w']), 'returns_n': core['reach']['C_returns_expectations']['n']},
    'recency': {'stop_core_by_year': {y: {'n': v['n'], 'pct': pct(v['core_A_or_B'])} for y, v in rec['by_year']['stop']['all'].items()},
                'reddit_2025_26': {k: {'stop_pct': pct(v['stop']['share']), 'stop_n': v['stop']['n'], 'cont_pct': pct(v['cont']['share']),
                                       'cont_n': v['cont']['n'], 'diff_ci95': ci(v['diff_ci95'])} for k, v in rec['reddit_2025_26'].items()}},
    'moments': [{'code': c, 'label': l, 'stop': mh['hazard'][c]['pooled']['stop'], 'n': mh['hazard'][c]['pooled']['n'],
                 'pct': pct(mh['hazard'][c]['pooled']['stop_share']), 'ci95': ci(mh['hazard'][c]['pooled']['ci'])}
                for c, l in (('payment_failed', 'A payment failed'), ('first_debit_or_gap', 'A first-debit problem or gap'),
                             ('confused_in_app', 'Confused in the app'), ('life_event_or_cash_need', 'A life event or cash need'),
                             ('advice_received', 'Advice from someone'), ('saw_loss_or_flat', 'Saw a loss or flat returns'),
                             ('checked_returns', 'Checked returns'))],
    'failed_payments': {'n': mh['failure_coding']['n'],
                        'debited_no_units': {k: mh['failure_coding']['by_code']['debited_but_order_failed_or_not_shown']['pooled'][k] for k in ('n', 'stop')},
                        'never_became_units': {k: mh['failure_coding']['no_units_combined'][k] for k in ('n', 'stop')}},
    'exits': {s: {'n_exits': ex['exits'][s]['n_exits'], 'n_cause': ex['exits'][s]['n_cause_stated'],
                  **{f: {'k': ex['exits'][s][f'cause_{f}']['k'], 'pct': pct(ex['exits'][s][f'cause_{f}']['share'])}
                     for f in ('money', 'app_support', 'cash', 'returns_or_market')}}
              for s in ('pooled', 'reddit', 'youtube', 'appreviews', 'groww_scope')},
    'sources': [{'file': f'reports/analysis/{n}', 'sha256': h[:16]} for n, h in
                (('part1_core_v1.json', h1), ('part1_core_recency_v1.json', h2), ('moment_hazard_v1.json', h3), ('exit_evidence_v1.json', h4))],
}
for m in out['moments']:
    m['pct'] = round(m['stop'] / m['n'] * 100, 1)
out['moments'].sort(key=lambda m: -m['pct'])
(ROOT / 'site' / 'data' / 'core.json').write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding='utf-8')
print(json.dumps({k: out[k] for k in ('groups', 'timing', 'reach', 'failed_payments')}, ensure_ascii=False))
print(json.dumps(out['exits']['pooled']), json.dumps(out['recency']))
