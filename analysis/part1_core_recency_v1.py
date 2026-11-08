"""The core problem by post year (9 Nov 2026): does it still separate in recent posts?
Same population and definitions as part1_core_v1.py (non-targeted, de-duplicated, early-journey episodes; areas() from
analysis/defs.py; core = area A or area B). Splits stop and continue stories by source and post year, and tests the
recent window Reddit 2025-26 on its own, because app-review stop stories are mostly older and shift the pooled share.
Usage: python -I analysis/part1_core_recency_v1.py <analysis_v2.jsonl.gz> <out.json>
"""
import gzip, json, sys, collections as C
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path: sys.path.insert(0, str(_ROOT))
import analysis.defs as D
src, out_path = sys.argv[1], sys.argv[2]
CORE = {'A_first_debit_and_autopay', 'B_money_status_and_resolution'}

def source(r):
    sg = r['source_group']
    return 'reddit' if sg.startswith('reddit') else 'youtube' if sg == 'youtube' else 'appreviews' if sg in ('playstore', 'appstore') else 'other'

seen = set(); n = C.Counter(); core = C.Counter(); ret = C.Counter()
with gzip.open(src, 'rt', encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        if r.get('targeted') or r['uid'] in seen: continue
        seen.add(r['uid'])
        if not D.is_early_journey(r): continue
        g = D.grp(r.get('action_strict'))
        if g not in ('stop', 'cont'): continue
        y = str(r.get('posted', ''))[:4]
        yb = y if y in ('2024', '2025', '2026') else 'before_2024' if y.isdigit() else 'unknown'
        A = D.areas(r)
        for s in (source(r), 'all'):
            k = (g, s, yb); n[k] += 1
            if A & CORE: core[k] += 1
            if 'C_returns_expectations' in A: ret[k] += 1

def window(counter, g, s, years):
    k = sum(counter[(g, s, y)] for y in years); N = sum(n[(g, s, y)] for y in years)
    return k, N

res = {'population': 'E stop and continue stories, non-targeted, de-duplicated (as part1_core_v1.py)', 'reddit_2025_26': {}, 'by_year': {}}
for lab, cnt in (('core_A_or_B', core), ('returns_C', ret)):
    ks, ns = window(cnt, 'stop', 'reddit', ('2025', '2026')); kc, nc = window(cnt, 'cont', 'reddit', ('2025', '2026'))
    ps, pc = ks / ns, kc / nc
    res['reddit_2025_26'][lab] = {'stop': {'k': ks, 'n': ns, 'share': round(ps, 4), 'ci95': D.wilson(ks, ns)},
                                  'cont': {'k': kc, 'n': nc, 'share': round(pc, 4), 'ci95': D.wilson(kc, nc)},
                                  'diff': round(ps - pc, 4), 'diff_ci95': D.diff_ci(ps, ns, pc, nc)}
for g in ('stop', 'cont'):
    for s in ('reddit', 'youtube', 'appreviews', 'all'):
        for yb in ('before_2024', '2024', '2025', '2026'):
            N = n[(g, s, yb)]
            if N:
                res['by_year'].setdefault(g, {}).setdefault(s, {})[yb] = {'n': N, 'core_A_or_B': round(core[(g, s, yb)] / N, 4), 'returns_C': round(ret[(g, s, yb)] / N, 4)}
json.dump(res, open(out_path, 'w', encoding='utf-8'), indent=1)
print(json.dumps(res['reddit_2025_26']))
