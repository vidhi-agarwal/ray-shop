"""Scripted driver: same tools in a fixed order, no LLM. For UI work only; events are tagged mode=scripted
and the UI shows a 'Scripted, no AI' badge. Record the real demo from a live run."""
from __future__ import annotations

import asyncio
import json
import uuid

from .events import EventBus
from .rules import rs
from .store import Store
from .tools import build_server, call_tool


class ScriptedSession:
    def __init__(self, store: Store, bus: EventBus, pace: float = 0.3):
        self.store, self.bus, self.pace = store, bus, pace
        _, _, self.impl = build_server(store, bus)
        self.pending: dict[str, asyncio.Future] = {}

    async def _t(self, name: str, args: dict | None = None) -> dict:
        await asyncio.sleep(self.pace)
        r = call_tool(self.store, self.bus, name, self.impl[name][2], args or {})
        txt = r["content"][0]["text"]
        return json.loads(txt) if txt.startswith("{") else {"text": txt}

    async def _say(self, text: str) -> None:
        await self._t("message_seller", {"text": text})

    async def _gate(self, tool: str, inp: dict) -> bool:
        from .agent import approval_detail
        aid = uuid.uuid4().hex[:8]
        fut = asyncio.get_running_loop().create_future()
        self.pending[aid] = fut
        self.bus.emit("approval_required", approval_id=aid, tool=tool, input=inp, detail=approval_detail(self.store, tool, inp))
        d = await fut
        self.bus.emit("approval", approval_id=aid, tool=tool, approved=d["approve"], note=d.get("note", ""))
        return d["approve"]

    def resolve(self, approval_id: str, approve: bool, note: str = "") -> bool:
        fut = self.pending.get(approval_id)
        if not fut or fut.done():
            return False
        fut.set_result({"approve": approve, "note": note})
        return True

    async def send(self, text: str, images: list[str] | None = None) -> None:
        self.bus.emit("founder_message", text=text, images=images or [])
        try:
            t = text.lower()
            if images and "menu-1" in images:
                await self._menu()
            elif "riya" in t:
                await self._riya()
            elif images and "ss-arjun-1" in images:
                await self._arjun()
            elif "pending" in t or "yaad" in t:
                await self._unpaid()
            elif "kavya" in t:
                await self._kavya()
            elif "diwali" in t:
                await self._diwali()
            else:
                await self._say("Scripted mode only knows the demo steps. Switch to live mode to chat freely.")
        except Exception as e:  # noqa: BLE001
            self.bus.emit("error", message=f"{type(e).__name__}: {e}")
        self.bus.emit("turn_done", cost_usd=0, duration_ms=0, turns=0, is_error=False)

    async def _menu(self):
        await self._t("get_shop")
        await self._t("read_image", {"image_id": "menu-1"})
        items = [{k: c[k] for k in ("name", "pack", "price", "eggless_extra", "units")} for c in self.store.truth["catalogue"]]
        await self._t("draft_catalogue", {"items": items})
        await self._say("Menu padh liya! 6 items mile: red velvet, chocolate truffle, eggless vanilla, chocolate cake, "
                        "Biscoff jar aur Diwali hamper. Eggless extra bhi add kiya. Shop publish kar doon?")
        if await self._gate("publish_shop", {}):
            await self._t("publish_shop")
            await self._say("Shop live hai! Yeh link Instagram bio aur WhatsApp status pe daal do. Ab orders mujhe forward karo.")

    async def _riya(self):
        await self._t("get_shop")
        q = await self._t("quote_order", {"customer": "Riya Menon", "channel": "instagram", "items": [
            {"item": "Red velvet cupcakes", "qty": 1}, {"item": "Red velvet cupcakes", "qty": 1, "eggless": True}],
            "date": "2026-10-17", "time": "18:00", "area": "Indiranagar", "fulfilment": "delivery"})
        await self._say(f"Riya ka order: 2 box red velvet (1 eggless), Sat 17 Oct, 6 baje, Indiranagar. Total {rs(q['total'])} "
                        f"(delivery {rs(q['delivery_fee'])}). Oven mein jagah hai. Payment link bhej doon?")
        msg = f"Hi Riya! 2 boxes of red velvet cupcakes (1 eggless) for Sat 17 Oct, 6 pm. Total {rs(q['total'])}. Pay here to confirm 💕"
        if await self._gate("send_payment_link", {"quote_id": q["quote_id"], "message_to_customer": msg}):
            await self._t("send_payment_link", {"quote_id": q["quote_id"], "message_to_customer": msg})
            await self._say("Link bhej diya. Payment aate hi bataungi.")

    async def _arjun(self):
        await self._t("read_image", {"image_id": "ss-arjun-1"})
        r = await self._t("verify_screenshot", {"order_id": "M-0223", "image_id": "ss-arjun-1",
                                                "claimed": {"amount": 1320, "utr": "428719630571", "paid_to": "Meera's Bakes"}})
        await self._say("Ruko, cake abhi mat banao. Screenshot mein Rs 1,320 paid dikh raha hai, par Razorpay mein M-0223 ka koi "
                        "payment nahi aaya, aur yeh UPI ref aapke account mein nahi hai. Arjun ko link se pay karne bolu?")
        msg = "Hi Arjun! We haven't received the payment for your cake yet. Could you please pay through this link? We'll start baking right after 🙂"
        if await self._gate("send_customer_message", {"customer": "Arjun Shetty", "text": msg, "order_id": "M-0223"}):
            await self._t("send_customer_message", {"customer": "Arjun Shetty", "text": msg, "order_id": "M-0223"})
            await self._say("Arjun ko link ke saath message bhej diya.")

    async def _unpaid(self):
        r = await self._t("get_orders", {"status": "unpaid"})
        for o in r["orders"]:
            await self._t("check_payment", {"order_id": o["id"]})
        await self._say("Sneha ka Rs 1,529 advance 26 ghante se pending hai (2 Diwali hampers, 16 Oct). Arjun ko abhi message gaya hai. "
                        "Sneha ko ek pyaara reminder bhejun?")
        msg = "Hi Sneha! Just a gentle reminder for the advance on your 2 Diwali hampers (16 Oct). Here's the link whenever you're ready 🪔"
        if await self._gate("send_customer_message", {"customer": "Sneha Iyer", "text": msg, "order_id": "M-0224"}):
            await self._t("send_customer_message", {"customer": "Sneha Iyer", "text": msg, "order_id": "M-0224"})

    async def _diwali(self):
        g = await self._t("growth_insights")
        f = await self._t("find_customers", {"segment": "repeat"})
        await self._say(f"Aapka business badh raha hai! Sep mein {rs(g['last_full_month_sales'])}, is mahine ki speed se "
                        f"{rs(g['this_month_run_rate'])}. {f['opted_in']} regular customers offers lena chahte hain. "
                        "Unhe Diwali hamper ka message bhejun? Aur aap Razorpay ka apna shop page lene ke liye ready ho.")
        msg = "Diwali is almost here! 🪔 Meera's Diwali gift hampers are back: 6 cupcakes, 2 Biscoff jars and diyas for Rs 1,499. Order from my shop:"
        if await self._gate("send_broadcast", {"segment": "repeat", "text": msg}):
            await self._t("send_broadcast", {"segment": "repeat", "text": msg, "include_shop_link": True})
            await self._say("Bhej diya! Jo log offers nahi chahte unhe nahi gaya.")

    async def _kavya(self):
        await self._t("get_shop")
        await self._t("quote_order", {"customer": "Kavya Rao", "channel": "whatsapp", "items": [
            {"item": "Diwali gift hamper", "qty": 4}, {"item": "Chocolate truffle cupcakes", "qty": 3}],
            "date": "2026-10-31", "area": "Whitefield", "fulfilment": "delivery"})
        await self._say("Kavya ka bada order hai (4 hampers + 3 box), par Whitefield delivery area ke bahar hai, toh link nahi bheja. "
                        "Pickup Indiranagar se ho sakta hai. 20% discount ka faisla aapka hai, main khud discount nahi deta.")

    async def close(self) -> None:
        return None
