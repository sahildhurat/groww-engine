"""Part 1 analysis v1 (SPEC-04). Reads analysis_v2.jsonl.gz only; every number in the findings comes from here.

Usage: python -I analysis/part1_v1.py <analysis_v2.jsonl.gz> <out.json>

Populations
- MAIN = non-targeted rows (the census/sample corpus). TOPUP = targeted rows (never in prevalence).
- E (early-journey episodes) = first-time signal OR timing <= 12 months, and NOT timing > 12 months.
- Groups (strict labels): stop / consider / cont (see part1_v0.py). Shares are "of those who say", weighted by w2.
- Every stop-vs-continue comparison is given pooled and within source (reddit / youtube / appreviews).
- 95% intervals: Wilson on Kish effective n.
"""
import gzip, json, math, sys, random, collections as C
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path: sys.path.insert(0, str(_ROOT))
from analysis.defs import routes

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
def known(x): return x not in (None, 'unknown', 'u', '', 'none_stated')
def wilson(k, n, z=1.96):
    if n <= 0: return [None, None]
    p = k / n; d = 1 + z * z / n; c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(max(p * (1 - p) / n + z * z / (4 * n * n), 0)) / d
    return [round(max(0, c - h), 4), round(min(1, c + h), 4)]
def mdiff(a, b):
    try: return (int(b[:4]) - int(a[:4])) * 12 + int(b[5:7]) - int(a[5:7])
    except Exception: return None

class Share:
    def __init__(s): s.w = C.Counter(); s.t = 0.0; s.t2 = 0.0; s.n = 0
    def add(s, codes, w):
        codes = [c for c in codes if known(c)]
        if not codes: return
        s.t += w; s.t2 += w * w; s.n += 1
        for c in set(codes): s.w[c] += w
    def get(s, code):
        if not s.t: return None
        ne = s.t * s.t / s.t2; p = s.w[code] / s.t
        return {'share': round(p, 4), 'ci95': wilson(p * ne, ne), 'n': s.n}
    def table(s, top=25):
        ne = (s.t * s.t / s.t2) if s.t2 else 0
        return {'n': s.n, 'n_eff': round(ne, 1), 'rows': [{'code': c, 'share': round(wc / s.t, 4), 'ci95': wilson(wc / s.t * ne, ne)} for c, wc in s.w.most_common(top)]}

T = C.defaultdict(Share)              # (question, population, group, source) -> Share
SEG = C.defaultdict(lambda: [0.0, 0.0, 0.0, 0])
MO = C.defaultdict(C.Counter); EV_WHEN = C.defaultdict(C.Counter)
ROUTE = C.defaultdict(C.Counter); ROUTE_N = C.Counter()
QUOTES = C.defaultdict(list); POP = C.Counter(); seen = set()

def src_of(sg): return 'reddit' if sg.startswith('reddit') else 'appreviews' if sg in ('playstore', 'appstore') else 'youtube' if sg == 'youtube' else 'other'
def grp(a): return 'stop' if a in STOP else 'cont' if a in CONT else 'consider' if a == 'considered_stopping' else 'none'
def age_band(r):
    a = r.get('age')
    if not isinstance(a, (int, float)):
        try: a = int(v(r.get('age_stated')))
        except Exception: return None
    return '<=22' if a <= 22 else '23-27' if a <= 27 else '28-32' if a <= 32 else '33+'
def amt_band(r):
    a = r.get('sip_amount_monthly')
    if not isinstance(a, (int, float)) or a <= 0: return None
    return '<=1k' if a <= 1000 else '1k-3k' if a <= 3000 else '3k-10k' if a <= 10000 else '>10k'



with gzip.open(SRC, 'rt', encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        if r['uid'] in seen: continue
        seen.add(r['uid'])
        targeted = bool(r.get('targeted')); P = 'TOPUP' if targeted else 'MAIN'
        w = float(r.get('w2') or 1)
        a = r.get('action_strict'); g = grp(a); src = src_of(r['source_group'])
        ft = v(r.get('first_time_status')) in ('stated', 'likely') or r.get('gate_ft') in ('s', 'l')
        m = []
        if isinstance(r.get('months_at_action'), (int, float)): m.append(r['months_at_action'])
        mb = r.get('months_bucket')
        if mb in ('0-3', '4-6', '7-12'): m.append(6)
        elif mb in ('13-24', '25+'): m.append(24)
        ms = v(r.get('months_since_start'))
        if isinstance(ms, (int, float)): m.append(ms)
        fsm = v(r.get('first_sip_month')) if r.get('first_sip_month') else None
        if fsm and r.get('posted', 'unknown') != 'unknown':
            d = mdiff(fsm, r['posted'])
            if d is not None and d >= 0: m.append(d)
        early = bool(m) and min(m) <= 12; late = bool(m) and min(m) > 12
        E = (ft or early) and not late
        POP[(P, 'all')] += 1
        if E: POP[(P, 'E')] += 1
        if E and g != 'none': POP[(P, 'E_' + g)] += 1
        if g != 'none': POP[(P, 'all_' + g)] += 1
        ex = [v(x) for x in lst(r.get('experience'))]
        tr = [v(x) for x in lst(r.get('triggers'))] or ([v(r.get('trigger_primary'))] if known(v(r.get('trigger_primary'))) else [])
        evs = lst(r.get('events')); ev = [v(x) for x in evs]
        fields = {
            'Q1_start_reason': [v(x) for x in lst(r.get('start_reason'))],
            'Q1_expectation': [v(r.get('expectation'))],
            'Q1_influenced_by': [v(r.get('influenced_by'))],
            'Q3_triggers': tr, 'Q3_experience': ex, 'Q2_events': ev,
            'Q4_checks_what': [v(x) for x in lst(r.get('checks_what'))],
            'Q4_check_frequency': [v(r.get('check_frequency'))],
            'Q5_in_app_confusion': [v(x) for x in lst(r.get('in_app_confusion'))],
            'Q5_tried_in_app': [v(x) for x in lst(r.get('tried_in_app'))],
            'Q6_off_app_action': [v(x) for x in lst(r.get('off_app_action'))],
            'Q7_kept_going_because': [v(x) for x in lst(r.get('kept_going_because'))],
            'Q9_themes': list(dict.fromkeys((r.get('themes_unmet') or []) + (r.get('themes_whh') or []))),
        }
        pops = ['all'] + (['E'] if E else [])
        for k, codes in fields.items():
            for pop in pops:
                T[(k, P, pop, 'any', 'pooled')].add(codes, w)
                if g != 'none':
                    T[(k, P, pop, g, 'pooled')].add(codes, w)
                    T[(k, P, pop, g, src)].add(codes, w)
                if r['scope'] in ('groww', 'other_app'): T[(k, P, pop, 'scope_' + r['scope'], 'pooled')].add(codes, w)
        if g in ('stop', 'cont', 'consider'):
            seg = {'work': v(r.get('work')) if known(v(r.get('work'))) else v(r.get('income_stability')), 'age': age_band(r), 'amount': amt_band(r),
                   'money_source': v(r.get('money_source')) if known(v(r.get('money_source'))) else v(r.get('source_of_money')),
                   'influenced_by': v(r.get('influenced_by')), 'first_time': 'first_time' if ft else 'not_flagged', 'scope': r['scope'],
                   'source': src, 'language': r.get('language'), 'expectation': v(r.get('expectation'))}
            if g in ('stop', 'cont'):
                for pop in pops:
                    for sk, sv in seg.items():
                        if known(sv):
                            s = SEG[(P, pop, sk, sv)]; s[0 if g == 'stop' else 1] += w; s[2] += w * w; s[3] += 1
            mm = r.get('months_at_action')
            if isinstance(mm, (int, float)) and P == 'MAIN':
                b = '0-3' if mm <= 3 else '4-6' if mm <= 6 else '7-12' if mm <= 12 else '13-24' if mm <= 24 else '25+'
                MO[g][b] += w
                if ft: MO[g + '_ft'][b] += w
        for e in evs:
            wh = e.get('when') if isinstance(e, dict) else None
            if isinstance(wh, str) and wh.startswith('+') and P == 'MAIN':
                try: k_ = int(wh[1:])
                except Exception: continue
                b = '0-3' if k_ <= 3 else '4-6' if k_ <= 6 else '7-12' if k_ <= 12 else '13+'
                EV_WHEN[b][v(e)] += 1; EV_WHEN[b]['_n'] += 1
        if g == 'stop' and P == 'MAIN':
            for pop in pops:
                rs = routes(r, ex, tr, ev, a); ROUTE_N[(pop, src)] += 1; ROUTE_N[(pop, 'pooled')] += 1
                for x in rs: ROUTE[(pop, src)][x] += 1; ROUTE[(pop, 'pooled')][x] += 1
                if pop == 'E' and r.get('quote') and r.get('quote_ok', True) and r.get('language') == 'english':
                    for x in rs: QUOTES[x].append({'uid': r['uid'], 'source': src, 'scope': r['scope'], 'quote': r['quote']})

out = {'populations': {f'{k[0]}|{k[1]}': c for k, c in sorted(POP.items())}, 'tables': {}, 'segments': {}, 'months_at_action': {}, 'event_timing': {}, 'stop_routes': {}, 'route_quotes': {}}
for (q, P, pop, g, src), s in T.items():
    out['tables'].setdefault(q, {}).setdefault(P, {}).setdefault(pop, {}).setdefault(g, {})[src] = s.table()
for (P, pop, sk, sv), (ws, wc, w2s, nn) in SEG.items():
    tot = ws + wc; ne = tot * tot / w2s if w2s else 0
    out['segments'].setdefault(P, {}).setdefault(pop, {}).setdefault(sk, []).append({'value': sv, 'n': nn, 'stop_share': round(ws / tot, 4), 'ci95': wilson(ws / tot * ne, ne)})
for P in out['segments']:
    for pop in out['segments'][P]:
        for sk in out['segments'][P][pop]: out['segments'][P][pop][sk].sort(key=lambda x: -x['n'])
for g, c in MO.items():
    t = sum(c.values()); out['months_at_action'][g] = {'n_w': round(t, 1), **{b: round(c[b] / t, 4) for b in ('0-3', '4-6', '7-12', '13-24', '25+')}}
for b, c in EV_WHEN.items():
    n_ = c.pop('_n'); out['event_timing'][b] = {'n_events': n_, 'top': [[k, round(x / n_, 4)] for k, x in c.most_common(10)]}
for k, c in ROUTE.items():
    n_ = ROUTE_N[k]; out['stop_routes'][f'{k[0]}|{k[1]}'] = {'n': n_, **{x: {'share': round(c[x] / n_, 4), 'ci95': wilson(c[x], n_)} for x in c}}
random.seed(20261102)
for x, qs in QUOTES.items(): out['route_quotes'][x] = random.sample(qs, min(4, len(qs)))
json.dump(out, open(OUT, 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)
print(json.dumps(out['populations']))
