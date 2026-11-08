"""Opportunity table v1 (SPEC-04 §5). Reads analysis_v2.jsonl.gz (non-targeted rows only).
Usage: python -I analysis/part1_opps_v1.py <analysis_v2.jsonl.gz> <out.json>
Each area = an indicator on an episode built from validated structured fields (themes only as an extra signal).
reach = weighted share of early-journey (E) episodes showing it; separation = share among stop minus share among
continue stories, within source; groww_share = share of the area's E episodes that are about Groww.
"""
import gzip, json, math, sys, collections as C
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path: sys.path.insert(0, str(_ROOT))
from analysis.defs import AREAS, areas
SRC, OUT = sys.argv[1], sys.argv[2]
STOP = {'stopped_or_cancelled', 'redeemed_withdrew', 'lapsed_failed_debit', 'skipped_or_paused', 'reduced_amount'}
CONT = {'continued', 'continued_with_friction', 'increased_or_stepped_up', 'restarted'}
def v(x):
    if isinstance(x, dict): x = x.get('v')
    if isinstance(x, (dict, list)): return json.dumps(x, sort_keys=True)
    return x
def lst(x):
    if isinstance(x, str):
        try: x = json.loads(x)
        except Exception: return []
    if isinstance(x, dict): return [x]
    return x if isinstance(x, list) else []
def mdiff(a, b):
    try: return (int(b[:4]) - int(a[:4])) * 12 + int(b[5:7]) - int(a[5:7])
    except Exception: return None
def wilson(k, n, z=1.96):
    if n <= 0: return [None, None]
    p = k / n; d = 1 + z * z / n; c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(max(p * (1 - p) / n + z * z / (4 * n * n), 0)) / d
    return [round(max(0, c - h), 4), round(min(1, c + h), 4)]
def diff_ci(p1, n1, p2, n2):
    if not n1 or not n2: return [None, None]
    se = math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2); d = p1 - p2
    return [round(d - 1.96 * se, 4), round(d + 1.96 * se, 4)]


reach = C.Counter(); reach_tot = 0.0; grow = C.Counter(); cnt = C.Counter()
grp_w = C.defaultdict(C.Counter); grp_n = C.Counter(); seen = set()
with gzip.open(SRC, 'rt', encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        if r.get('targeted') or r['uid'] in seen: continue
        seen.add(r['uid']); w = float(r.get('w2') or 1)
        ft = v(r.get('first_time_status')) in ('stated', 'likely') or r.get('gate_ft') in ('s', 'l')
        m = []
        if isinstance(r.get('months_at_action'), (int, float)): m.append(r['months_at_action'])
        mb = r.get('months_bucket'); m += [6] if mb in ('0-3', '4-6', '7-12') else [24] if mb in ('13-24', '25+') else []
        ms = v(r.get('months_since_start')); m += [ms] if isinstance(ms, (int, float)) else []
        fsm = v(r.get('first_sip_month')) if r.get('first_sip_month') else None
        if fsm and r.get('posted', 'unknown') != 'unknown':
            d = mdiff(fsm, r['posted']); m += [d] if d is not None and d >= 0 else []
        E = (ft or (bool(m) and min(m) <= 12)) and not (bool(m) and min(m) > 12)
        if not E: continue
        A = areas(r); reach_tot += w
        for a in A:
            reach[a] += w; cnt[a] += 1
            if r['scope'] == 'groww': grow[a] += w
        a_ = r.get('action_strict'); g = 'stop' if a_ in STOP else 'cont' if a_ in CONT else None
        if g:
            sg = r['source_group']; src = 'reddit' if sg.startswith('reddit') else 'youtube' if sg == 'youtube' else 'appreviews' if sg in ('playstore', 'appstore') else 'other'
            for s in (src, 'pooled'):
                grp_n[(s, g)] += 1
                for a in A: grp_w[(s, g)][a] += 1
out = {'definitions': AREAS, 'E_episodes_weighted': round(reach_tot, 1), 'areas': {}}
for a in AREAS:
    row = {'reach_E': round(reach[a] / reach_tot, 4), 'n_E': cnt[a], 'groww_share_of_area': round(grow[a] / reach[a], 4) if reach[a] else None, 'separation': {}}
    for s in ('reddit', 'youtube', 'appreviews', 'pooled'):
        ns, nc = grp_n[(s, 'stop')], grp_n[(s, 'cont')]
        if not ns or not nc: continue
        ps, pc = grp_w[(s, 'stop')][a] / ns, grp_w[(s, 'cont')][a] / nc
        row['separation'][s] = {'stop': round(ps, 4), 'cont': round(pc, 4), 'diff': round(ps - pc, 4), 'diff_ci95': diff_ci(ps, ns, pc, nc), 'n_stop': ns, 'n_cont': nc}
    out['areas'][a] = row
json.dump(out, open(OUT, 'w', encoding='utf-8', newline='\n'), indent=1)
for a, r in out['areas'].items():
    print(a, 'reach', r['reach_E'], 'n', r['n_E'], 'groww', r['groww_share_of_area'], {s: (x['stop'], x['cont'], x['diff_ci95']) for s, x in r['separation'].items()})
