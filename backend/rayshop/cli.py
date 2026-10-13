"""Terminal runner.  python -m rayshop.cli --steps menu,skip,riya,arjun,unpaid,diwali  [--scripted] [--approve always|never|ask]"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys

from .events import EventBus
from .store import Store

C = {"tool_call": "\033[36m", "tool_result": "\033[2m", "ray_message": "\033[1;32m", "agent_note": "\033[2;37m",
     "approval_required": "\033[1;33m", "error": "\033[1;31m", "customer_message": "\033[35m"}


def show(ev: dict) -> None:
    t = ev["type"]
    if t == "tool_call":
        line = f"-> {ev['tool']} {json.dumps(ev['input'], ensure_ascii=False)[:150]}"
    elif t == "tool_result":
        line = f"   {'ok' if ev['ok'] else 'ERROR'} {json.dumps(ev.get('summary') or ev.get('error'), ensure_ascii=False)[:220]}"
    elif t == "ray_message":
        line = f"\nRAY -> Meera: {ev['text']}\n"
    elif t == "customer_message":
        line = f"   shop -> {ev['customer']}: {ev['message']['text'][:160]} {'[link]' if ev['message'].get('link') else ''}"
    elif t == "agent_note":
        line = f"   (note) {ev['text'][:160]}"
    elif t == "approval_required":
        line = f"!! approval: {ev['tool']}"
    elif t == "turn_done":
        line = f"-- turn done ${ev.get('cost_usd') or 0:.3f}, {ev.get('turns')} steps"
    elif t == "error":
        line = f"ERROR {ev['message']}"
    else:
        return
    print(f"{C.get(t, '')}{line}\033[0m", flush=True)


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--steps", default="menu,skip,riya,arjun,unpaid,diwali")
    ap.add_argument("--scripted", action="store_true")
    ap.add_argument("--approve", choices=["ask", "always", "never"], default="always")
    ap.add_argument("--pay", action="store_true", help="customers pay new links right away")
    ap.add_argument("--model", default=None)
    args = ap.parse_args()
    store = Store()
    bus = EventBus(mode="scripted" if args.scripted else "live")
    if args.scripted:
        from .scripted import ScriptedSession
        runner = ScriptedSession(store, bus, pace=0)
    else:
        from .agent import AgentSession
        runner = AgentSession(store, bus, model=args.model)
    q = bus.subscribe()

    async def watch():
        while True:
            ev = await q.get()
            show(ev)
            if ev["type"] == "approval_required":
                if args.approve == "ask":
                    ok = (await asyncio.to_thread(input, "Approve? [y/N] ")).lower().startswith("y")
                else:
                    ok = args.approve == "always"
                runner.resolve(ev["approval_id"], ok, "" if ok else "Eval: do not send. Stop after one short message.")

    w = asyncio.create_task(watch())
    steps = {s["id"]: s for s in store.script}
    bus.emit("snapshot", view=store.view())
    for sid in args.steps.split(","):
        st = steps[sid]
        if st["kind"] == "time_skip":
            info = store.time_skip()
            bus.emit("time_skip", **info)
            bus.emit("snapshot", view=store.view())
            continue
        await runner.send(st["text"], st.get("images"))
        if args.pay and sid == "riya":
            from .server import Session  # noqa: F401  (only for the helper below)
            for o in store.orders:
                if o.get("quote_id") and o["payment_status"] == "unpaid":
                    paid = store.mark_paid(o["payment_link"]["id"])
                    if paid:
                        bus.emit("payment_received", order=paid)
                        bus.emit("ray_message", system=True,
                                 text=f"✅ {paid['customer']} paid Rs {paid['amount_paid']:,.0f} for {paid['id']} via Razorpay. Order confirmed for {paid['deliver_on']}.")
    await asyncio.sleep(0.2)
    w.cancel()
    await runner.close()
    bus.close()
    print(f"\nrecorded: runs/{bus.run_id}.jsonl", file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(main())
