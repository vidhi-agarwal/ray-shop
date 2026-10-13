"""Deterministic tests for RAY Shop's money and policy rules."""
import pytest

from rayshop import rules
from rayshop.payments import MockGateway
from rayshop.store import Store, ToolError


@pytest.fixture
def s():
    return Store(gateway=MockGateway(), start_phase="month3")


def q(s, items, date="2026-10-17", area="Indiranagar", fulfilment="delivery", customer="Riya Menon"):
    return s.quote_order({"customer": customer, "channel": "instagram", "items": items, "date": date, "area": area,
                          "fulfilment": fulfilment})


def test_riya_order(s):
    r = q(s, [{"item": "Red velvet cupcakes", "qty": 1}, {"item": "red velvet", "qty": 1, "eggless": True}])
    assert (r["subtotal"], r["delivery_fee"], r["total"], r["due_now"]) == (1120, 60, 1180, 1180)
    assert r["can_send_link"]


def test_advance_above_threshold(s):
    r = q(s, [{"item": "Diwali gift hamper", "qty": 2}], date="2026-10-18", area="Domlur")
    assert r["total"] == 3058 and r["due_now"] == 1529 and r["balance_later"] == 1529


def test_far_zone_fee_and_eggless_cake(s):
    r = q(s, [{"item": "Classic chocolate cake", "qty": 1, "eggless": True}], date="2026-10-16", area="HSR Layout")
    assert r["total"] == 1100 + 100 + 120


def test_outside_zone_blocks_but_pickup_works(s):
    r = q(s, [{"item": "Diwali gift hamper", "qty": 4}], date="2026-10-31", area="Whitefield")
    assert not r["can_send_link"] and r["issues"][0]["code"] == "outside_zone"
    r2 = q(s, [{"item": "Diwali gift hamper", "qty": 4}], date="2026-10-31", area=None, fulfilment="pickup")
    assert r2["can_send_link"] and r2["delivery_fee"] == 0


def test_not_on_menu_and_no_eggless(s):
    r = q(s, [{"item": "Red velvet cake 2 kg", "qty": 1}])
    assert any(i["code"] == "not_on_menu" for i in r["issues"]) and not r["can_send_link"]
    r2 = q(s, [{"item": "Biscoff cheesecake jar", "qty": 1, "eggless": True}])
    assert any(i["code"] == "no_eggless" for i in r2["issues"])


def test_capacity_and_notice(s):
    r = q(s, [{"item": "Diwali gift hamper", "qty": 6}], date="2026-10-14")
    codes = {i["code"] for i in r["issues"]}
    assert "capacity" in codes and "short_notice" in codes and not r["can_send_link"]


def test_link_amount_comes_from_quote_and_guard_blocks_invented_amounts(s):
    r = q(s, [{"item": "Red velvet cupcakes", "qty": 1}])
    with pytest.raises(ToolError, match="Rs 500"):
        s.send_payment_link(r["quote_id"], "Special price Rs 500 for you!")
    out = s.send_payment_link(r["quote_id"], f"Total Rs {rules.inr(r['total'])}, pay here")
    assert out["amount"] == r["due_now"]
    with pytest.raises(ToolError, match="already sent"):
        s.send_payment_link(r["quote_id"], "again")


def test_blocked_quote_cannot_get_a_link(s):
    r = q(s, [{"item": "Diwali gift hamper", "qty": 4}], date="2026-10-31", area="Whitefield")
    with pytest.raises(ToolError, match="blocking"):
        s.send_payment_link(r["quote_id"], "hi")


def test_screenshots(s):
    s.read_image("ss-arjun-1")
    fake = s.verify_screenshot("M-0223", "ss-arjun-1", {"amount": 1320, "utr": "428719630571"})
    assert fake["verdict"] == "not_received" and not fake["safe_to_start"]
    gt = s.truth["screenshots"]["ss-real-1"]
    s.read_image("ss-real-1")
    real = s.verify_screenshot(gt["order_id"], "ss-real-1", {"amount": gt["amount"], "utr": gt["utr"]})
    assert real["verdict"] == "matches" and real["safe_to_start"]
    wrong_amt = s.verify_screenshot(gt["order_id"], "ss-real-1", {"amount": gt["amount"] + 500, "utr": gt["utr"]})
    assert wrong_amt["verdict"] == "mismatch"


def test_payment_flow(s):
    r = q(s, [{"item": "Red velvet cupcakes", "qty": 1}])
    out = s.send_payment_link(r["quote_id"], "Pay here")
    assert s.check_payment(out["order_id"])["link_status"] == "created"
    o = s.mark_paid(out["link_id"])
    assert o["payment_status"] == "paid" and s.check_payment(out["order_id"])["amount_paid"] == r["due_now"]


def test_broadcast_consent_and_weekly_limit(s):
    b = s.send_broadcast("repeat", "Diwali hampers are back at Rs 1,499!")
    assert b["recipients"] < s.find_customers("repeat")["count"]
    with pytest.raises(ToolError, match="one broadcast per week"):
        s.send_broadcast("repeat", "again")


def test_catalogue_needs_photo_read_and_valid_prices():
    s = Store(gateway=MockGateway())
    with pytest.raises(ToolError, match="Read the menu photo"):
        s.draft_catalogue([{"name": "x", "price": 10}])
    s.read_image("menu-1")
    with pytest.raises(ToolError, match="needs a price"):
        s.draft_catalogue([{"name": "x", "price": 0}])


def test_growth_steps(s):
    g = s.growth_insights()
    ready = {x["id"]: x["ready"] for x in g["next_steps"]}
    assert ready == {"website": True, "checkout": False, "capital": False}
    assert g["growth_last_month_pct"] == 21
