"""Shared definitions for Part 1 analysis and dashboard (SPEC-05 §2)."""

from __future__ import annotations

import json
import math
from typing import Any

STOP = {'stopped_or_cancelled', 'redeemed_withdrew', 'lapsed_failed_debit', 'skipped_or_paused', 'reduced_amount'}
CONT = {'continued', 'continued_with_friction', 'increased_or_stepped_up', 'restarted'}

AREAS = {
    'A_first_debit_and_autopay': 'Payment reliability in the first months: failed or missed first debits, AutoPay/mandate set-up and failures, SIP date confusion',
    'B_money_status_and_resolution': 'Where is my money / order status, and support that resolves (money stuck, units not allotted, tickets closed unresolved)',
    'C_returns_expectations': 'Expectations vs what they see: negative or flat returns, confusing numbers, why negative, is this normal',
    'D_cash_flow_flex': 'Cash-flow shocks: cash crunch, income change, life events; affordability',
    'E_sip_control': 'Control of the SIP: skip, pause, edit, cancel - finding it and having it work',
}


def v(x: Any) -> Any:
    if isinstance(x, dict):
        x = x.get('v')
    if isinstance(x, (dict, list)):
        return json.dumps(x, sort_keys=True)
    return x


def lst(x: Any) -> list[Any]:
    if isinstance(x, str):
        try:
            x = json.loads(x)
        except Exception:
            return []
    if isinstance(x, dict):
        return [x]
    return x if isinstance(x, list) else []


def known(x: Any) -> bool:
    return x not in (None, 'unknown', 'u', '', 'none_stated')


def wilson(k: float, n: float, z: float = 1.96) -> list[float | None]:
    if n <= 0:
        return [None, None]
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(max(p * (1 - p) / n + z * z / (4 * n * n), 0)) / d
    return [round(max(0.0, c - h), 4), round(min(1.0, c + h), 4)]


def diff_ci(p1: float, n1: float, p2: float, n2: float) -> list[float | None]:
    if not n1 or not n2:
        return [None, None]
    se = math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
    d = p1 - p2
    return [round(d - 1.96 * se, 4), round(d + 1.96 * se, 4)]


def mdiff(a: str, b: str) -> int | None:
    try:
        return (int(b[:4]) - int(a[:4])) * 12 + int(b[5:7]) - int(a[5:7])
    except Exception:
        return None


def grp(a: str | None) -> str:
    return 'stop' if a in STOP else 'cont' if a in CONT else 'consider' if a == 'considered_stopping' else 'none'


def is_early_journey(r: dict[str, Any]) -> bool:
    ft = v(r.get('first_time_status')) in ('stated', 'likely') or r.get('gate_ft') in ('s', 'l')
    m = []
    if isinstance(r.get('months_at_action'), (int, float)):
        m.append(r['months_at_action'])
    mb = r.get('months_bucket')
    if mb in ('0-3', '4-6', '7-12'):
        m.append(6)
    elif mb in ('13-24', '25+'):
        m.append(24)
    ms = v(r.get('months_since_start'))
    if isinstance(ms, (int, float)):
        m.append(ms)
    fsm = v(r.get('first_sip_month')) if r.get('first_sip_month') else None
    if fsm and r.get('posted', 'unknown') != 'unknown':
        d = mdiff(fsm, r['posted'])
        if d is not None and d >= 0:
            m.append(d)
    early = bool(m) and min(m) <= 12
    late = bool(m) and min(m) > 12
    return (ft or early) and not late


def routes(r: dict[str, Any], ex: list[Any] | None = None, tr: list[Any] | None = None, ev: list[Any] | None = None, a: str | None = None) -> set[str]:
    if ex is None:
        ex = [v(x) for x in lst(r.get('experience'))]
    if tr is None:
        tr = [v(x) for x in lst(r.get('triggers'))] or ([v(r.get('trigger_primary'))] if known(v(r.get('trigger_primary'))) else [])
    if ev is None:
        ev = [v(x) for x in lst(r.get('events'))]
    if a is None:
        a = r.get('action_strict')

    out = set()
    if a == 'lapsed_failed_debit' or 'payment_problem' in ex or 'payment_mandate_problem' in tr or 'payment_failed' in ev or 'first_debit_or_gap' in ev:
        out.add('payment_lapse')
    if 'app_problem' in ex or set(tr) & {'app_issue_or_ux', 'confusion_product_or_app', 'trust_concern_platform'} or 'confused_in_app' in ev:
        out.add('app_friction')
    if set(ex) & {'negative_returns', 'flat'} or set(tr) & {'returns_disappointing', 'market_fall_news'} or 'saw_loss_or_flat' in ev:
        out.add('returns_disappointment')
    if set(tr) & {'cash_crunch_expense', 'income_change'} or 'life_event_or_cash_need' in ev:
        out.add('cash_flow')
    if set(tr) & {'fees_tax_exit_load'}:
        out.add('costs_tax')
    if set(tr) & {'advice_from_someone', 'influencer_or_media'} or 'advice_received' in ev:
        out.add('advice_external')
    return out or {'not_stated'}


def areas(r: dict[str, Any]) -> set[str]:
    ex = {v(x) for x in lst(r.get('experience'))}
    tr = {v(x) for x in lst(r.get('triggers'))} | {v(r.get('trigger_primary'))}
    ev = {v(x) for x in lst(r.get('events'))}
    cf = {v(x) for x in lst(r.get('in_app_confusion'))}
    ti = [json.loads(v(x)) if isinstance(v(x), str) and v(x).startswith('{') else {} for x in lst(r.get('tried_in_app'))]
    th = set((r.get('themes_unmet') or []) + (r.get('themes_whh') or []))
    out = set()
    if 'payment_problem' in ex or 'payment_mandate_problem' in tr or ev & {'payment_failed', 'first_debit_or_gap'} or cf & {'autopay_mandate', 'sip_date_first_debit'} or 'C06' in th:
        out.add('A_first_debit_and_autopay')
    if cf & {'where_money_went', 'order_status_units'} or any(t.get('feature') == 'customer_support' and t.get('stage') in ('not_resolved', 'could_not_access') for t in ti) or th & {'C03', 'C04', 'C07'}:
        out.add('B_money_status_and_resolution')
    if ex & {'negative_returns', 'flat', 'confusing_numbers'} or tr & {'returns_disappointing', 'market_fall_news'} or 'saw_loss_or_flat' in ev or cf & {'returns_calculation', 'why_negative'} or 'C02' in th:
        out.add('C_returns_expectations')
    if tr & {'cash_crunch_expense', 'income_change'} or 'life_event_or_cash_need' in ev or 'C12' in th:
        out.add('D_cash_flow_flex')
    if 'skip_pause_cancel' in cf or any(t.get('feature') in ('edit_sip', 'cancel', 'skip', 'pause') and t.get('stage') in ('could_not_access', 'not_resolved') for t in ti) or 'C05' in th:
        out.add('E_sip_control')
    return out

