"""The core problem, Part 1 (9 Nov 2026). Reads analysis_v2.jsonl.gz with the engine's own definitions (analysis/defs.py:
areas, is_early_journey, grp, wilson, diff_ci). No new labels: "core" = an episode in area A (payment & AutoPay) OR area B
(where is my money / order status / support), exactly as areas() assigns them.
Population = the opportunity table's (part1_opps_v1.py): non-targeted, de-duplicated, early-journey (E) episodes.
Group shares are unweighted counts and reach is w2-weighted, both as part1_opps_v1.py; the A-E rows reproduce that table.
Adds: core (A or B) by group and source, posts naming Groww, stop stories by stated timing, stop stories by post year.
Usage: python -I analysis/part1_core_v1.py <analysis_v2.jsonl.gz> <out.json>
"""
import gzip, json, sys, collections as C
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path: sys.path.insert(0, str(_ROOT))
import analysis.defs as D
src, out_path = sys.argv[1], sys.argv[2]
v, lst = D.v, D.lst

def source(r):
    sg = r['source_group']
    return 'reddit' if sg.startswith('reddit') else 'youtube' if sg == 'youtube' else 'appreviews' if sg in ('playstore', 'appstore') else 'other'

def signals(r):
    """Finer problem signals, built only from the same fields areas() uses."""
    ex = {v(x) for x in lst(r.get('experience'))}
    tr = {v(x) for x in lst(r.get('triggers'))} | {v(r.get('trigger_primary'))}
    ev = {v(x) for x in lst(r.get('events'))}
    cf = {v(x) for x in lst(r.get('in_app_confusion'))}
    ti = [json.loads(v(x)) if isinstance(v(x), str) and v(x).startswith('{') else {} for x in lst(r.get('tried_in_app'))]
    a = r.get('action_strict')
    s = set()
    if 'payment_failed' in ev or a == 'lapsed_failed_debit': s.add('instalment_failed_or_lapsed')
    if 'first_debit_or_gap' in ev or 'sip_date_first_debit' in cf: s.add('first_debit_or_sip_date')
    if 'autopay_mandate' in cf or 'payment_mandate_problem' in tr: s.add('autopay_mandate')
    if 'payment_problem' in ex: s.add('payment_problem_experienced')
    if 'where_money_went' in cf: s.add('where_my_money_went')
    if 'order_status_units' in cf: s.add('order_status_units')
    if any(t.get('feature') == 'customer_support' and t.get('stage') in ('not_resolved', 'could_not_access') for t in ti): s.add('support_not_resolved')
    if 'skip_pause_cancel' in cf: s.add('skip_pause_cancel_confusion')
    if any(t.get('feature') in ('edit_sip', 'cancel', 'skip', 'pause') and t.get('stage') in ('could_not_access', 'not_resolved') for t in ti): s.add('sip_control_failed')
    if 'app_problem' in ex: s.add('app_problem_experienced')
    if 'negative_returns' in ex or 'saw_loss_or_flat' in ev: s.add('saw_loss_or_flat')
    if 'flat' in ex: s.add('flat_returns')
    if ex & {'confusing_numbers'} or cf & {'returns_calculation', 'why_negative'}: s.add('confusing_returns_numbers')
    if tr & {'returns_disappointing'}: s.add('trigger_returns_disappointing')
    if tr & {'market_fall_news'}: s.add('trigger_market_fall')
    if tr & {'cash_crunch_expense', 'income_change'} or 'life_event_or_cash_need' in ev: s.add('cash_or_income_change')
    if tr & {'advice_from_someone', 'influencer_or_media'} or 'advice_received' in ev: s.add('advice_from_others')
    if tr & {'fees_tax_exit_load'}: s.add('costs_tax_exit_load')
    return s

def timing(r):
    m = r.get('months_at_action')
    if isinstance(m, (int, float)):
        return '0-3' if m <= 3 else '4-12' if m <= 12 else '13+'
    mb = r.get('months_bucket')
    return {'0-3': '0-3', '4-6': '4-12', '7-12': '4-12', '13-24': '13+', '25+': '13+'}.get(mb, 'unknown')

seen = set(); reach = C.Counter(); reach_tot = 0.0; reach_n = C.Counter()
cnt = C.defaultdict(C.Counter); n = C.Counter()       # (slice, group) -> label counts
year_cnt = C.defaultdict(C.Counter); year_n = C.Counter()
with gzip.open(src, 'rt', encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        if r.get('targeted') or r['uid'] in seen: continue
        seen.add(r['uid'])
        if not D.is_early_journey(r): continue
        A = D.areas(r); S = signals(r)
        labels = set(A) | {'sig:' + x for x in S}
        if A & {'A_first_debit_and_autopay', 'B_money_status_and_resolution'}: labels.add('CORE_A_or_B')
        if {'A_first_debit_and_autopay', 'B_money_status_and_resolution'} <= A: labels.add('CORE_A_and_B')
        if not A: labels.add('NO_AREA')
        w = float(r.get('w2') or 1); reach_tot += w
        for l in labels: reach[l] += w; reach_n[l] += 1
        g = D.grp(r.get('action_strict'))
        if g == 'none': continue
        src_ = source(r)
        slices = [src_, 'pooled']
        if r['scope'] == 'groww': slices.append('groww_scope')
        if g == 'stop': slices.append('stop_timing_' + timing(r))
        for s in slices:
            n[(s, g)] += 1
            for l in labels: cnt[(s, g)][l] += 1
        if g == 'stop':
            y = str(r.get('posted', ''))[:4]
            yb = y if y in ('2024', '2025', '2026') else 'before_2024' if y.isdigit() else 'unknown'
            year_n[yb] += 1
            for l in labels: year_cnt[yb][l] += 1

all_labels = sorted(reach)
res = {'population': 'E episodes, non-targeted, de-duplicated (as part1_opps_v1.py)',
       'E_weighted': round(reach_tot, 1), 'reach': {}, 'groups': {}, 'stop_by_post_year': {}}
for l in all_labels:
    res['reach'][l] = {'share_w': round(reach[l] / reach_tot, 4), 'n': reach_n[l]}
for (s, g), N in sorted(n.items()):
    res['groups'].setdefault(s, {})[g] = {'n': N, 'labels': {l: {'k': cnt[(s, g)][l], 'share': round(cnt[(s, g)][l] / N, 4), 'ci95': D.wilson(cnt[(s, g)][l], N)} for l in all_labels}}
for s, gs in res['groups'].items():
    if 'stop' in gs and 'cont' in gs:
        ns, nc = gs['stop']['n'], gs['cont']['n']
        gs['separation'] = {}
        for l in all_labels:
            ps, pc = gs['stop']['labels'][l]['share'], gs['cont']['labels'][l]['share']
            gs['separation'][l] = {'diff': round(ps - pc, 4), 'diff_ci95': D.diff_ci(ps, ns, pc, nc)}
for yb, N in sorted(year_n.items()):
    res['stop_by_post_year'][yb] = {'n': N, 'labels': {l: round(year_cnt[yb][l] / N, 4) for l in all_labels}}
json.dump(res, open(out_path, 'w', encoding='utf-8'), indent=1)
print('E weighted', res['E_weighted'], '| groups:', {f'{s}/{g}': N for (s, g), N in sorted(n.items())})
