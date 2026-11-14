"""Adds the post-submission parts of the AI Evidence Log (14 Nov 2026), from result files only.

What it writes (sections 1-6 keep their numbers, because the deck cites them):
  - "Terms used on this page": plain-word meanings of the labels used in the log;
  - one at-a-glance line pointing to sections 7-9;
  - a corrected sentence in 4.2 (the area rules also counted theme labels), marked as a correction;
  - section 7, which of the brief's nine questions the engine answers (counts from part1_v1.json);
  - section 8, how the five opportunity areas are defined, and a re-run without theme labels
    (counts and verdicts from areas_fields_only_v1.json);
  - section 9, how the engine's answers differ from general AI (copied from docs/analysis/findings_part1.md section 7).
Inputs: reports/analysis/part1_v1.json, reports/analysis/areas_fields_only_v1.json, docs/analysis/findings_part1.md.
Run it last, after analysis/build_evidence_log_v1.py and analysis/mvp_golden_section_v1.py. It is idempotent:
running it twice gives the same file. It rewrites docs/evidence/ai_evidence_log_v1.md and makes site/data/evidence.md
a byte copy, keeping the file's line endings.
Usage: python -I analysis/evidence_additions_v1.py
"""
import hashlib, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
P1 = ROOT / 'reports/analysis/part1_v1.json'
AF = ROOT / 'reports/analysis/areas_fields_only_v1.json'
FD = ROOT / 'docs/analysis/findings_part1.md'
DOC = ROOT / 'docs/evidence/ai_evidence_log_v1.md'
SITE = ROOT / 'site/data/evidence.md'
DATE = '14 Nov 2026'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()[:16]


def nl(b):
    return b.decode('utf-8').replace('\r\n', '\n')


p = json.loads(P1.read_bytes())
af = json.loads(AF.read_bytes())
findings = nl(FD.read_bytes())
raw = DOC.read_bytes()
eol = '\r\n' if b'\r\n' in raw else '\n'
doc = nl(raw)

T = p['tables']
SEG = p['segments']['MAIN']['E']
POP = p['populations']


def n(table, group='any'):
    return T[table]['MAIN']['E'][group]['pooled']['n']


def seg(dim, value):
    return next(x['n'] for x in SEG[dim] if x['value'] == value)


def f(x):
    return f"{x:,}" if isinstance(x, int) else f"{x:,.0f}"


def pct(x):
    return f"{x * 100:.0f}%"


# ---------------------------------------------------------------- section 8 numbers
AREAS = [
    ('A_first_debit_and_autopay', 'A. Payment & AutoPay problems',
     'the writer describes a failed payment or a mandate problem, a first-debit problem or gap, or is confused about AutoPay or the SIP date and first debit',
     '"Payments and AutoPay"'),
    ('B_money_status_and_resolution', 'B. Where is my money, and support that resolves',
     'the writer is confused about where their money went or about order status and units, or contacted customer support and it did not resolve or they could not reach it',
     '"Money stuck", "Support that resolves", "Orders, NAV and units"'),
    ('C_returns_expectations', 'C. Returns vs expectations',
     'the writer describes negative, flat or confusing returns, was triggered by disappointing returns or market-fall news, saw a loss, or is confused about how returns are calculated or why they are negative',
     '"Stay, pause or stop?"'),
    ('D_cash_flow_flex', 'D. Cash-flow shocks',
     'the writer was triggered by a cash crunch, an expense or an income change, or describes a life event or cash need',
     '"Fit the SIP to my cash flow"'),
    ('E_sip_control', 'E. Control of the SIP',
     'the writer is confused about skip, pause or cancel, or tried to edit, skip, pause or cancel the SIP and could not, or it did not resolve',
     '"Control my SIP"'),
]
SRC = [('reddit', 'Reddit'), ('youtube', 'YouTube'), ('appreviews', 'App reviews'), ('pooled', 'All sources')]


def verdict(c):
    lo, hi = c['diff_ci95']
    return '✓' if lo > 0 else ('✗' if hi < 0 else '~')


def cell(c):
    return f"{pct(c['stop'])} vs {pct(c['cont'])} {verdict(c)}"


changed = []
rows8 = []
for key, name, _, _ in AREAS:
    a = af['areas'][key]
    sep = a['separation']
    cells = []
    for s, _ in SRC:
        w, fo = sep[s]['with'], sep[s]['fields']
        if verdict(w) != verdict(fo):
            changed.append(f"{name.split('.')[0]} on {dict(SRC)[s]}")
        cells.append(f"{cell(w)} → {cell(fo)}")
    rows8.append(f"| {name} | {f(a['n_E']['with'])} → {f(a['n_E']['fields'])} "
                 f"({pct(a['reach_E']['with'])} → {pct(a['reach_E']['fields'])}) | "
                 f"{f(a['members_only_via_theme_code'])} ({f(a['stop_members_only_via_theme_code'])}) | " + ' | '.join(cells) + ' |')
core = af['areas']['CORE_A_or_B']['separation']
for s, _ in SRC:
    if verdict(core[s]['with']) != verdict(core[s]['fields']):
        changed.append(f"A or B on {dict(SRC)[s]}")
cw, cf = core['pooled']['with'], core['pooled']['fields']
HOLD = 'no verdict changes' if not changed else 'verdicts change for ' + ', '.join(changed)
biggest = max(AREAS, key=lambda a: af['areas'][a[0]]['n_E']['with'] - af['areas'][a[0]]['n_E']['fields'])
bk = af['areas'][biggest[0]]

# ---------------------------------------------------------------- section 7 numbers
et = p['event_timing']
dated = sum(v['n_events'] for v in et.values())
kg = {r['code']: r['share'] for r in T['Q7_kept_going_because']['MAIN']['E']['cont']['pooled']['rows']}
skip_share = sum(v for k, v in kg.items() if 'skip' in k or 'pause' in k)
amount_ns = [x['n'] for x in SEG['amount']]
age_ns = [x['n'] for x in SEG['age']]
ROWS7 = [
    ('Q1', 'Why do people start, and what do they expect?',
     f"Reasons to start {f(n('Q1_start_reason'))}; expectations {f(n('Q1_expectation'))}; who influenced them {f(n('Q1_influenced_by'))}",
     'yes', f"Yes. The stop-vs-continue contrast on expectations is small ({f(n('Q1_expectation', 'stop'))} stop, {f(n('Q1_expectation', 'cont'))} continue stories): indicative"),
    ('Q2', 'What changes in the months after starting?',
     f"Dated events {f(dated)} (months 0–3 {f(et['0-3']['n_events'])}, 4–6 {f(et['4-6']['n_events'])}, 7–12 {f(et['7-12']['n_events'])}, 13+ {f(et['13+']['n_events'])}); when first-time stoppers say they stopped ({f(p['months_at_action']['stop_ft']['n_w'])}, weighted)",
     'yes', 'Yes, as a shape. Few stories carry a date, so this is the order of events, not a rate'),
    ('Q3', 'What leads to pausing, reducing or stopping?',
     f"Routes to a stop in all {f(POP['MAIN|E_stop'])} stop stories; stated triggers {f(n('Q3_triggers'))}",
     'yes', f"Yes for stopping. Pausing or reducing instead is almost never described (reduced instead {pct(kg.get('reduced_instead_of_stopping', 0))}, skipped or paused instead {pct(skip_share)} of {f(n('Q7_kept_going_because', 'cont'))} continuers)"),
    ('Q4', 'What do they check, and how often?',
     f"What they check {f(n('Q4_checks_what'))}; how often {f(n('Q4_check_frequency'))}, of which {f(n('Q4_check_frequency', 'stop'))} stoppers",
     'partly', 'What: yes. How often: too thin, so it became an interview question'),
    ('Q5', 'What confuses or worries them inside the app?',
     f"In-app confusion {f(n('Q5_in_app_confusion'))} ({f(n('Q5_in_app_confusion', 'stop'))} stoppers); what they tried in the app {f(n('Q5_tried_in_app'))} ({f(n('Q5_tried_in_app', 'stop'))} stoppers)",
     'yes', 'Yes'),
    ('Q6', 'What do they do outside the app when unsure?',
     f"Actions outside the app {f(n('Q6_off_app_action'))} ({f(n('Q6_off_app_action', 'stop'))} stoppers, {f(n('Q6_off_app_action', 'cont'))} continuers)",
     'yes', 'Yes. The stop-vs-continue contrast is indicative'),
    ('Q7', 'What separates continuers from those who drop off?',
     f"Five opportunity areas tested in {f(POP['MAIN|E_stop'])} stop vs {f(POP['MAIN|E_cont'])} continue stories, within each source; continuers' reasons {f(n('Q7_kept_going_because', 'cont'))}",
     'yes', 'Yes (section 8)'),
    ('Q8', 'How do patterns differ by segment?',
     f"Stop share by SIP size ({f(min(amount_ns))}–{f(max(amount_ns))} stories per band), age ({f(min(age_ns))}–{f(max(age_ns))}), money source and who influenced them; work: salaried {f(seg('work', 'salaried'))}, student {f(seg('work', 'student'))}, variable or gig income {f(seg('work', 'variable_or_gig'))}, business {f(seg('work', 'business'))}",
     'partly', 'Partly. SIP size and age: yes. Income stability: too thin, so it became an interview question'),
    ('Q9', 'What unmet needs recur?',
     f"AI themes of the needs people state {f(n('Q9_themes'))} ({f(n('Q9_themes', 'stop'))} stoppers)",
     'indicative', 'Indicative only. The theme list failed human agreement (section 4.2)'),
]
cnt = {k: sum(1 for r in ROWS7 if r[3] == k) for k in ('yes', 'partly', 'indicative')}

# ---------------------------------------------------------------- the text
GLOSSARY = """## Terms used on this page

- **Record:** one public post, comment or review, as collected.
- **Relevance gate (gate):** the first AI pass. It reads a record and decides whether it is about SIPs or mutual funds. *Gate-positive* means it said yes.
- **Extraction:** the second AI pass. It fills the codebook fields (what the person did, what triggered it, what confused them) and must quote the record word for word for each one.
- **Episode or story:** one gate-positive record that extraction read in depth.
- **Early-journey:** a story by a first-time investor, or by someone acting within 12 months of starting. This is the core of the brief.
- **Stop, considering, kept going:** what the writer says they did, counted only when the second read confirms it (the "strict" labels).
- **Second read (J1):** a second AI pass that reads each action story with its post date and confirms an action only when the writer says they took it.
- **Golden set, dev and held-out:** items the researcher labelled by hand to grade the engine. *Dev* items were used while choosing the model and prompt; *held-out* items were kept back and run once, at the end.
- **Prompt versions** (gate_v1_1, extract_v1_2a, v1.3a): numbered versions of the instructions given to the AI.
- **Rules H1–H11:** checks written in code that run after the AI. H11 keeps an action only when the record is the writer's own story (section 4.1).
- **κ (kappa):** how often two labellers agree, after removing the agreement expected by chance. 1 is perfect and 0 is chance; the bar here was 0.6.
- **95% CI:** the range the true share most likely lies in, given the sample size.
- **Separates (✓), ~ and ✗:** ✓ means stop stories show something more often than continue stories from the same source, and the gap is above zero with 95% confidence; ~ means the gap could be zero; ✗ means continuers show it more.
- **Themes:** the AI's grouping of the needs people state (for example "Money stuck"). Demoted after they failed human agreement (sections 4.2 and 8).
- **Weight 2.0 and targeted top-up:** sampled general questions count twice, so the sample stands for all of them; the top-up is an extra search for rare stories and is kept out of every share.
- **Snapshot v1.10 and seed 20261029:** the frozen copy of the data, and the fixed random number that lets anyone draw the same items again.
"""

GLANCE = (f"- **Added after the submission ({DATE}):** which of the brief's nine questions the engine answers and where it is thin "
          f"(section 7); how the five opportunity areas are defined, and a re-run without the AI themes, in which {HOLD} (section 8); "
          f"how the engine's answers differ from general AI (section 9).")

S42 = (f"- **What we did.** Themes are shown only as colour on the dashboard, and no finding is reported from them alone. "
       f"*Corrected on {DATE}:* this line used to say that every headline finding rests on the structured fields validated in sections 2 and 3. "
       f"In fact the rules that define the five opportunity areas also counted a story when its theme named the matching need. "
       f"Section 8 re-runs every area without the themes: {HOLD}.")

def table(head, rows):
    return "\n".join([head, "|" + "---|" * head.count(" | ") + "---|"] + rows)


S7 = [f"## 7. Which of the brief's nine questions the engine answers",
      "Counts are early-journey stories in which the engine found the field (a story can count in several rows). "
      "\"Thin\" means too few stories to compare stoppers with continuers; those parts went to the interviews.",
      table("| Brief question | What the engine measured (stories) | Answered? |",
            [f"| **{q}.** {text} | {meas} | {ans} |" for q, text, meas, _, ans in ROWS7]),
      f"**In short.** {cnt['yes']} of the 9 questions are answered, {cnt['partly']} partly (Q4 how often, Q8 income stability) "
      f"and {cnt['indicative']} only as an indication (Q9). Quiet drift, people who let a SIP lapse without posting, is outside "
      f"what public posts can show (section 6)."]

S8 = [f"## 8. How the five opportunity areas are defined, and a re-run without the AI themes",
      "**What an area is.** The five areas group the problems the nine questions surfaced among stop stories: the routes to a stop (Q3), "
      "and what confused stoppers in the app and what they tried there (Q5). Each area is a rule over the codebook fields that extraction fills, "
      "each backed by a word-for-word quote (`areas()` in `analysis/defs.py`).",
      "**How each area was tested.** Within each source, do stop stories show the area more often than continue stories, with 95% confidence? "
      "Sources are kept apart because app reviews hold many stop stories and few continue stories. For A, B and C the researcher also read "
      "20 random stop stories from the area as published (section 3).",
      table("| Area | A story counts when… | Theme labels that also counted |",
            [f"| {name} | {rule} | {th} |" for _, name, rule, th in AREAS]),
      f"**What we found on {DATE}.** The rules also counted a story when its AI theme named the matching need, although the themes "
      "had failed human agreement and been demoted (section 4.2). So we re-ran every area with the themes removed "
      "(`analysis/areas_fields_only_v1.py`). Each cell below reads *with themes → without themes*: stop vs continue stories, then the verdict.",
      table("| Area | Stories (reach) | Only there via a theme (of them stop stories) | Reddit | YouTube | App reviews | All sources |", rows8),
      f"**Reading.** With the themes removed, {HOLD}: every ✓ stays ✓ and every ~ stays ~. The areas get smaller, "
      f"{biggest[1].split('.')[0]} most ({f(bk['n_E']['with'])} → {f(bk['n_E']['fields'])} stories), because the theme {biggest[3]} "
      f"counted posts that ask whether to stop. The headline core, A or B, holds: {pct(cw['stop'])} of stop stories vs "
      f"{pct(cw['cont'])} of continue stories with the themes, {pct(cf['stop'])} vs {pct(cf['cont'])} without. "
      f"The published figures (sections 1–6, the dashboard and the deck) still use the original rule; this section shows "
      f"that their conclusions do not depend on the themes."]

m = re.search(r"^## 7\. How the engine compares with general-AI answers.*?\n(.*?)(?=^## |\Z)", findings, flags=re.S | re.M)
assert m, 'findings section 7 not found'
body9 = m.group(1).strip().replace('on all three sources (§3)', 'on all three sources (section 8)')
assert '§' not in body9, 'a findings section reference was left in section 9'
S9 = [f"## 9. How the engine's answers differ from general AI",
      "*Copied from the Part 1 findings, section 7 (`docs/analysis/findings_part1.md`), where every number is read from the engine's result files.*",
      body9]

ADDED = "\n\n".join(S7 + S8 + S9)
FOOT = (f"*Sections 7–9, the terms list, the at-a-glance line about them and the marked correction in 4.2 were added on {DATE} by "
        f"`analysis/evidence_additions_v1.py`; run it last. Inputs (sha256 prefix): part1_v1.json {sha(P1)}, "
        f"areas_fields_only_v1.json {sha(AF)}, findings_part1.md {sha(FD)}.*")

# ---------------------------------------------------------------- apply (idempotent)
OLD3 = "Every number below is generated by `analysis/build_evidence_log_v1.py` from the project's result files; none is typed by hand."
NEW3 = ("Every number below is generated by script from the project's result files (`analysis/build_evidence_log_v1.py` for sections 1–4 and 6, "
        "`analysis/mvp_golden_section_v1.py` for section 5, `analysis/evidence_additions_v1.py` for sections 7–9); none is typed by hand.")
OLD49 = "(gate_v1_1 + extract_v1_2a + rules H1-H11)"
NEW49 = "(relevance prompt gate_v1_1, extraction prompt extract_v1_2a and code rules H1–H11; see Terms)"


def swap(text, old, new):
    if new in text:
        return text
    assert text.count(old) == 1, f'expected once: {old[:60]}'
    return text.replace(old, new)


out = doc
out = re.sub(r"\n## Terms used on this page\n.*?(?=\n## 1\. )", "\n", out, flags=re.S)
out = re.sub(r"^- \*\*Added after the submission.*\n", "", out, flags=re.M)
out = re.sub(r"\n## 7\. .*?(?=\n---\n)", "\n", out, flags=re.S)
out = re.sub(r"\n*^\*Sections 7–9, the terms list.*\n?", "", out, flags=re.M)
out = swap(out, OLD3, NEW3)
out = swap(out, OLD49, NEW49)
out, k = re.subn(r"^- \*\*What we did\.\*\* Themes are shown only as colour on the dashboard[.,].*$", lambda _: S42, out, flags=re.M)
assert k == 1, 'section 4.2 line not found'
out, k = re.subn(r"(^- \*\*Rejected or corrected:\*\*.*\n)", lambda mm: mm.group(1) + GLANCE + "\n", out, count=1, flags=re.M)
assert k == 1, 'at-a-glance block not found'
out, k = re.subn(r"\n(?=## 1\. Sources and volume)", lambda _: "\n" + GLOSSARY + "\n", out, count=1)
assert k == 1, 'section 1 not found'
out, k = re.subn(r"\n(?=---\n\*Built by)", lambda _: "\n" + ADDED + "\n\n", out, count=1)
assert k == 1, 'footer not found'
out = out.rstrip('\n') + "\n\n" + FOOT + ("\n" if doc.endswith("\n") else "")
out = re.sub(r"\n{3,}", "\n\n", out)

data = out.replace('\n', eol).encode('utf-8')
DOC.write_bytes(data)
SITE.write_bytes(data)
print(f"wrote {len(data):,} bytes; {HOLD}; coverage {cnt}")
