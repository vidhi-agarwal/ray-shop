"""Deterministic money and policy rules. No LLM in this file.

The agent reads messy messages and photos. Every price, total, advance, delivery fee, capacity
check and payment verification is computed here, so the model cannot invent a number."""
from __future__ import annotations

import math
import re
from datetime import date, timedelta, datetime
from typing import Any


def inr(v: float) -> str:
    n = int(round(v))
    s = str(abs(n))
    if len(s) > 3:
        head, tail, groups = s[:-3], s[-3:], []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        s = ",".join(groups) + "," + tail
    return ("-" if n < 0 else "") + s


def rs(v: float) -> str:
    return f"Rs {inr(v)}"


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


# ------------------------------------------------------------------ catalogue

def validate_catalogue(items: list[dict]) -> list[str]:
    problems = []
    names = set()
    for i, it in enumerate(items):
        name = (it.get("name") or "").strip()
        if not name:
            problems.append(f"item {i + 1} has no name")
        if norm(name) in names:
            problems.append(f"'{name}' appears twice")
        names.add(norm(name))
        p = it.get("price")
        if not isinstance(p, (int, float)) or p <= 0 or p > 100000:
            problems.append(f"'{name}' needs a price in rupees (got {p!r})")
        ex = it.get("eggless_extra")
        if ex is not None and (not isinstance(ex, (int, float)) or ex < 0):
            problems.append(f"'{name}' eggless_extra must be a number or null")
    return problems


TYPES = {"cupcake", "cake", "jar", "hamper"}
STOP = {"box", "of", "the", "a", "an", "kg", "pack", "pcs", "piece", "pieces", "and", "with"}


def _words(s: str) -> set[str]:
    out = set()
    for w in norm(s).split():
        if w.isdigit():
            continue
        if w.endswith("es") and w[:-2] in {"box"}:
            w = w[:-2]
        elif w.endswith("s") and len(w) > 3:
            w = w[:-1]
        if w not in STOP:
            out.add(w)
    return out


def match_item(catalogue: list[dict], query: str) -> tuple[dict | None, list[dict]]:
    """Find a catalogue item by sku or name. A cake never matches cupcakes, and so on."""
    q = norm(query)
    for c in catalogue:
        if q == norm(c["sku"]) or q == norm(c["name"]):
            return c, [c]
    qw = _words(query)
    qtype = qw & TYPES
    scored = []
    for c in catalogue:
        cw = _words(c["name"])
        if qtype and not (qtype & cw):
            continue
        overlap = len((qw - TYPES) & cw) + len(qtype & cw)
        if overlap:
            scored.append((overlap, c))
    scored.sort(key=lambda x: -x[0])
    if qtype and not (qw - TYPES) and len(scored) == 1:
        return scored[0][1], [scored[0][1]]
    if scored and (len(scored) == 1 or scored[0][0] > scored[1][0]) and len((qw - TYPES) & _words(scored[0][1]["name"])) > 0:
        return scored[0][1], [s[1] for s in scored]
    return None, [s[1] for s in scored] or list(catalogue)


# ------------------------------------------------------------------ quote

def zone_for(merchant: dict, area: str | None) -> dict | None:
    if not area:
        return None
    a = norm(area)
    for z in merchant["delivery_zones"]:
        for x in z["areas"]:
            if norm(x) in a or a in norm(x):
                return z
    return None


def quote(merchant: dict, catalogue: list[dict], booked_units: dict[str, float], req: dict, today: date) -> dict:
    """Price an order request. Returns lines, totals and issues. Blocking issues stop the payment link."""
    pol = merchant["policies"]
    issues: list[dict] = []
    lines = []
    units = 0.0
    for it in req.get("items") or []:
        c, cands = match_item(catalogue, it.get("item", ""))
        qty = int(it.get("qty") or 0)
        if qty <= 0:
            issues.append({"level": "block", "code": "qty", "message": f"Quantity for '{it.get('item')}' is missing."})
            continue
        if not c:
            names = ", ".join(x["name"] for x in cands) or "nothing similar"
            issues.append({"level": "block", "code": "not_on_menu",
                           "message": f"'{it.get('item')}' is not on the menu (closest: {names}). Ask the customer or the seller."})
            continue
        eggless = bool(it.get("eggless"))
        extra = 0
        if eggless:
            if c.get("eggless_extra") is None:
                issues.append({"level": "block", "code": "no_eggless",
                               "message": f"{c['name']} has no eggless option on the menu."})
            else:
                extra = c["eggless_extra"]
        unit_price = c["price"] + extra
        lines.append({"sku": c["sku"], "name": c["name"], "pack": c.get("pack"), "qty": qty, "eggless": eggless,
                      "unit_price": unit_price, "amount": unit_price * qty})
        units += float(c.get("units", 1)) * qty

    fulfilment = req.get("fulfilment") or "delivery"
    fee = 0
    zone = None
    if fulfilment == "delivery":
        zone = zone_for(merchant, req.get("area"))
        if not req.get("area"):
            issues.append({"level": "block", "code": "no_area", "message": "Delivery area is missing."})
        elif not zone:
            issues.append({"level": "block", "code": "outside_zone",
                           "message": f"{req.get('area')} is outside the delivery areas. Offer pickup from {merchant['base_area']}."})
        else:
            fee = zone["fee"]

    d = None
    try:
        d = date.fromisoformat(req.get("date") or "")
    except ValueError:
        issues.append({"level": "block", "code": "no_date", "message": "Delivery date is missing or unclear."})
    if d:
        lead = (d - today).days
        if lead < 0:
            issues.append({"level": "block", "code": "past_date", "message": f"{d} is in the past."})
        elif lead < pol["lead_days"]:
            issues.append({"level": "warn", "code": "short_notice",
                           "message": f"Only {lead} day(s) notice; Meera asks for {pol['lead_days']}. She must agree."})
        already = booked_units.get(d.isoformat(), 0)
        if already + units > pol["daily_capacity_units"]:
            issues.append({"level": "block", "code": "capacity",
                           "message": f"{d} already has {already:g} of {pol['daily_capacity_units']} oven slots booked; "
                                      f"this order needs {units:g}. Suggest another day or split it."})

    subtotal = sum(li["amount"] for li in lines)
    total = subtotal + fee
    due_now = total if total <= pol["advance_threshold"] else math.ceil(total * pol["advance_percent"] / 100)
    return {
        "customer": req.get("customer"), "channel": req.get("channel"), "lines": lines,
        "fulfilment": fulfilment, "area": req.get("area"), "zone": zone["name"] if zone else None,
        "date": d.isoformat() if d else None, "time": req.get("time"), "notes": req.get("notes"),
        "subtotal": subtotal, "delivery_fee": fee, "total": total, "due_now": due_now,
        "balance_later": total - due_now, "units": units,
        "capacity_after": (booked_units.get(d.isoformat(), 0) + units) if d else None,
        "issues": issues, "can_send_link": not any(i["level"] == "block" for i in issues) and bool(lines),
    }


# ------------------------------------------------------------------ payments

def parse_amount(v: Any) -> float | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = re.sub(r"[^0-9.]", "", str(v))
    return float(s) if s else None


def verify_screenshot(order: dict, link_status: dict, claimed: dict) -> dict:
    """Compare what a screenshot claims with what Razorpay actually recorded for the order."""
    amount = parse_amount(claimed.get("amount"))
    utr = re.sub(r"\D", "", str(claimed.get("utr") or ""))
    payments = link_status.get("payments") or []
    paid = link_status.get("amount_paid", 0) / 100 if link_status.get("amount_paid") else 0
    reasons = []
    match = None
    for p in payments:
        if utr and utr == re.sub(r"\D", "", str(p.get("utr") or "")):
            match = p
    if match:
        if amount is not None and abs(match["amount"] / 100 - amount) > 1:
            reasons.append(f"Razorpay has this UPI reference but for {rs(match['amount'] / 100)}, not {rs(amount)}.")
            verdict = "mismatch"
        else:
            verdict = "matches"
            reasons.append(f"Razorpay received {rs(match['amount'] / 100)} with this UPI reference.")
    elif paid > 0:
        verdict = "paid_differently"
        reasons.append(f"Razorpay shows {rs(paid)} paid for this order, but not with the reference on the screenshot.")
    else:
        verdict = "not_received"
        reasons.append(f"Razorpay shows no payment for {order['id']}. The payment link is still unpaid.")
        if utr:
            reasons.append(f"No payment with UPI reference {utr} has reached Meera's account.")
    if amount is not None and abs(amount - order["due_now"]) > 1 and verdict != "matches":
        reasons.append(f"The screenshot shows {rs(amount)}; the amount due is {rs(order['due_now'])}.")
    return {"order_id": order["id"], "verdict": verdict, "reasons": reasons,
            "safe_to_start": verdict in ("matches", "paid_differently"),
            "claimed": {"amount": amount, "utr": utr or None, "paid_to": claimed.get("paid_to"), "when": claimed.get("when")}}


# ------------------------------------------------------------------ growth

# When a seller is ready for the next Razorpay product. Thresholds are assumptions for the prototype.
NEXT_STEPS = [
    {"id": "website", "product": "Payment Pages shop with her own link", "when": "monthly sales above Rs 50,000 or 100+ orders",
     "test": lambda m: m["last_full_month_sales"] >= 50000 or m["last_full_month_orders"] >= 100},
    {"id": "checkout", "product": "A real website with Razorpay Checkout (Magic Checkout for one-tap address and COD)",
     "when": "monthly sales above Rs 1,00,000 for 2 months", "test": lambda m: m["months_over_1l"] >= 2},
    {"id": "capital", "product": "A small working-capital loan based on her sales history",
     "when": "6 months of steady sales on Razorpay", "test": lambda m: m["months_on_razorpay"] >= 6},
]


def growth(orders: list[dict], customers: list[dict], today: date, since: date) -> dict:
    months: dict[str, dict] = {}
    for o in orders:
        if o["payment_status"] == "unpaid":
            continue
        k = o["placed_at"][:7]
        m = months.setdefault(k, {"month": k, "sales": 0, "orders": 0})
        m["sales"] += o["amount_paid"]
        m["orders"] += 1
    series = [months[k] for k in sorted(months)]
    cur = today.strftime("%Y-%m")
    full = [m for m in series if m["month"] < cur]
    current = months.get(cur, {"sales": 0, "orders": 0})
    days_in = today.day - 1 or 1
    import calendar
    dim = calendar.monthrange(today.year, today.month)[1]
    run_rate = round(current["sales"] / days_in * dim)
    counts: dict[str, int] = {}
    for o in orders:
        counts[o["customer_id"]] = counts.get(o["customer_id"], 0) + 1
    repeat = [c for c in customers if counts.get(c["id"], 0) >= 3]
    reminded = [o for o in orders if o.get("paid_via") == "link_after_reminder"]
    metrics = {
        "series": series,
        "this_month_so_far": current["sales"], "this_month_run_rate": run_rate,
        "last_full_month_sales": full[-1]["sales"] if full else 0,
        "last_full_month_orders": full[-1]["orders"] if full else 0,
        "growth_last_month_pct": round((full[-1]["sales"] / full[-2]["sales"] - 1) * 100) if len(full) >= 2 else None,
        "months_over_1l": sum(1 for m in full if m["sales"] >= 100000),  # finished months only, not this month's pace
        "months_on_razorpay": (today.year - since.year) * 12 + today.month - since.month,
        "customers": len(customers), "repeat_customers": len(repeat),
        "orders_total": len([o for o in orders if o["payment_status"] != "unpaid"]),
        "collected_after_reminder": sum(o["amount_paid"] for o in reminded),
        "orders_paid_after_reminder": len(reminded),
    }
    steps = []
    for s in NEXT_STEPS:
        steps.append({"id": s["id"], "product": s["product"], "when": s["when"], "ready": bool(s["test"](metrics))})
    metrics["next_steps"] = steps
    return metrics


# ------------------------------------------------------------------ menu and customer insights

# Thresholds for the menu advice. Rules, not AI, so the same history always gives the same advice.
TREND_PCT = 25          # same days this month vs last month, beyond this counts as growing or slowing
SMALL_SHARE_PCT = 5     # below this share of item revenue an item is small
ADD_ON_PCT = 40         # if at least this share of an item's orders also had another item, it is an add-on


def insights(orders: list[dict], catalogue: list[dict], today: date) -> dict:
    """What sells, what earns, and what an order is worth, from paid orders.

    Trends compare the same days of this month and last month (1 to yesterday), so a part month is fair.
    """
    paid = [o for o in orders if o["payment_status"] != "unpaid"]
    cat = {c["sku"]: c for c in catalogue}
    upto = today.day - 1 or 1
    cur = today.strftime("%Y-%m")
    prev_month = (today.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
    rows: dict[str, dict] = {}
    for o in paid:
        day = int(o["placed_at"][8:10])
        month = o["placed_at"][:7]
        for li in o["lines"]:
            c = cat.get(li["sku"])
            if not c:
                continue
            r = rows.setdefault(li["sku"], {"sku": li["sku"], "name": c["name"], "units": 0, "revenue": 0, "orders": 0,
                                            "with_other": 0, "last_period": 0, "this_period": 0, "seasonal": bool(c.get("seasonal"))})
            unit = c["price"] + ((c.get("eggless_extra") or 0) if li.get("eggless") else 0)
            r["units"] += li["qty"]
            r["revenue"] += li["qty"] * unit
            r["orders"] += 1
            r["with_other"] += 1 if len(o["lines"]) > 1 else 0
            if day <= upto and month == cur:
                r["this_period"] += li["qty"]
            if day <= upto and month == prev_month:
                r["last_period"] += li["qty"]
    items = sorted(rows.values(), key=lambda r: r["revenue"], reverse=True)
    item_revenue = sum(r["revenue"] for r in items) or 1
    top_units = max(items, key=lambda r: r["units"])["sku"] if items else None
    top_revenue = items[0]["sku"] if items else None
    by_units = [r["sku"] for r in sorted(items, key=lambda r: r["units"], reverse=True)]
    drop, slowing = [], []
    for rank, r in enumerate(items):
        r["share_pct"] = round(r["revenue"] / item_revenue * 100, 1)
        r["change_pct"] = round((r["this_period"] / r["last_period"] - 1) * 100) if r["last_period"] else None
        r["add_on_pct"] = round(r["with_other"] / r["orders"] * 100) if r["orders"] else 0
        tags, advice = [], ""
        if r["sku"] == top_units:
            tags.append("Best seller")
        if r["sku"] == top_revenue:
            tags.append("Most revenue")
        growing = r["change_pct"] is not None and r["change_pct"] >= TREND_PCT
        falling = r["change_pct"] is not None and r["change_pct"] <= -TREND_PCT
        if r["seasonal"]:
            tags.append("Seasonal")
            advice = "Seasonal, too new to judge."
        elif r["share_pct"] < SMALL_SHARE_PCT and (r["change_pct"] or 0) < 0:
            tags.append("Consider dropping")
            advice = "Few sales and falling. A candidate to take off the menu."
            drop.append(r["name"])
        elif falling:
            tags.append("Slowing")
            advice = "Fewer than the same days last month. Feature it in the next offer before dropping it."
            slowing.append(r["name"])
        elif r["share_pct"] < SMALL_SHARE_PCT and r["add_on_pct"] >= ADD_ON_PCT:
            tags.append("Add-on")
            advice = f"Small, but often added to another order ({r['add_on_pct']}% of the time){' and picking up' if growing else ''}. Keep it."
        elif r["sku"] == top_units:
            advice = "Sells the most. Keep oven slots for it."
        elif by_units.index(r["sku"]) > rank:
            advice = f"Sells fewer, earns more: {r['share_pct']:g}% of item revenue from {r['units']} sold."
        elif growing:
            advice = f"Up {r['change_pct']}% on the same days last month."
        if growing and "Growing" not in tags and not r["seasonal"]:
            tags.append("Growing")
        r["tags"], r["advice"] = tags, advice
    for c in catalogue:  # on the menu but no paid order yet
        if c["sku"] in rows:
            continue
        if c.get("seasonal"):
            items.append({"sku": c["sku"], "name": c["name"], "units": 0, "revenue": 0, "share_pct": 0, "change_pct": None,
                          "tags": ["Seasonal"], "advice": "New for the season, no paid order yet. Too early to judge."})
        else:
            items.append({"sku": c["sku"], "name": c["name"], "units": 0, "revenue": 0, "share_pct": 0, "change_pct": None,
                          "tags": ["Consider dropping"], "advice": "Not sold yet. A candidate to take off the menu."})
            drop.append(c["name"])
    counts: dict[str, int] = {}
    for o in paid:
        counts[o["customer_id"]] = counts.get(o["customer_id"], 0) + 1
    repeat = [o for o in paid if counts[o["customer_id"]] >= 3]
    occasional = [o for o in paid if counts[o["customer_id"]] < 3]
    n_repeat = sum(1 for v in counts.values() if v >= 3)
    n_occ = len(counts) - n_repeat
    avg = lambda xs: round(sum(o["total"] for o in xs) / len(xs)) if xs else 0
    if drop:
        summary = f"Consider dropping: {', '.join(drop)}."
    elif slowing:
        summary = f"Nothing to drop yet. Watch {', '.join(slowing)}: slowing."
    else:
        summary = "Nothing to drop yet. Every item is holding up."
    return {
        "period": f"1 to {upto} {today.strftime('%b')} vs the same days of {date.fromisoformat(prev_month + '-01').strftime('%b')}",
        "items": items, "summary": summary,
        "item_revenue": sum(r["revenue"] for r in items), "delivery_fees": sum(o.get("delivery_fee", 0) for o in paid),
        "orders": len(paid), "aov": avg(paid),
        "customers": {"paying": len(counts), "repeat": n_repeat, "occasional": n_occ,
                      "aov_repeat": avg(repeat), "aov_occasional": avg(occasional),
                      "orders_per_repeat": round(len(repeat) / n_repeat, 1) if n_repeat else 0,
                      "spend_repeat": round(sum(o["total"] for o in repeat) / n_repeat) if n_repeat else 0,
                      "spend_occasional": round(sum(o["total"] for o in occasional) / n_occ) if n_occ else 0},
    }


# ------------------------------------------------------------------ money guard for messages

MONEY_RE = re.compile(r"(?:₹|(?<![A-Za-z])(?:Rs|RS|rs|INR)\.?)\s?([0-9][0-9,]*(?:\.[0-9]+)?)\s*(lakh|lac|k)?\b")


def untraceable(text: str, known: set[float]) -> list[str]:
    bad = []
    for m in MONEY_RE.finditer(text):
        val = float(m.group(1).replace(",", "")) * {"lakh": 1e5, "lac": 1e5, "k": 1e3}.get((m.group(2) or "").lower(), 1)
        tol = 0.02 * val if m.group(2) else 1.0
        if not any(abs(val - k) <= max(tol, 1.0) for k in known):
            bad.append(m.group(0).strip())
    return bad
