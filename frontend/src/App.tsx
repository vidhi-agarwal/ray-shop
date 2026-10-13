import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Ev, STATIC, initial, niceDate, reduce } from "./state";
import { LocalReplay } from "./replay";
import ChatView from "./views/ChatView";
import OrdersView from "./views/OrdersView";
import GrowthView from "./views/GrowthView";
import { IconChat, IconGrowth, IconOrders, IconRestart, RayMark } from "./Icons";

type Mode = "live" | "replay" | "scripted";
type Tab = "chat" | "orders" | "growth";

const INITIAL_URL = STATIC ? "/static/initial.json" : "/api/initial";
const getJson = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); });

async function post(path: string, body: unknown = {}) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
  return r.json();
}

const BADGE: Record<Mode, string> = { live: "Live agent", replay: "Replay of a live run", scripted: "Scripted, no AI" };

const PAGES: { id: Tab; label: string; icon: (p: { size?: number }) => JSX.Element; title: string; sub: string }[] = [
  { id: "chat", label: "On WhatsApp", icon: IconChat, title: "Meera's shop on WhatsApp",
    sub: "AI reads and writes. Code does the money. Meera approves." },
  { id: "orders", label: "Orders & shop", icon: IconOrders, title: "Orders and shop",
    sub: "Every order, payment and screenshot check RAY has handled." },
  { id: "growth", label: "Growth", icon: IconGrowth, title: "Growing with Razorpay",
    sub: "Each next product unlocks from Meera's own sales history." },
];

export default function App() {
  const params = new URLSearchParams(location.search);
  const [health, setHealth] = useState<any>(null);
  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) || "replay");
  const [sid, setSid] = useState<string | null>(null);
  const [state, dispatch] = useReducer(reduce, initial);
  const [tab, setTab] = useState<Tab>("chat");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const es = useRef<EventSource | null>(null);
  const local = useRef<LocalReplay | null>(null);

  useEffect(() => {
    if (STATIC) {
      setMode("replay");
      setHealth({ live_available: false, gateway: "mock", static: true });
    } else {
      fetch("/api/health").then((r) => r.json()).then((h) => { setHealth(h); if (!params.get("mode") && h.live_available) setMode("live"); })
        .catch(() => setError("Backend not reachable. Start it with: uvicorn rayshop.server:app --port 8000"));
    }
    getJson(INITIAL_URL).then((v) => dispatch({ type: "snapshot", view: v, t: 0, seq: -1, mode: "init" }))
      .catch((e) => setError(`Could not load the shop data (${e.message}).`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    setError(null);
    es.current?.close();
    local.current?.stop();
    dispatch({ type: "__reset" } as Ev);
    try {
      if (STATIC) {
        // No backend: play the recorded live run in the browser, with the same pauses as the server's replay.
        const [view, text] = await Promise.all([getJson(INITIAL_URL), fetch("/static/demo.jsonl").then((r) => r.text())]);
        const events = text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
        local.current = new LocalReplay(events, view, (e) => dispatch(e));
        setSid("static");
        return "static";
      }
      const { session_id } = await post("/api/sessions", { mode });
      setSid(session_id);
      const src = new EventSource(`/api/sessions/${session_id}/events`);
      src.onmessage = (m) => dispatch(JSON.parse(m.data) as Ev);
      es.current = src;
      return session_id as string;
    } catch (e: any) { setError(e.message); return null; }
  }, [mode]);

  const ensure = useCallback(async () => sid ?? (await start()), [sid, start]);

  const runStep = useCallback(async (step: any) => {
    const id = await ensure();
    if (!id) return;
    setDone((d) => [...d, step.id]);
    if (local.current) { if (step.kind === "time_skip") local.current.release("time_skip"); else local.current.send(); return; }
    if (step.kind === "time_skip") await post(`/api/sessions/${id}/skip`).catch((e) => setError(e.message));
    else await post(`/api/sessions/${id}/messages`, { text: step.text, images: step.images ?? [] }).catch((e) => setError(e.message));
  }, [ensure]);

  const sendText = useCallback(async (text: string) => {
    const id = await ensure();
    if (local.current) return; // replay only takes the demo steps
    if (id) await post(`/api/sessions/${id}/messages`, { text, images: [] }).catch((e) => setError(e.message));
  }, [ensure]);

  const approve = useCallback(async (aid: string, ok: boolean, note = "") => {
    if (local.current) { local.current.resolve(aid, ok, note); return; }
    if (sid) await post(`/api/sessions/${sid}/approvals/${aid}`, { approve: ok, note }).catch((e) => setError(e.message));
  }, [sid]);

  const pay = useCallback(async (linkId: string) => {
    if (local.current) { local.current.release("payment_received"); return; }
    if (sid) await post(`/api/sessions/${sid}/pay/${linkId}`).catch((e) => setError(e.message));
  }, [sid]);

  const restart = () => { es.current?.close(); local.current?.stop(); local.current = null; setSid(null); setDone([]); dispatch({ type: "__reset" } as Ev);
    getJson(INITIAL_URL).then((v) => dispatch({ type: "snapshot", view: v, t: 0, seq: -1, mode: "init" })).catch((e) => setError(e.message)); };

  const pending = state.seller.some((c) => c.kind === "approval" && c.status === "pending");

  const page = PAGES.find((x) => x.id === tab)!;
  const day = state.phase === "onboarding" ? "Day 1" : niceDate(state.today);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <RayMark />
          <div className="brand-text">
            <span className="brand-name">RAY Shop</span>
            <span className="brand-sub">on Razorpay</span>
          </div>
        </div>
        <div className="merchant" title="Meera's Bakes, a fictional home bakery">
          <span className="merchant-logo" aria-hidden>MB</span>
          <span className="merchant-text"><b>Meera's Bakes</b><small>Home bakery, Bengaluru</small></span>
        </div>
        <nav className="nav" role="tablist" aria-label="Sections">
          {PAGES.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "nav-item on" : "nav-item"}
              onClick={() => setTab(id)} title={label}>
              <Icon size={19} />
              <span className="nav-label">{label}</span>
              {id === "chat" && pending && <span className="nav-dot" aria-label="approval waiting" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="foot-pill">Prototype</span>
          <p>All data is synthetic. Meera, her customers and orders are fictional.</p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="page-head">
            <h1>{page.title}</h1>
            <p>{page.sub}</p>
          </div>
          <div className="top-actions">
            <span className="day-pill">{day}</span>
            {!sid ? (
              <label className="mode-select">
                <span className={`mode-dot mode-${mode}`} aria-hidden />
                <select aria-label="Run mode" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                  <option value="replay">Replay of a live run</option>
                  <option value="live" disabled={health && !health.live_available}>Live agent{health?.static ? " (run locally)" : health && !health.live_available ? " (needs API key)" : ""}</option>
                  <option value="scripted" disabled={!!health?.static}>Scripted, no AI{health?.static ? " (run locally)" : ""}</option>
                </select>
              </label>
            ) : <span className={`mode-badge mode-${mode}`}><span className="mode-dot" aria-hidden />{BADGE[mode]}</span>}
            {sid && <button className="btn-secondary" onClick={restart}><IconRestart size={15} />Restart</button>}
          </div>
        </header>
        {error && <div className="banner" role="alert">{error}</div>}
        <main key={tab}>
          {tab === "chat" && <ChatView state={state} mode={mode} started={!!sid} done={done} runStep={runStep} sendText={sendText}
            approve={approve} pay={pay} gateway={health?.gateway} />}
          {tab === "orders" && <OrdersView state={state} />}
          {tab === "growth" && <GrowthView state={state} />}
        </main>
      </div>
    </div>
  );
}
