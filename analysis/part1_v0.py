"""Part 1 analysis, first pass (v0). Reads the analysis export only.

Usage: python -I analysis/part1_v0.py <analysis_v1.jsonl.gz> <out.json>

Conventions
- Unit = one episode (one post/comment/review). Weighted by w2 (T2b sampled at f=0.5).
- STOP = strict label in {stopped_or_cancelled, redeemed_withdrew, lapsed_failed_debit,
  skipped_or_paused, reduced_amount}; CONT = {continued, continued_with_friction,
  increased_or_stepped_up, restarted}; CONSIDER = considered_stopping.
- FT (first-time signal) = first_time_status stated/likely OR gate_ft s/l.
- Shares are among episodes where the field is filled ("of those who say").
- 95% intervals: Wilson on the Kish effective sample size.
"""
import gzip, json, math, sys, collections as C

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
    if n <= 0: return (None, None)
    p = k / n; d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d; h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (round(max(0, c - h), 4), round(min(1, c + h), 4))

class Share:
    """Weighted share of codes among filled rows, with Kish effective n."""
    def __init__(self): self.w = C.Counter(); self.tot = 0.0; self.tot2 = 0.0; self.n = 0
    def add(self, codes, w):
        codes = [c for c in codes if known(c)]
        if not codes: return
        self.tot += w; self.tot2 += w * w; self.n += 1
        for c in set(codes): self.w[c] += w
    def table(self, top=20, min_n=0):
        neff = (self.tot ** 2 / self.tot2) if self.tot2 else 0
        rows = []
        for c, wc in self.w.most_common(top):
            p = wc / self.tot; lo, hi = wilson(p * neff, neff)
            rows.append({'code': c, 'share': round(p, 4), 'ci95': [lo, hi], 'w': round(wc, 1)})
        return {'n_rows': self.n, 'n_eff': round(neff, 1), 'rows': rows}

G = C.defaultdict(Share)  # key -> Share
seg_counts = C.defaultdict(lambda: [0.0, 0.0, 0.0, 0])  # segment -> [w_stop, w_cont, w2sum, n]
mo = C.defaultdict(lambda: C.Counter())
pre = C.defaultdict(Share)
n = 0; pop = C.Counter()

def grp(r):
    a = r.get('action_strict')
    return 'stop' if a in STOP else 'cont' if a in CONT else 'consider' if a == 'considered_stopping' else None

def age_band(r):
    a = r.get('age')
    if not isinstance(a, (int, float)):
        s = v(r.get('age_stated'))
        try: a = int(s)
        except Exception: return None
    return '18-22' if a <= 22 else '23-27' if a <= 27 else '28-32' if a <= 32 else '33-40' if a <= 40 else '41+'

def amt_band(r):
    a = r.get('sip_amount_monthly')
    if not isinstance(a, (int, float)) or a <= 0: return None
    return '<=1k' if a <= 1000 else '1k-3k' if a <= 3000 else '3k-10k' if a <= 10000 else '10k-25k' if a <= 25000 else '>25k'

with gzip.open(SRC, 'rt', encoding='utf-8') as f:
    for line in f:
        r = json.loads(line); n += 1; w = float(r.get('w2') or 1)
        ft = v(r.get('first_time_status')) in ('stated', 'likely') or r.get('gate_ft') in ('s', 'l')
        g = grp(r); scope = r.get('scope')
        pop['all'] += 1; pop['ft'] += ft
        if g: pop[g] += 1; pop[g + '_ft'] += ft
        fields = {
            'start_reason': [v(x) for x in lst(r.get('start_reason'))],
            'expectation': [v(r.get('expectation'))],
            'experience': [v(x) for x in lst(r.get('experience'))],
            'checks_what': [v(x) for x in lst(r.get('checks_what'))],
            'check_frequency': [v(r.get('check_frequency'))],
            'in_app_confusion': [v(x) for x in lst(r.get('in_app_confusion'))],
            'off_app_action': [v(x) for x in lst(r.get('off_app_action'))],
            'trigger_primary': [v(r.get('trigger_primary'))],
            'triggers_any': [v(x) for x in lst(r.get('triggers'))] or [v(r.get('trigger_primary'))],
            'events': [v(x) for x in lst(r.get('events'))],
            'tried_in_app': [v(x) for x in lst(r.get('tried_in_app'))],
            'kept_going_because': [v(x) for x in lst(r.get('kept_going_because'))],
            'influenced_by': [v(r.get('influenced_by'))],
            'work': [v(r.get('work')) if known(v(r.get('work'))) else v(r.get('income_stability'))],
        }
        for k, codes in fields.items():
            G[(k, 'all')].add(codes, w)
            if ft: G[(k, 'ft')].add(codes, w)
            if g: G[(k, g)].add(codes, w)
            if scope in ('groww', 'other_app') and g == 'stop': G[(k, 'stop_' + scope)].add(codes, w)
            if scope in ('groww', 'other_app'): G[(k, 'scope_' + scope)].add(codes, w)
        a = r.get('action_strict')
        if a in STOP: G[('trigger_by_action', a)].add(fields['triggers_any'], w); G[('experience_by_action', a)].add(fields['experience'], w)
        # segments: stop share among stop+continue
        if g in ('stop', 'cont'):
            segs = {'work': fields['work'][0], 'age': age_band(r), 'amount': amt_band(r),
                    'money_source': v(r.get('money_source')) if known(v(r.get('money_source'))) else v(r.get('source_of_money')), 'influenced_by': v(r.get('influenced_by')),
                    'first_time': 'ft' if ft else 'not_flagged', 'scope': scope, 'source': r.get('source_group'),
                    'expectation': v(r.get('expectation'))}
            for sk, sv in segs.items():
                if known(sv):
                    s = seg_counts[(sk, sv)]; s[0 if g == 'stop' else 1] += w; s[2] += w * w; s[3] += 1
            m = r.get('months_at_action')
            if isinstance(m, (int, float)):
                b = '0-3' if m <= 3 else '4-6' if m <= 6 else '7-12' if m <= 12 else '13-24' if m <= 24 else '25+'
                mo[g][b] += w
        # what happened before a stop (J1 events in stop stories)
        if g == 'stop': pre['events_in_stop_stories'].add(fields['events'], w)
        if g == 'cont': pre['events_in_continue_stories'].add(fields['events'], w)

out = {'n_rows': n, 'populations': dict(pop), 'tables': {}, 'segments': {}, 'months_at_action': {}}
for (k, sub), s in sorted(G.items(), key=lambda x: (str(x[0][0]), str(x[0][1]))):
    out['tables'].setdefault(k, {})[sub] = s.table()
for k, s in pre.items(): out['tables'].setdefault('events_context', {})[k] = s.table()
for (sk, sv), (ws, wc, w2s, nn) in seg_counts.items():
    tot = ws + wc; neff = tot * tot / w2s if w2s else 0
    lo, hi = wilson(ws / tot * neff, neff) if tot else (None, None)
    out['segments'].setdefault(sk, []).append({'value': sv, 'n': nn, 'stop_share': round(ws / tot, 4) if tot else None, 'ci95': [lo, hi]})
for sk in out['segments']: out['segments'][sk].sort(key=lambda x: -x['n'])
for g, c in mo.items():
    t = sum(c.values()); out['months_at_action'][g] = {b: {'w': round(c[b], 1), 'share': round(c[b] / t, 4)} for b in ('0-3', '4-6', '7-12', '13-24', '25+')}
json.dump(out, open(OUT, 'w'), indent=1)
print('rows', n, dict(pop))
