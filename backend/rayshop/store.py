"""Seller data plus session state. All tool logic is here as plain methods, shared by the agent,
the scripted driver and the eval."""
from __future__ import annotations

import base64
import json
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from . import rules
from .payments import MockGateway, PaymentError, make_gateway

DATA = Path(__file__).resolve().parents[2] / "data" / "meera"


class ToolError(Exception):
    """Message goes back to the agent so it can fix its call."""


class Store:
    def __init__(self, data_dir: str | Path | None = None, gateway: Any = None, start_phase: str = "onboarding"):
        self.dir = Path(data_dir) if data_dir else DATA
        j = lambda n: json.loads((self.dir / n).read_text(encoding="utf-8"))  # noqa: E731
        self.merchant = j("merchant.json")
        self.customers_all = j("customers.json")
        self.ledger_all = j("ledger.json")
        self.images = {i["id"]: i for i in j("images.json")}
        self.script = j("script.json")
        self.truth = j("ground_truth.json")
        self.gateway = gateway or make_gateway()
        self.phase = "onboarding"
        self.today = date.fromisoformat(self.merchant["on_rayshop_since"])
        self.catalogue: list[dict] | None = None
        self.catalogue_draft: list[dict] | None = None
        self.shop_published = False
        self.orders: list[dict] = []
        self.customers: list[dict] = []
        self.quotes: dict[str, dict] = {}
        self.chats: dict[str, list[dict]] = {}      # customer name -> messages Meera's shop sent or received
        self.seller_messages: list[str] = []
        self.broadcasts: list[dict] = []
        self.images_read: set[str] = set()
        self.screenshot_checks: list[dict] = []
        self._q = 0
        if start_phase == "month3":
            self.time_skip()

    # ------------------------------------------------------------------ phases
    def time_skip(self) -> dict:
        """Jump from onboarding day to three months later, when the shop has history."""
        self.phase = "month3"
        self.today = date.fromisoformat(self.merchant["today"])
        if not self.catalogue:
            self.catalogue = [dict(c) for c in self.truth["catalogue"]]
            self.shop_published = True
        else:
            # line up the menu the agent built with the item codes in Meera's order history
            for t in self.truth["catalogue"]:
                m, _ = rules.match_item(self.catalogue, t["name"])
                if m:
                    m["sku"] = t["sku"]
                    m.setdefault("units", t["units"])
        self.orders = json.loads(json.dumps(self.ledger_all))
        self.customers = json.loads(json.dumps(self.customers_all))
        for o in self.orders:
            if o.get("payment_link"):
                self.gateway.seed({**o["payment_link"], "notes": {"order_id": o["id"]}})
                self.chats.setdefault(o["customer"], []).append({
                    "from": "shop", "at": o["payment_link"]["created_at"],
                    "text": f"Hi {o['customer'].split()[0]}! Your order {o['id']} is noted. Please pay {rules.rs(o['due_now'])} here to confirm:",
                    "link": {"id": o["payment_link"]["id"], "url": o["payment_link"]["url"], "amount": o["due_now"]}})
        return {"phase": self.phase, "today": self.today.isoformat(), "orders": len(self.orders)}

    # ------------------------------------------------------------------ helpers
    def order(self, order_id: str) -> dict:
        for o in self.orders:
            if o["id"] == order_id:
                return o
        raise ToolError(f"No order {order_id}. Use get_orders to look it up.")

    def booked_units(self) -> dict[str, float]:
        cat = {c["sku"]: c for c in (self.catalogue or self.truth["catalogue"])}
        out: dict[str, float] = {}
        for o in self.orders:
            if o["status"] in ("confirmed", "awaiting_payment") and o["deliver_on"] >= self.today.isoformat():
                u = sum(float(cat.get(li["sku"], {}).get("units", 1)) * li["qty"] for li in o["lines"])
                out[o["deliver_on"]] = out.get(o["deliver_on"], 0) + u
        return out

    def menu_amounts(self) -> set[float]:
        vals: set[float] = set()
        for c in (self.catalogue or []) + (self.catalogue_draft or []):
            vals.add(float(c["price"]))
            if c.get("eggless_extra"):
                vals.update({float(c["eggless_extra"]), float(c["price"] + c["eggless_extra"])})
        for z in self.merchant["delivery_zones"]:
            vals.add(float(z["fee"]))
        vals.add(float(self.merchant["policies"]["advance_threshold"]))
        return vals

    def known_amounts(self) -> set[float]:
        vals: set[float] = set()
        for c in (self.catalogue or []) + (self.catalogue_draft or []):
            vals.add(float(c["price"]))
            if c.get("eggless_extra"):
                vals.update({float(c["eggless_extra"]), float(c["price"] + c["eggless_extra"])})
        for z in self.merchant["delivery_zones"]:
            vals.add(float(z["fee"]))
        vals.add(float(self.merchant["policies"]["advance_threshold"]))
        for q in self.quotes.values():
            vals.update(float(q[k]) for k in ("subtotal", "delivery_fee", "total", "due_now", "balance_later"))
            vals.update(float(li["amount"]) for li in q["lines"])
            vals.update(float(li["unit_price"]) for li in q["lines"])
        for o in self.orders:
            vals.update(float(o[k]) for k in ("total", "due_now", "amount_paid"))
        g = rules.growth(self.orders, self.customers, self.today, date.fromisoformat(self.merchant["on_rayshop_since"])) if self.orders else None
        if g:
            vals.update(float(m["sales"]) for m in g["series"])
            vals.update(float(g[k]) for k in ("this_month_so_far", "this_month_run_rate", "last_full_month_sales",
                                               "collected_after_reminder"))
            vals.update({50000.0, 100000.0})
        for chk in self.screenshot_checks:
            if chk["claimed"].get("amount"):
                vals.add(float(chk["claimed"]["amount"]))
        return vals

    def _guard_text(self, text: str, scope: set[float] | None = None) -> None:
        """Every rupee amount must be traceable. Customer-facing text is checked against the menu and that one order only."""
        bad = rules.untraceable(text, scope if scope is not None else self.known_amounts())
        if bad:
            raise ToolError("Not sent. These amounts do not match the menu, a quote or an order: "
                            + ", ".join(sorted(set(bad))) + ". Use quote_order or get_orders and quote exactly.")

    # ------------------------------------------------------------------ tools: shop
    def get_shop(self) -> dict:
        bu = self.booked_units()
        cap = self.merchant["policies"]["daily_capacity_units"]
        days = [(self.today + timedelta(days=i)).isoformat() for i in range(0, 14)]
        return {
            "shop": {k: self.merchant[k] for k in ("name", "owner", "city", "base_area", "instagram")},
            "today": self.today.isoformat(), "weekday": self.today.strftime("%A"), "phase": self.phase,
            "policies": self.merchant["policies"], "delivery_zones": self.merchant["delivery_zones"],
            "delivery_note": self.merchant["delivery_note"],
            "catalogue": self.catalogue, "shop_published": self.shop_published,
            "shop_url": f"/shop/{self.merchant['id']}" if self.shop_published else None,
            "oven_slots_booked": {d: f"{bu.get(d, 0):g}/{cap}" for d in days if bu.get(d)},
            "payments": "Razorpay test mode" if self.gateway.mode == "razorpay_test" else "mock payment links (same shape as Razorpay)",
        }

    def read_image(self, image_id: str) -> dict:
        im = self.images.get(image_id)
        if not im:
            raise ToolError(f"No image {image_id}.")
        self.images_read.add(image_id)
        return {"image": im, "data": base64.b64encode((self.dir / im["file"]).read_bytes()).decode(), "mime": im["mime"]}

    def draft_catalogue(self, items: list[dict]) -> dict:
        if "menu-1" not in self.images_read:
            raise ToolError("Read the menu photo (read_image menu-1) before drafting the catalogue.")
        probs = rules.validate_catalogue(items)
        if probs:
            raise ToolError("Catalogue not saved: " + "; ".join(probs))
        draft = []
        for i, it in enumerate(items):
            sku = it.get("sku") or "".join(w[0] for w in rules.norm(it["name"]).split())[:4].upper() + str(i + 1)
            draft.append({"sku": sku, "name": it["name"].strip(), "pack": it.get("pack"), "price": int(it["price"]),
                          "eggless_extra": it.get("eggless_extra"), "units": float(it.get("units") or 1),
                          "seasonal": bool(it.get("seasonal"))})
        self.catalogue_draft = draft
        return {"saved_draft": True, "items": draft, "next": "Show Meera the list with message_seller, then publish_shop (she approves)."}

    def publish_shop(self) -> dict:
        if not self.catalogue_draft:
            raise ToolError("No draft catalogue. Call draft_catalogue first.")
        self.catalogue = self.catalogue_draft
        self.shop_published = True
        return {"published": True, "shop_url": f"/shop/{self.merchant['id']}", "items": len(self.catalogue)}

    # ------------------------------------------------------------------ tools: orders
    def quote_order(self, req: dict) -> dict:
        if not self.catalogue:
            raise ToolError("The shop has no published menu yet.")
        q = rules.quote(self.merchant, self.catalogue, self.booked_units(), req, self.today)
        self._q += 1
        qid = f"Q{self._q}"
        q["quote_id"] = qid
        self.quotes[qid] = q
        return q

    def send_payment_link(self, quote_id: str, message_to_customer: str) -> dict:
        q = self.quotes.get(quote_id)
        if not q:
            raise ToolError(f"No quote {quote_id}. Call quote_order first.")
        if not q["can_send_link"]:
            raise ToolError("This quote has blocking issues: " + "; ".join(i["message"] for i in q["issues"] if i["level"] == "block"))
        if any(o.get("quote_id") == quote_id for o in self.orders):
            raise ToolError("A payment link was already sent for this quote.")
        qvals = {float(q[k]) for k in ("subtotal", "delivery_fee", "total", "due_now", "balance_later")}
        qvals |= {float(li["amount"]) for li in q["lines"]} | {float(li["unit_price"]) for li in q["lines"]}
        self._guard_text(message_to_customer, self.menu_amounts() | qvals)
        oid = f"M-{len(self.orders) + 1:04d}"
        cust = next((c for c in self.customers if c["name"].lower() == (q["customer"] or "").lower()), None)
        try:
            link = self.gateway.create_link(q["due_now"], f"{self.merchant['name']} order {oid}",
                                            {"name": q["customer"]}, {"order_id": oid})
        except PaymentError as e:
            raise ToolError(str(e)) from e
        order = {"id": oid, "quote_id": quote_id, "customer_id": cust["id"] if cust else None, "customer": q["customer"],
                 "channel": q["channel"], "placed_at": datetime.combine(self.today, datetime.min.time()).isoformat(timespec="minutes"),
                 "deliver_on": q["date"], "time": q["time"], "area": q["area"], "fulfilment": q["fulfilment"],
                 "lines": [{"sku": li["sku"], "qty": li["qty"], "eggless": li["eggless"]} for li in q["lines"]],
                 "subtotal": q["subtotal"], "delivery_fee": q["delivery_fee"], "total": q["total"], "due_now": q["due_now"],
                 "units": q["units"], "amount_paid": 0, "payment_status": "unpaid", "paid_via": None,
                 "status": "awaiting_payment", "notes": q.get("notes"),
                 "payment_link": {"id": link["id"], "amount": q["due_now"], "status": link["status"], "url": link["short_url"]}}
        self.orders.append(order)
        self.chats.setdefault(q["customer"], []).append(
            {"from": "shop", "at": self.today.isoformat(), "text": message_to_customer.strip(),
             "link": {"id": link["id"], "url": link["short_url"], "amount": q["due_now"]}})
        return {"order_id": oid, "payment_link": link["short_url"], "link_id": link["id"], "amount": q["due_now"],
                "sent_to": q["customer"], "gateway": self.gateway.mode}

    def check_payment(self, order_id: str) -> dict:
        o = self.order(order_id)
        link = o.get("payment_link")
        if not link:
            return {"order_id": order_id, "status": o["payment_status"], "amount_paid": o["amount_paid"], "source": "order history"}
        try:
            st = self.gateway.fetch(link["id"])
        except PaymentError as e:
            raise ToolError(str(e)) from e
        self._sync(o, st)
        return {"order_id": order_id, "link_status": st["status"], "amount_due": o["due_now"],
                "amount_paid": st["amount_paid"] / 100, "payments": [
                    {"id": p["id"], "amount": p["amount"] / 100, "method": p.get("method"), "utr": p.get("utr")} for p in st["payments"]],
                "source": "Razorpay" if self.gateway.mode == "razorpay_test" else "mock gateway"}

    def _sync(self, o: dict, st: dict) -> bool:
        changed = False
        if st["status"] == "paid" and o["payment_status"] == "unpaid":
            o["amount_paid"] = st["amount_paid"] / 100
            o["payment_status"] = "paid" if o["amount_paid"] >= o["total"] else "advance_paid"
            o["status"] = "confirmed"
            o["paid_via"] = o.get("paid_via") or "link"
            o["payment_link"]["status"] = "paid"
            changed = True
        return changed

    def verify_screenshot(self, order_id: str, image_id: str, claimed: dict) -> dict:
        if image_id not in self.images_read:
            raise ToolError(f"Read {image_id} with read_image first.")
        o = self.order(order_id)
        st = self.gateway.fetch(o["payment_link"]["id"]) if o.get("payment_link") else \
            {"status": "paid", "amount_paid": o["amount_paid"] * 100,
             "payments": [{**p, "amount": p["amount"] * 100} for p in o.get("payments", [])]}
        res = rules.verify_screenshot(o, st, claimed)
        res["image_id"] = image_id
        self.screenshot_checks.append(res)
        return res

    def send_customer_message(self, customer: str, text: str, order_id: str | None = None) -> dict:
        scope = self.menu_amounts()
        if order_id:
            o = self.order(order_id)
            scope |= {float(o[k]) for k in ("total", "due_now", "amount_paid")} | {float(o["total"] - o["amount_paid"])}
        for qq in self.quotes.values():
            if (qq.get("customer") or "").lower() == customer.lower():
                scope |= {float(qq[k]) for k in ("total", "due_now", "balance_later", "subtotal")}
        self._guard_text(text, scope)
        entry: dict[str, Any] = {"from": "shop", "at": self.today.isoformat(), "text": text.strip()}
        if order_id:
            if o.get("payment_link") and o["payment_status"] == "unpaid":
                entry["link"] = {"id": o["payment_link"]["id"], "url": o["payment_link"]["url"], "amount": o["due_now"]}
            if "remind" in text.lower() or "pay" in text.lower():
                o["reminded"] = True
        self.chats.setdefault(customer, []).append(entry)
        return {"sent": True, "to": customer, "with_payment_link": "link" in entry}

    def message_seller(self, text: str) -> dict:
        if not text.strip():
            raise ToolError("Empty message.")
        self._guard_text(text)
        self.seller_messages.append(text.strip())
        return {"sent": True}

    def get_orders(self, status: str | None = None, date_from: str | None = None, date_to: str | None = None,
                   customer: str | None = None) -> dict:
        out = []
        for o in self.orders:
            if status and status != "any":
                if status == "unpaid" and o["payment_status"] != "unpaid":
                    continue
                if status == "upcoming" and not (o["deliver_on"] >= self.today.isoformat() and o["status"] != "delivered"):
                    continue
            if date_from and o["deliver_on"] < date_from:
                continue
            if date_to and o["deliver_on"] > date_to:
                continue
            if customer and customer.lower() not in o["customer"].lower():
                continue
            out.append(o)
        if not status and not date_from and not customer:
            out = out[-25:]
        hours = {}
        for o in out:
            if o.get("payment_link") and o["payment_status"] == "unpaid":
                created = o["payment_link"].get("created_at")
                if created:
                    hours[o["id"]] = round((datetime.combine(self.today, datetime.min.time()) + timedelta(hours=1)
                                            - datetime.fromisoformat(created)).total_seconds() / 3600)
        return {"today": self.today.isoformat(), "count": len(out), "orders": [
            {k: o.get(k) for k in ("id", "customer", "channel", "deliver_on", "time", "area", "lines", "total", "due_now",
                                   "amount_paid", "payment_status", "status", "reminded")} |
            ({"link_unpaid_for_hours": hours[o["id"]]} if o["id"] in hours else {}) for o in out]}

    def sales_summary(self, day: str | None = None) -> dict:
        d = day or (self.today + timedelta(days=1)).isoformat()
        todays = [o for o in self.orders if o["deliver_on"] == d and o["status"] != "cancelled"]
        cap = self.merchant["policies"]["daily_capacity_units"]
        units = self.booked_units().get(d, 0)
        return {"date": d, "orders": len(todays), "units": units, "capacity": cap,
                "collected": sum(o["amount_paid"] for o in todays),
                "to_collect": sum(o["total"] - o["amount_paid"] for o in todays),
                "unpaid_orders": [o["id"] for o in todays if o["payment_status"] == "unpaid"],
                "items": [{"order": o["id"], "customer": o["customer"], "lines": o["lines"], "area": o["area"]} for o in todays]}

    def growth_insights(self) -> dict:
        if self.phase != "month3":
            raise ToolError("No sales history yet; the shop was just set up.")
        return rules.growth(self.orders, self.customers, self.today, date.fromisoformat(self.merchant["on_rayshop_since"]))

    def find_customers(self, segment: str) -> dict:
        counts: dict[str, int] = {}
        last: dict[str, str] = {}
        for o in self.orders:
            counts[o["customer_id"]] = counts.get(o["customer_id"], 0) + 1
            last[o["customer_id"]] = max(last.get(o["customer_id"], ""), o["placed_at"])
        res = []
        for c in self.customers:
            n = counts.get(c["id"], 0)
            if segment == "repeat" and n < 3:
                continue
            if segment == "lapsed" and (n == 0 or last.get(c["id"], "") >= (self.today - timedelta(days=30)).isoformat()):
                continue
            res.append({"name": c["name"], "orders": n, "last_order": last.get(c["id"], "")[:10],
                        "marketing_opt_in": c["marketing_opt_in"], "channel": c["channel"]})
        opted = [r for r in res if r["marketing_opt_in"]]
        return {"segment": segment, "count": len(res), "opted_in": len(opted), "customers": res[:40],
                "rule": "Broadcasts can only go to customers who opted in to offers."}

    def send_broadcast(self, segment: str, text: str, include_shop_link: bool = True) -> dict:
        found = self.find_customers(segment)
        if found["opted_in"] == 0:
            raise ToolError("No opted-in customers in that segment.")
        week_ago = (self.today - timedelta(days=7)).isoformat()
        if any(b["date"] >= week_ago for b in self.broadcasts):
            raise ToolError("Only one broadcast per week, so customers don't feel spammed.")
        self._guard_text(text, self.menu_amounts())
        b = {"date": self.today.isoformat(), "segment": segment, "recipients": found["opted_in"],
             "skipped_no_consent": found["count"] - found["opted_in"], "text": text.strip(),
             "shop_link": f"/shop/{self.merchant['id']}" if include_shop_link else None}
        self.broadcasts.append(b)
        return b

    # ------------------------------------------------------------------ payments arriving
    def mark_paid(self, link_id: str) -> dict | None:
        """Customer paid on the (mock) pay page. Returns the order if it changed."""
        st = self.gateway.pay(link_id)
        for o in self.orders:
            if o.get("payment_link", {}).get("id") == link_id:
                if self._sync(o, st):
                    return o
        return None

    def poll_payments(self) -> list[dict]:
        changed = []
        for o in self.orders:
            if o.get("payment_link") and o["payment_status"] == "unpaid":
                try:
                    st = self.gateway.fetch(o["payment_link"]["id"])
                except PaymentError:
                    continue
                if self._sync(o, st):
                    changed.append(o)
        return changed

    # ------------------------------------------------------------------ views
    def insights(self) -> dict:
        """Menu and customer insights from the full order history (rules, no AI)."""
        return rules.insights(self.orders, self.truth["catalogue"], self.today)

    def view(self) -> dict:
        g = rules.growth(self.orders, self.customers, self.today, date.fromisoformat(self.merchant["on_rayshop_since"])) \
            if self.phase == "month3" else None
        return {"merchant": self.merchant, "phase": self.phase, "today": self.today.isoformat(),
                "catalogue": self.catalogue, "catalogue_draft": self.catalogue_draft, "shop_published": self.shop_published,
                "orders": self.orders[-40:], "chats": self.chats, "broadcasts": self.broadcasts, "growth": g,
                "screenshot_checks": self.screenshot_checks, "images": list(self.images.values()),
                "script": self.script, "gateway": self.gateway.mode, "booked": self.booked_units()}
