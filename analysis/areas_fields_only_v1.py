"""Sensitivity check for the five opportunity areas (14 Nov 2026).
areas() in analysis/defs.py puts a story in an area if a validated structured field shows it OR if the AI theme coding of
its stated need matches (theme codes C02-C12). The theme list later failed human agreement (Evidence Log §4.2), so this
re-runs the opportunity table and the headline "A or B" share with the theme codes removed, and counts how many area
members came only from a theme code. Same rows, weights, groups and intervals as analysis/part1_opps_v1.py and
analysis/part1_core_v1.py; the only change is that themes_unmet and themes_whh are emptied before areas() is called.
Usage: python -I analysis/areas_fields_only_v1.py <analysis_v2.jsonl.gz> <out.json>
"""
import gzip, json, sys, collections as C
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path: sys.path.insert(0, str(_ROOT))
from analysis.defs import AREAS, areas, is_early_journey, grp, diff_ci, wilson
SRC, OUT = sys.argv[1], sys.argv[2]
AB = {'A_first_debit_and_autopay', 'B_money_status_and_resolution'}

def src(r):
    sg = r['source_group']
    return 'reddit' if sg.startswith('reddit') else 'youtube' if sg == 'youtube' else 'appreviews' if sg in ('playstore', 'appstore') else 'other'

reach = {m: C.Counter() for m in ('with', 'fields')}; tot = 0.0
n_E = {m: C.Counter() for m in ('with', 'fields')}
grp_n = C.Counter(); grp_hit = {m: C.defaultdict(C.Counter) for m in ('with', 'fields')}
theme_only = C.Counter(); theme_only_stop = C.Counter()
core = {m: C.Counter() for m in ('with', 'fields')}
seen = set()
with gzip.open(SRC, 'rt', encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        if r.get('targeted') or r['uid'] in seen: continue
        seen.add(r['uid'])
        if not is_early_journey(r): continue
        w = float(r.get('w2') or 1); tot += w
        A_with = areas(r)
        r2 = dict(r); r2['themes_unmet'] = []; r2['themes_whh'] = []
        A_f = areas(r2)
        g = grp(r.get('action_strict'))
        for a in A_with - A_f:
            theme_only[a] += 1
            if g == 'stop': theme_only_stop[a] += 1
        for m, A in (('with', A_with), ('fields', A_f)):
            for a in A: reach[m][a] += w; n_E[m][a] += 1
        if g in ('stop', 'cont'):
            for s in (src(r), 'pooled'):
                grp_n[(s, g)] += 1
                for m, A in (('with', A_with), ('fields', A_f)):
                    for a in A: grp_hit[m][(s, g)][a] += 1
                    if A & AB: grp_hit[m][(s, g)]['CORE_A_or_B'] += 1

out = {'note': 'with = areas() as published; fields = theme codes removed', 'E_episodes_weighted': round(tot, 1), 'areas': {}}
for a in list(AREAS) + ['CORE_A_or_B']:
    row = {}
    if a in AREAS:
        row['n_E'] = {m: n_E[m][a] for m in n_E}
        row['reach_E'] = {m: round(reach[m][a] / tot, 4) for m in reach}
        row['members_only_via_theme_code'] = theme_only[a]
        row['stop_members_only_via_theme_code'] = theme_only_stop[a]
    row['separation'] = {}
    for s in ('reddit', 'youtube', 'appreviews', 'pooled'):
        ns, nc = grp_n[(s, 'stop')], grp_n[(s, 'cont')]
        if not ns or not nc: continue
        row['separation'][s] = {}
        for m in ('with', 'fields'):
            ps, pc = grp_hit[m][(s, 'stop')][a] / ns, grp_hit[m][(s, 'cont')][a] / nc
            row['separation'][s][m] = {'stop': round(ps, 4), 'cont': round(pc, 4), 'diff_ci95': diff_ci(ps, ns, pc, nc), 'n_stop': ns, 'n_cont': nc}
    out['areas'][a] = row
json.dump(out, open(OUT, 'w', encoding='utf-8', newline='\n'), indent=1)
