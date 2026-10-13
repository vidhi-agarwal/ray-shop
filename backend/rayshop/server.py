"""FastAPI backend for RAY Shop. Modes: live (Claude agent), scripted (no AI), replay (recorded live run)."""
from __future__ import annotations

import asyncio
import html
import json
import os
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from .events import RUNS_DIR, EventBus, load_recording
from .rules import inr, rs
from .store import DATA, Store

ROOT = Path(__file__).resolve().parents[2]
DEMO_DIR = ROOT / "demo"
FRONTEND_DIST = ROOT / "frontend" / "dist"

app = FastAPI(title="RAY Shop")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

PAUSE_TYPES = {"time_skip", "payment_received"}


class ReplaySession:
    """Plays a recorded run. Waits for the viewer at each founder message, approval, time skip and payment."""

    def __init__(self, events: list[dict], bus: EventBus, speed: float = 1.0):
        self.events, self.bus, self.speed = events, bus, speed
        self.task: asyncio.Task | None = None
        self.gate: asyncio.Future | None = None
        self.gate_kind: str | None = None
        self.pending: dict[str, asyncio.Future] = {}

    def _open_gate(self, kind: str) -> asyncio.Future:
        self.gate = asyncio.get_running_loop().create_future()
        self.gate_kind = kind
        return self.gate

    def release(self, kind: str) -> bool:
        if self.gate and not self.gate.done() and (self.gate_kind == kind or kind == "any"):
            self.gate.set_result(True)
            return True
        return False

    async def send(self, text: str, images: list[str] | None = None) -> None:
        if not self.task:
            self.task = asyncio.create_task(self._play())
        else:
            self.release("message")

    async def _play(self) -> None:
        prev = None
        first = True
        for ev in self.events:
            t = ev["type"]
            if t in ("approval", "session"):
                continue
            if t == "founder_message":
                if not first:
                    nxt = self._open_gate("message")
                    self.bus.emit("replay_waiting", next="message", text=ev["text"], images=ev.get("images", []))
                    await nxt
                first = False
                prev = None
            elif t in PAUSE_TYPES:
                nxt = self._open_gate(t)
                self.bus.emit("replay_waiting", next=t)
                try:
                    await asyncio.wait_for(nxt, timeout=None if t == "time_skip" else 90)  # time to tap Pay while presenting
                except asyncio.TimeoutError:
                    pass
                prev = None
            if prev is not None:
                await asyncio.sleep(min(max(ev["t"] - prev, 0) / self.speed, 2.0))
            prev = ev["t"]
            data = {k: v for k, v in ev.items() if k not in ("seq", "t", "type", "mode")}
            data["recorded_mode"] = ev.get("mode", "live")
            self.bus.emit(t, **data)
            if t == "approval_required":
                fut = asyncio.get_running_loop().create_future()
                self.pending[ev["approval_id"]] = fut
                d = await fut
                self.bus.emit("approval", approval_id=ev["approval_id"], tool=ev["tool"], approved=d["approve"], note=d.get("note", ""))
                prev = None
        self.bus.emit("replay_done")

    def resolve(self, approval_id: str, approve: bool, note: str = "") -> bool:
        fut = self.pending.get(approval_id)
        if not fut or fut.done():
            return False
        fut.set_result({"approve": approve, "note": note})
        return True

    async def close(self) -> None:
        if self.task:
            self.task.cancel()


class Session:
    def __init__(self, mode: str, recording: str | None):
        self.id = uuid.uuid4().hex[:10]
        self.mode = mode
        self.store = Store()
        self.bus = EventBus(record=(mode == "live"), mode=mode)
        self.tasks: list[asyncio.Task] = []
        if mode == "live":
            if not os.getenv("ANTHROPIC_API_KEY") and not os.getenv("RAYSHOP_ALLOW_CLI_AUTH"):
                raise HTTPException(400, "Live mode needs ANTHROPIC_API_KEY on the backend.")
            from .agent import AgentSession
            self.runner: Any = AgentSession(self.store, self.bus)
        elif mode == "scripted":
            from .scripted import ScriptedSession
            self.runner = ScriptedSession(self.store, self.bus)
        elif mode == "replay":
            self.runner = ReplaySession(load_recording(find_recording(recording)), self.bus, float(os.getenv("REPLAY_SPEED", "1")))
        else:
            raise HTTPException(400, "mode must be live, scripted or replay")
        self.bus.emit("session", session_id=self.id, gateway=self.store.gateway.mode)
        self.bus.emit("snapshot", view=self.store.view())
        if mode == "live" and self.store.gateway.mode == "razorpay_test":
            self.tasks.append(asyncio.get_event_loop().create_task(self._poll()))

    async def _poll(self) -> None:
        while True:
            await asyncio.sleep(5)
            for o in self.store.poll_payments():
                announce_payment(self, o)


def announce_payment(s: Session, o: dict) -> None:
    """A payment arrived. Deterministic notifications, no model needed."""
    s.bus.emit("payment_received", order=o)
    first = o["customer"].split()[0]
    when = f" for {o['deliver_on']}" if o.get("deliver_on") else ""
    s.bus.emit("ray_message", text=f"✅ {o['customer']} paid {rs(o['amount_paid'])} for {o['id']} via Razorpay. Order confirmed{when}.",
               system=True)
    s.store.chats.setdefault(o["customer"], []).append({"from": "shop", "at": s.store.today.isoformat(),
                                                        "text": f"Payment received, thank you {first}! 🧁 Your order {o['id']} is confirmed."})
    s.bus.emit("customer_message", customer=o["customer"], message=s.store.chats[o["customer"]][-1])


SESSIONS: dict[str, Session] = {}


def find_recording(name: str | None) -> Path:
    c = []
    for d in (DEMO_DIR, RUNS_DIR):
        if d.exists():
            c += sorted(d.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not c:
        raise HTTPException(404, "No recordings yet. Do a live run first or put one in demo/.")
    if not name:
        return c[0]
    for p in c:
        if p.stem == name:
            return p
    raise HTTPException(404, f"recording {name} not found")


def get(sid: str) -> Session:
    s = SESSIONS.get(sid)
    if not s:
        raise HTTPException(404, "unknown session")
    return s


class NewSession(BaseModel):
    mode: str = "replay"
    recording: str | None = None


class Message(BaseModel):
    text: str
    images: list[str] = []


class Approval(BaseModel):
    approve: bool
    note: str = ""


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "live_available": bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("RAYSHOP_ALLOW_CLI_AUTH")),
            "gateway": "razorpay_test" if os.getenv("RAZORPAY_KEY_ID") else "mock", "model": os.getenv("RAYSHOP_MODEL", "sonnet")}


@app.post("/api/sessions")
def new_session(body: NewSession) -> dict:
    s = Session(body.mode, body.recording)
    SESSIONS[s.id] = s
    return {"session_id": s.id, "mode": s.mode}


@app.post("/api/sessions/{sid}/messages")
async def send(sid: str, body: Message) -> dict:
    s = get(sid)
    s.tasks.append(asyncio.create_task(s.runner.send(body.text, body.images)))
    return {"ok": True}


@app.post("/api/sessions/{sid}/approvals/{aid}")
def approve(sid: str, aid: str, body: Approval) -> dict:
    if not get(sid).runner.resolve(aid, body.approve, body.note):
        raise HTTPException(409, "no pending approval with that id")
    return {"ok": True}


@app.post("/api/sessions/{sid}/skip")
def skip(sid: str) -> dict:
    s = get(sid)
    if s.mode == "replay":
        s.runner.release("time_skip")
        return {"ok": True}
    info = s.store.time_skip()
    s.bus.emit("time_skip", **info)
    s.bus.emit("snapshot", view=s.store.view())
    return info


@app.post("/api/sessions/{sid}/pay/{link_id}")
def pay(sid: str, link_id: str) -> dict:
    s = get(sid)
    if s.mode == "replay":
        s.runner.release("payment_received")
        return {"ok": True}
    try:
        o = s.store.mark_paid(link_id)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, str(e))
    if o:
        announce_payment(s, o)
    return {"ok": True, "order": o["id"] if o else None}


@app.get("/api/sessions/{sid}/events")
async def events(sid: str):
    s = get(sid)
    q = s.bus.subscribe()

    async def gen():
        try:
            while True:
                ev = await q.get()
                yield {"event": "message", "data": json.dumps(ev, ensure_ascii=False, default=str)}
        finally:
            s.bus.unsubscribe(q)

    return EventSourceResponse(gen(), ping=15)


@app.get("/api/initial")
def initial() -> dict:
    return Store().view()


@app.get("/api/images/{image_id}")
def image(image_id: str):
    st = Store()
    im = st.images.get(image_id)
    if not im:
        raise HTTPException(404)
    return FileResponse(st.dir / im["file"], media_type=im["mime"])


PAGE_HEAD = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=TASA+Orbiter:wght@600;700&family=Lora:ital,wght@1,600&display=swap" rel="stylesheet">
<style>:root{{--blue:#305EFF;--blue2:#1F48E0;--navy:#0B1A3A;--ink:#0D1B3E;--ink2:#47557A;--ink3:#8592B0;--line:#E2E7F1;--line2:#EEF1F7;--green:#0B9F5B}}
*{{box-sizing:border-box}}body{{margin:0;font:14px/1.5 Inter,system-ui,sans-serif;color:var(--ink);background:#F4F6FB;-webkit-font-smoothing:antialiased}}
h1,h2,b.d{{font-family:"TASA Orbiter",Inter,sans-serif}}button{{font:inherit;cursor:pointer}}</style>"""


@app.get("/pay/{link_id}", response_class=HTMLResponse)
def pay_page(link_id: str, s: str = "") -> str:
    """Mock checkout for links created without Razorpay keys. Clearly labelled as a test page."""
    url = json.dumps(f"/api/sessions/{s}/pay/{link_id}").replace("<", "\\u003c")  # safe inside <script>
    return PAGE_HEAD.format(title="Test payment") + f"""
<style>body{{display:grid;place-items:center;min-height:100vh;padding:16px}}.c{{width:100%;max-width:380px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 18px 40px #0d1b3e22}}
.r{{background:#FFB547;color:#4A2F00;font-size:11px;font-weight:700;text-align:center;padding:5px}}.h{{background:linear-gradient(140deg,#305EFF,#1C3FCC);color:#fff;padding:18px}}
.h small{{opacity:.8}}.h b.d{{display:block;font-size:20px;margin-top:4px}}.b{{padding:18px;display:flex;flex-direction:column;gap:12px}}
.b p{{margin:0;color:var(--ink2);font-size:13px}}code{{font-size:12px;background:var(--line2);padding:1px 6px;border-radius:5px}}
.p{{background:var(--blue);color:#fff;border:0;border-radius:10px;padding:13px;font-weight:700;font-size:15px}}.p:hover{{background:var(--blue2)}}
.s{{text-align:center;font-size:11.5px;color:var(--ink3)}}.ok{{text-align:center;padding:30px 18px}}.ok i{{display:inline-grid;place-items:center;width:64px;height:64px;border-radius:50%;background:var(--green);color:#fff;font-style:normal;font-size:30px;box-shadow:0 0 0 10px #E3F6EC}}</style></head>
<body><div class=c><div class=r>Test mode · mock checkout · no real money</div>
<div class=h><small>Meera's Bakes</small><b class=d>Payment link</b></div>
<div class=b id=b><p>Mock checkout for link <code>{html.escape(link_id)}</code>. With Razorpay test keys, links open Razorpay's own test checkout instead.</p>
<button class=p id=pay>Pay now</button><div class=s>Prototype page</div></div></div>
<script>document.getElementById("pay").onclick=()=>fetch({url},{{method:"POST"}}).then(()=>{{document.getElementById("b").outerHTML='<div class=ok><i>✓</i><h2>Paid (test)</h2><p>You can close this page.</p></div>'}})</script></body></html>"""


@app.get("/shop/{shop_id}", response_class=HTMLResponse)
def shop_page(shop_id: str) -> str:
    """The seller's shop page, built from the published menu, in the style of a Razorpay Payment Page."""
    st = next((x.store for x in reversed(list(SESSIONS.values())) if x.store.catalogue), None) or Store(start_phase="month3")
    m = st.merchant
    rows = []
    for c in st.catalogue:
        name = html.escape(c["name"])
        pack = c.get("pack") or ""
        bits = [html.escape(pack)] if pack and pack.lower() not in c["name"].lower() else []
        if c.get("eggless_extra"):
            bits.append(f"eggless +₹{inr(c['eggless_extra'])}")
        rows.append(f"<li data-price='{int(c['price'])}'><div><b>{name}</b><small>{' · '.join(bits)}</small></div>"
                    f"<span class=pr>₹{inr(c['price'])}</span><span class=q><button aria-label='Remove one'>−</button><em>0</em>"
                    f"<button aria-label='Add one'>+</button></span></li>")
    return PAGE_HEAD.format(title=html.escape(m["name"])) + f"""
<style>.w{{max-width:1040px;margin:0 auto;padding:32px 20px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,440px);gap:28px;align-items:start}}
.l{{background:radial-gradient(130% 120% at 0% 0%,#FFE1EA,transparent 60%),linear-gradient(135deg,#FFF4EC,#FFE9F0);border-radius:18px;padding:28px;border:1px solid #F5E1E6}}
.lg{{width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#FF8FB1,#E0477A);color:#fff;font-weight:800;display:grid;place-items:center;box-shadow:0 8px 18px #e0477a44}}
h1{{font-family:Lora,Georgia,serif;font-style:italic;font-weight:600;color:#8F2E52;font-size:34px;margin:16px 0 6px}}.l p{{color:#6F5560;margin:0 0 6px}}
.tags{{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}}.tags span{{background:#fff;border-radius:999px;padding:4px 11px;font-size:12.5px;color:#8F2E52;font-weight:500}}
.card{{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 1px 2px #0d1b3e0f,0 10px 30px #0d1b3e10;overflow:hidden}}
.ch{{padding:16px 20px;border-bottom:1px solid var(--line2);font-weight:700;font-size:16px}}ul{{list-style:none;margin:0;padding:4px 20px}}
li{{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line2)}}li:last-child{{border:0}}
li b{{display:block;font-weight:600}}li small{{color:var(--ink3);font-size:12px}}.pr{{font-weight:700;white-space:nowrap}}
.q{{display:flex;align-items:center;border:1px solid var(--line);border-radius:9px}}.q button{{border:0;background:none;width:30px;height:30px;color:var(--blue);font-size:17px;font-weight:600}}
.q em{{font-style:normal;min-width:18px;text-align:center;font-weight:600}}.ft{{padding:16px 20px;background:#FAFBFD;border-top:1px solid var(--line2);display:flex;flex-direction:column;gap:12px}}
.tot{{display:flex;justify-content:space-between;font-weight:700;font-size:16px}}.go{{border:0;border-radius:10px;background:var(--blue);color:#fff;font-weight:700;padding:13px;font-size:15px}}
.go:disabled{{background:#AFC0F5;cursor:not-allowed}}.go:not(:disabled):hover{{background:var(--blue2)}}.sec{{text-align:center;font-size:12px;color:var(--ink3)}}.sec b{{color:var(--ink);font-style:italic}}
.note{{font-size:12px;color:var(--ink3);text-align:center;margin-top:14px}}@media(max-width:820px){{.w{{grid-template-columns:minmax(0,1fr);padding:16px}}h1{{font-size:28px}}}}</style></head>
<body><div class=w><section class=l><div class=lg>MB</div><h1>{html.escape(m['name'])}</h1>
<p>Home baked in {html.escape(m['base_area'])}, {html.escape(m['city'])}.</p><p>Order 2 days ahead. Delivery across East Bengaluru, or pick up in {html.escape(m['base_area'])}.</p>
<div class=tags><span>Eggless options</span><span>Diwali hampers</span><span>Pay by UPI or card</span></div></section>
<section class=card><div class=ch>Your order</div><ul id=items>{''.join(rows)}</ul>
<div class=ft><div class=tot><span>Total</span><span id=tot>₹0</span></div><button class=go id=go disabled>Order on WhatsApp</button>
<div class=sec>🔒 Payments secured by <b class=d>Razorpay</b></div></div></section></div>
<p class=note>Prototype page with synthetic data. Delivery fee and advance are worked out by RAY on WhatsApp.</p>
<script>const f=n=>"₹"+n.toLocaleString("en-IN");const items=[...document.querySelectorAll("#items li")];
function up(){{let t=0;items.forEach(li=>t+=li.dataset.price*+li.querySelector("em").textContent);document.getElementById("tot").textContent=f(t);document.getElementById("go").disabled=!t}}
document.getElementById("go").onclick=()=>alert("Prototype: in the full product this opens WhatsApp with your order filled in, and RAY replies with a Razorpay payment link.");
items.forEach(li=>{{const [m,p]=li.querySelectorAll("button"),e=li.querySelector("em");m.onclick=()=>{{e.textContent=Math.max(0,+e.textContent-1);up()}};p.onclick=()=>{{e.textContent=+e.textContent+1;up()}}}});</script></body></html>"""


@app.get("/api/recordings")
def recordings() -> list[dict]:
    out = []
    for d, kind in ((DEMO_DIR, "demo"), (RUNS_DIR, "run")):
        if d.exists():
            out += [{"name": p.stem, "kind": kind} for p in sorted(d.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)]
    return out


if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="ui")
