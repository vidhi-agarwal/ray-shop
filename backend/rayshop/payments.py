"""Payment links. Uses Razorpay's Payment Links API in TEST mode when keys are set, otherwise a local mock
with the same shape (the mock pay page lives at /pay/<link id> on this server)."""
from __future__ import annotations

import base64
import json
import os
import random
import string
import time
import urllib.error
import urllib.request
from typing import Any

API = "https://api.razorpay.com/v1"


class PaymentError(Exception):
    pass


def _rid(prefix: str) -> str:
    return prefix + "".join(random.choice(string.ascii_letters + string.digits) for _ in range(14))


class MockGateway:
    mode = "mock"

    def __init__(self):
        self.links: dict[str, dict] = {}

    def seed(self, link: dict) -> None:
        self.links[link["id"]] = {"id": link["id"], "amount": link["amount"] * 100, "amount_paid": 0, "status": "created",
                                  "short_url": link.get("url") or f"/pay/{link['id']}", "payments": [],
                                  "description": link.get("description", ""), "notes": link.get("notes", {})}

    def create_link(self, amount_rupees: int, description: str, customer: dict, notes: dict) -> dict:
        lid = _rid("plink_")
        self.links[lid] = {"id": lid, "amount": int(amount_rupees * 100), "amount_paid": 0, "status": "created",
                           "short_url": f"/pay/{lid}", "payments": [], "description": description, "notes": notes,
                           "customer": customer, "created_at": int(time.time())}
        return dict(self.links[lid])

    def fetch(self, link_id: str) -> dict:
        if link_id not in self.links:
            raise PaymentError(f"no payment link {link_id}")
        return json.loads(json.dumps(self.links[link_id]))

    def pay(self, link_id: str, method: str = "upi") -> dict:
        """Called by the mock pay page when the customer pays."""
        link = self.links[link_id]
        if link["status"] == "paid":
            return link
        utr = "".join(random.choice(string.digits) for _ in range(12))
        payment = {"id": _rid("pay_"), "amount": link["amount"], "method": method, "utr": utr, "at": int(time.time())}
        link["payments"].append(payment)
        link["amount_paid"] = link["amount"]
        link["status"] = "paid"
        return dict(link)


class RazorpayTestGateway:
    """Razorpay Payment Links API, test mode only."""
    mode = "razorpay_test"

    def __init__(self, key: str, secret: str):
        if not key.startswith("rzp_test_"):
            raise PaymentError("Only Razorpay test keys (rzp_test_...) are allowed in this prototype.")
        self.auth = "Basic " + base64.b64encode(f"{key}:{secret}".encode()).decode()
        self.mock = MockGateway()  # holds the synthetic history's links, which do not exist in Razorpay

    def _call(self, method: str, path: str, body: dict | None = None) -> dict:
        req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body else None,
                                     headers={"Authorization": self.auth, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            raise PaymentError(f"Razorpay {e.code}: {e.read().decode()[:300]}") from e

    def seed(self, link: dict) -> None:
        self.mock.seed(link)

    def create_link(self, amount_rupees: int, description: str, customer: dict, notes: dict) -> dict:
        body = {"amount": int(amount_rupees * 100), "currency": "INR", "description": description[:2048],
                "customer": {k: v for k, v in customer.items() if k in ("name", "contact", "email") and v},
                "notify": {"sms": False, "email": False}, "reminder_enable": False, "notes": notes}
        r = self._call("POST", "/payment_links", body)
        return {"id": r["id"], "amount": r["amount"], "amount_paid": r.get("amount_paid", 0), "status": r["status"],
                "short_url": r["short_url"], "payments": [], "description": description, "notes": notes}

    def fetch(self, link_id: str) -> dict:
        if link_id in self.mock.links:
            return self.mock.fetch(link_id)
        r = self._call("GET", f"/payment_links/{link_id}")
        pays = []
        for p in r.get("payments") or []:
            pid = p.get("payment_id")
            utr = None
            if pid:
                try:
                    full = self._call("GET", f"/payments/{pid}")
                    acq = full.get("acquirer_data") or {}
                    utr = acq.get("rrn") or acq.get("upi_transaction_id")
                except PaymentError:
                    pass
            pays.append({"id": pid, "amount": p.get("amount"), "method": p.get("method"), "utr": utr, "at": p.get("created_at")})
        return {"id": r["id"], "amount": r["amount"], "amount_paid": r.get("amount_paid", 0), "status": r["status"],
                "short_url": r["short_url"], "payments": pays}

    def pay(self, link_id: str, method: str = "upi") -> dict:
        if link_id in self.mock.links:
            return self.mock.pay(link_id, method)
        raise PaymentError("Real test links are paid on Razorpay's own test checkout page.")


def make_gateway() -> Any:
    key, secret = os.getenv("RAZORPAY_KEY_ID", ""), os.getenv("RAZORPAY_KEY_SECRET", "")
    if key and secret:
        return RazorpayTestGateway(key, secret)
    return MockGateway()
