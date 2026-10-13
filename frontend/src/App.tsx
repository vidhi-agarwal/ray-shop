import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Ev, Moment, STATIC, State, buildStory, initial, niceDate, parseJsonl, reduce } from "./state";
import { LocalReplay } from "./replay";
import ChatView from "./views/ChatView";
import OrdersView from "./views/OrdersView";
import GrowthView from "./views/GrowthView";
import Overview from "./views/Overview";
import HowItWorks from "./views/HowItWorks";
import { IconBolt, IconChat, IconGrowth, IconOrders, IconRestart, RayMark } from "./Icons";

type Mode = "live" | "replay" | "scripted";
type Tab = "overview" | "demo" | "orders" | "growth" | "how";

const INITIAL_URL = STATIC ? "/static/initial.json" : "/api/initial";
const getJson = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); });

async function post(path: string, body: unknown = {}) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
  return r.json();
}

const BADGE: Record<Mode, string> = { live: "Live agent", replay: "Replay of a live run", scripted: "Scripted, no AI" };

const IconHome = (p: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={p.size ?? 18} height={p.size ?? 18} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 10.5L12 4l8 6.5V20H4z" /><path d="M10 20v-5h4v5" />
  </svg>
);
const IconBook = (p: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={p.size ?? 18} height={p.size ?? 18} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
  </svg>
);

const PAGES: { id: Tab; label: string; icon: (p: { size?: number }) => JSX.Element; title: string; sub: string }[] = [
  { id: "overview", label: "Overview", icon: IconHome, title: "Overview",
    sub: "Everything RAY did for Meera's Bakes, and what it means for Razorpay." },
  { id: "demo", label: "Try it live", icon: IconChat, title: "Try it live",
    sub: "Play the recorded run step by step. Claude reads and writes, code does the money, Meera approves." },
  { id: "orders", label: "Orders & shop", icon: IconOrders, title: "Orders and shop",
    sub: "Every order, payment link and screenshot check RAY has handled." },
  { id: "growth", label: "Growth", icon: IconGrowth, title: "Growing with Razorpay",
    sub: "Each next Razorpay product unlocks from Meera's own sales history." },
  { id: "how", label: "How it works", icon: IconBook, title: "How it works",
    sub: "The idea, where AI is used, and what is real in this prototype." },
];
const OTHER_NAV = ["Home", "Transactions", "Settlements", "Reports"];
const PRODUCTS = ["Payment Links", "Payment Pages", "Razorpay.me Link", "Invoices", "Magic Checkout", "Subscriptions", "QR Codes"];
const tabFromHash = (): Tab => {
  const h = location.hash.replace(/^#\/?/, "");
  return (PAGES.some((x) => x.id === h) ? h : "overview") as Tab;
};

export default function App() {
  const params = new URLSearchParams(location.search);
  const [health, setHealth] = useState<any>(null);
  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) || "replay");
  const [sid, setSid] = useState<string | null>(null);
  const [state, dispatch] = useReducer(reduce, initial);
  const [tab, setTabState] = useState<Tab>(tabFromHash);
  const [story, setStory] = useState<{ final: State; moments: Moment[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [auto, setAuto] = useState(false);
  const es = useRef<EventSource | null>(null);
  const local = useRef<LocalReplay | null>(null);

  const setTab = useCallback((t: Tab) => { setTabState(t); history.replaceState(null, "", `#${t}`); }, []);
  useEffect(() => {
    const onHash = () => setTabState(tabFromHash());
    window.addEventListener("hashchange", onHash);
    // The recorded run, played instantly, gives the overview, orders and growth their finished numbers.
    fetch("/static/demo.jsonl").then((r) => r.text()).then((t) => setStory(buildStory(parseJsonl(t))))
      .catch(() => setError("Could not load the recorded run."));
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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

  const restart = () => { setAuto(false); es.current?.close(); local.current?.stop(); local.current = null; setSid(null); setDone([]); dispatch({ type: "__reset" } as Ev);
    getJson(INITIAL_URL).then((v) => dispatch({ type: "snapshot", view: v, t: 0, seq: -1, mode: "init" })).catch((e) => setError(e.message)); };

  const pending = state.seller.some((c) => c.kind === "approval" && c.status === "pending");

  const page = PAGES.find((x) => x.id === tab)!;
  const day = state.phase === "onboarding" ? "Day 1" : niceDate(state.today);
  // Before a step-by-step run starts, the dashboards show the shop as the recorded run left it.
  const shown = sid || !story ? state : story.final;
  const playAgain = () => { restart(); setAuto(true); };
  // "play" opens the demo and runs it hands-free, from the start.
  const go = (t: string) => {
    if (t === "play") { setTab("demo"); if (sid) playAgain(); else setAuto(true); return; }
    setTab(t as Tab);
  };

  return (
    <div className="app">
      <header className="rzp-top">
        <div className="rzp-brand"><RayMark size={22} /><span className="rzp-word">Razorpay</span></div>
        <nav className="rzp-products" aria-label="Razorpay">
          <span className="rzp-prod off" title="Not part of this demo"><IconHome size={16} />Razorpay Home</span>
          <span className="rzp-prod on"><IconOrders size={16} />Payments</span>
          <span className="rzp-prod off" title="Not part of this demo">More<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg></span>
        </nav>
        <div className="rzp-right">
          <span className="rzp-test"><span className="mode-dot" />Test mode</span>
          <span className="rzp-search" aria-hidden><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>Search payment products, settings, and more</span>
          <span className="rzp-avatar" title="Meera's Bakes">MB</span>
        </div>
      </header>
      <div className="frame">
        <aside className="sidebar">
          {OTHER_NAV.map((n, i) => <span key={n} className="nav-item off" title="Not part of this demo">{[<IconHome key="h" size={17} />, <IconBolt key="t" size={17} />, <IconGrowth key="s" size={17} />, <IconBook key="r" size={17} />][i]}{n}</span>)}
          <div className="nav-label-row">Payment products</div>
          <button className="nav-item on" onClick={() => setTab("overview")}><RayMark size={17} />RAY Shop<span className="nav-new">New</span>{pending && <span className="nav-dot" aria-label="approval waiting" />}</button>
          {PRODUCTS.map((n) => <span key={n} className="nav-item off" title="Not part of this demo"><IconOrders size={17} />{n}</span>)}
        </aside>
        <div className="workspace">
          {error && <div className="banner" role="alert">{error}</div>}
          <main key={tab}>
            <div className={`page ${tab === "demo" ? "page-demo" : ""}`}>
              <div className="page-bar">
                <nav className="tabs" role="tablist" aria-label="RAY Shop">
                  {PAGES.map(({ id, label }) => (
                    <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "tab on" : "tab"} onClick={() => setTab(id)}>
                      {label}{id === "demo" && pending && <span className="nav-dot" aria-label="approval waiting" />}
                    </button>
                  ))}
                </nav>
                {tab === "demo" ? (
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
                ) : <span className="demo-note">Demo account. Meera's Bakes and every payment here are made up.</span>}
              </div>
              {tab !== "overview" && (
                <div className="page-head"><div><h1>{page.title}</h1><p>{page.sub}</p></div></div>
              )}
              {tab === "overview" && <Overview story={story} go={go} />}
              {tab === "demo" && <ChatView state={state} mode={mode} started={!!sid} done={done} runStep={runStep} sendText={sendText}
                approve={approve} pay={pay} gateway={health?.gateway} auto={auto} setAuto={setAuto} playAgain={playAgain} />}
              {tab === "orders" && <OrdersView state={shown} />}
              {tab === "growth" && <GrowthView state={shown} />}
              {tab === "how" && <HowItWorks go={go} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
