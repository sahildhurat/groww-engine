"""Extracts the full-exit evidence from the research repo's reports/analysis/problem_evidence_v1.json (made by
analysis/problem_evidence_v1.py) into reports/analysis/exit_evidence_v1.json for this site. It copies the 'exits',
'money_anatomy', 'lapses_total' and 'cash_exits' blocks unchanged and records the source file's sha256. The interview
block ('iv') and the other blocks are left out on purpose: interviews are not part of this engine.
Usage: python -I tools/extract_exit_evidence.py <problem_evidence_v1.json> <out.json>
"""
import hashlib, json, sys
src, out = sys.argv[1], sys.argv[2]
raw = open(src, 'rb').read()
d = json.loads(raw)
res = {'source_file': 'reports/analysis/problem_evidence_v1.json (research repo)', 'source_sha256': hashlib.sha256(raw).hexdigest(),
       'definition': "Full exits = re-read action stopped_all, lapsed_payment or switched_platform. 'cause' shares leave out money-led exits "
                     "that state no cause of stopping (money not yet back, unwanted or confused debit), as problem_evidence_v1.py does.",
       **{k: d[k] for k in ('exits', 'money_anatomy', 'lapses_total', 'cash_exits')}}
json.dump(res, open(out, 'w', encoding='utf-8'), indent=1, sort_keys=True)
print('ok', res['source_sha256'][:16])
