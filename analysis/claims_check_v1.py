"""Tests claims from the AI baseline reports against the engine's evidence text (quotes + verbatim spans).
Lower bound: only text the engine extracted is searched, not the full posts.
Usage: python -I claims_check_v1.py <repo_root> <out.json>"""
import gzip, json, re, sys, collections
from pathlib import Path
ROOT = Path(sys.argv[1]); sys.path.insert(0, str(ROOT))
from analysis.defs import grp, is_early_journey, routes, v

def ev_text(r):
    parts = [r.get('quote') or '']
    for k, x in r.items():
        if isinstance(x, dict) and isinstance(x.get('s'), str): parts.append(x['s'])
        elif isinstance(x, list):
            for y in x:
                if isinstance(y, dict) and isinstance(y.get('s'), str): parts.append(y['s'])
                elif isinstance(y, dict):
                    for z in y.values():
                        if isinstance(z, str) and len(z) > 12: parts.append(z)
        elif isinstance(x, str) and k in ('would_have_helped',): parts.append(x)
    return ' \n '.join(parts).lower()

CLAIMS = {
 'upi_app_revocation': r'(gpay|google pay|phonepe|phone pe|paytm|bhim|\bcred\b|upi app).{0,80}(mandate|autopay|auto pay|auto-pay|revok|cancel|pause)|(mandate|autopay|auto pay|auto-pay).{0,80}(gpay|google pay|phonepe|phone pe|paytm|bhim|upi app)',
 'bank_bounce_charges': r'bounce|\becs\b|return charge|penalt|\bfine\b|charged (me )?(rs|₹|inr)|(bank|nach).{0,30}charge',
 'salary_timing': r'salary.{0,40}(date|late|delay|credited|credit|comes|before|after)|(date).{0,40}salary',
 'elss_lockin': r'\belss\b|lock.?in',
 'amount_too_high': r"too (much|high|big)|(can'?t|cannot|couldn'?t) afford|reduce (the |my )?(sip )?amount|lower (the |my )?amount|decrease (the |my )?(sip|amount)",
 'unnoticed_or_auto_cancel': r"(didn'?t|did not) (know|notice|realis|realiz)|without (my )?(knowledge|inform|notif)|auto.?cancel|got cancell?ed|cancell?ed automatically|automatically cancell?ed|(3|three) (failed|missed|consecutive)",
 'money_status_allotment': r'not allot|units not|money (got )?deducted|debited but|amount deducted|not reflect|not credited|stuck',
 'xirr': r'xirr',
 'fd_rd_comparison': r'\bfd\b|\bfds\b|fixed deposit|\brd\b|recurring deposit',
 'goal_mention': r'\bgoal',
 'restart_resume': r'restart|resume|start (it )?again',
 'market_fall_words': r'crash|correction|market (fall|fell|down|dip)|red\b',
 'pause_skip_words': r'\bpause|\bskip',
}
pat = {k: re.compile(p) for k, p in CLAIMS.items()}
seen = set(); cnt = {g: collections.Counter() for g in ('stop', 'consider', 'cont')}; n = collections.Counter()
by_src = collections.defaultdict(collections.Counter); nsrc = collections.Counter()
month_routes = collections.defaultdict(collections.Counter); month_n = collections.Counter()
with gzip.open(ROOT / 'data/processed/v1.10/analysis_v2.jsonl.gz', 'rt', encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        if r['uid'] in seen: continue
        seen.add(r['uid'])
        if r.get('targeted') or not is_early_journey(r): continue
        g = grp(r.get('action_strict'))
        if g == 'none': continue
        n[g] += 1
        t = ev_text(r)
        sg = 'appreviews' if r['source_group'] in ('playstore', 'appstore') else ('reddit' if r['source_group'].startswith('reddit') else r['source_group'])
        nsrc[(g, sg)] += 1
        for k, p in pat.items():
            if p.search(t):
                cnt[g][k] += 1; by_src[(g, sg)][k] += 1
        if g == 'stop':
            p_ = r.get('posted') or 'unknown'
            win = 'mar_may_2026' if p_ in ('2026-03', '2026-04', '2026-05') else ('unknown' if p_ == 'unknown' else 'other_months')
            month_n[win] += 1
            for x in routes(r): month_routes[win][x] += 1
out = {'note': 'counts of E stories whose engine evidence text (quote + verbatim spans) matches; lower bound; unweighted',
       'n': dict(n),
       'claims': {k: {g: {'k': cnt[g][k], 'share': round(cnt[g][k] / n[g], 4)} for g in cnt} for k in CLAIMS},
       'by_source': {f'{g}|{s}': {'n': nsrc[(g, s)], **{k: by_src[(g, s)][k] for k in CLAIMS}} for (g, s) in nsrc if nsrc[(g, s)] >= 30},
       'stop_routes_by_window': {w: {'n': month_n[w], **{x: round(c / month_n[w], 3) for x, c in month_routes[w].most_common()}} for w in month_n},
       'patterns': CLAIMS}
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
for k in CLAIMS: print(f"{k:28s}", {g: f"{cnt[g][k]}/{n[g]} ({cnt[g][k]/n[g]:.1%})" for g in ('stop','consider','cont')})
print(json.dumps(out['stop_routes_by_window'], indent=0))
