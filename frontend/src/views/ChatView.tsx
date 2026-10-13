import { useEffect, useRef, useState } from "react";
import { APPROVAL_LABEL, ChatMsg, LADDER, SellerItem, State, TOOL_LABEL, TraceItem, imageSrc, imageUrl, inr, niceDate, packLabel, thread } from "../state";
import {
  IconBack, IconBank, IconBolt, IconCamera, IconCard, IconChat, IconCheck, IconClock, IconForward, IconLock, IconPlay,
  IconSend, IconShield, IconWallet, IconWarn, RayMark,
} from "../Icons";

type Props = {
  state: State; mode: string; started: boolean; done: string[]; gateway?: string;
  runStep: (s: any) => void; sendText: (t: string) => void;
  approve: (id: string, ok: boolean, note?: string) => void; pay: (linkId: string) => void;
  auto: boolean; setAuto: (on: boolean) => void; playAgain: () => void;
};

// Autoplay pacing: time to read each moment before the next click happens on its own.
const AUTO = { firstStep: 500, nextStep: 2800, afterSkip: 1800, press: 1500, approve: 450, openPay: 1500, submitPay: 1600 };

const FWD = /^\[Forwarded from ([^,\]]+),?\s*([^\]]*)\]\n?([\s\S]*)$/;
export const clean = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s/gm, "");

// Keep the newest message in view without scrolling the whole page.
function useStickToBottom<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [dep]);
  return ref;
}

export default function ChatView(p: Props) {
  const script: any[] = p.state.view?.script ?? [];
  const next = script.find((s) => !p.done.includes(s.id));
  const waitingForApproval = p.state.seller.some((c) => c.kind === "approval" && c.status === "pending");
  const replay = p.mode === "replay";
  // In replay the recording only moves on at the gate it is waiting at, so the next step must match it.
  const gateOpen = !replay || !p.started || (!!p.state.waiting && !!next &&
    (p.state.waiting.next === "time_skip" ? next.kind === "time_skip" : p.state.waiting.next === "message" && next.kind !== "time_skip"));
  const canStep = !!next && !p.state.busy && !waitingForApproval && gateOpen;
  const waitingForPay = replay && p.state.waiting?.next === "payment_received";
  const pendingCard = p.state.seller.find((c): c is Extract<SellerItem, { kind: "approval" }> => c.kind === "approval" && c.status === "pending");
  const finished = script.length > 0 && p.done.length >= script.length && !p.state.busy && !pendingCard && !waitingForPay;
  const [pressing, setPressing] = useState<string | null>(null);

  // Autoplay: the same clicks a presenter would make, with time to read in between.
  useEffect(() => {
    if (!p.auto) return;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    if (pendingCard) {
      later(AUTO.press, () => setPressing(pendingCard.id));
      later(AUTO.press + AUTO.approve, () => { setPressing(null); p.approve(pendingCard.id, true); });
    } else if (canStep && next) {
      const prev = script[script.indexOf(next) - 1];
      later(p.done.length === 0 ? AUTO.firstStep : prev?.kind === "time_skip" ? AUTO.afterSkip : AUTO.nextStep, () => p.runStep(next));
    } else if (finished) {
      p.setAuto(false);
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.auto, pendingCard?.id, canStep, next?.id, finished]);

  const status = waitingForApproval ? "approve" : waitingForPay ? "pay" : p.state.busy ? "busy" : finished || (!next && script.length) ? "done" : "ready";
  return (
    <div className="chatview">
      <StepBar script={script} done={p.done} next={next} canStep={canStep} runStep={p.runStep} status={status}
        auto={p.auto} setAuto={p.setAuto} playAgain={p.playAgain} />
      <div className="stage">
        <SellerPhone {...p} waitingForApproval={waitingForApproval} pressing={pressing} />
        <CustomerPhone state={p.state} pay={p.pay} gateway={p.gateway} mode={p.mode} waitingForPay={waitingForPay} auto={p.auto} />
        <Trace state={p.state} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ demo steps

const SHORT: Record<string, string> = {
  menu: "Menu photo", skip: "3 months later", riya: "Riya's order", arjun: "Fake screenshot",
  unpaid: "Reminders", diwali: "Diwali plan", kavya: "Bulk order",
};

function stepIcon(s: any) {
  if (s.kind === "time_skip") return <IconClock size={15} />;
  if (s.images?.length) return <IconCamera size={15} />;
  if (s.text?.startsWith("[Forwarded")) return <IconForward size={15} />;
  return <IconChat size={15} />;
}

const AUTO_STATUS: Record<string, string> = {
  ready: "Playing", busy: "RAY is working", approve: "Meera approves", pay: "The customer pays", done: "Demo complete",
};

const STATUS: Record<string, string> = {
  ready: "Tap the blue step",
  busy: "RAY is working",
  approve: "Approve the card in Meera's chat",
  pay: "Tap Pay on the customer's phone",
  done: "Demo complete",
};

function StepBar({ script, done, next, canStep, runStep, status, auto, setAuto, playAgain }:
  { script: any[]; done: string[]; next: any; canStep: boolean; runStep: (s: any) => void; status: string;
    auto: boolean; setAuto: (on: boolean) => void; playAgain: () => void }) {
  return (
    <section className="stepbar" aria-label="Demo steps">
      <div className="stepbar-head">
        <span className="eyebrow">Demo</span>
        <span className="stepbar-count">{Math.min(done.length + (next ? 1 : 0), script.length)} of {script.length}</span>
      </div>
      <ol className="steps">
        {script.map((s, i) => {
          const isDone = done.includes(s.id);
          const isNext = next?.id === s.id;
          return (
            <li key={s.id}>
              <button className={`step ${isDone ? "done" : ""} ${isNext ? "next" : ""} ${isNext && canStep ? "go" : ""}`}
                disabled={!isNext || !canStep} onClick={() => runStep(s)} title={s.label}>
                <span className="step-num">{isDone ? <IconCheck size={13} /> : isNext && canStep ? <IconPlay size={11} /> : i + 1}</span>
                <span className="step-icon">{stepIcon(s)}</span>
                <span className="step-label">{SHORT[s.id] ?? s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className={`stepbar-status st-${status}`} role="status">
        {(status === "busy" || (auto && status !== "done")) && <span className="spinner" aria-hidden />}
        {status === "done" && <IconCheck size={15} />}
        {(auto ? AUTO_STATUS : STATUS)[status]}
      </div>
      {status === "done"
        ? <button className="btn-secondary play-btn" onClick={playAgain}><IconPlay size={12} />Play again</button>
        : auto
          ? <button className="btn-secondary play-btn" onClick={() => setAuto(false)}><span className="pause-icon" aria-hidden />Pause</button>
          : <button className="btn-primary play-btn" onClick={() => setAuto(true)}><IconPlay size={12} />Play all</button>}
    </section>
  );
}

// ------------------------------------------------------------------ phone frame

export function StatusBar() {
  return (
    <div className="statusbar" aria-hidden>
      <span>9:41</span>
      <span className="sb-icons">
        <svg viewBox="0 0 18 12" width="17" height="11"><path d="M1 11h2V8H1zM5 11h2V6H5zM9 11h2V3.5H9zM13 11h2V1h-2z" fill="currentColor" /></svg>
        <svg viewBox="0 0 16 12" width="15" height="11"><path d="M8 11.2l2.2-2.6a3.2 3.2 0 0 0-4.4 0zM3.4 6.6a6.6 6.6 0 0 1 9.2 0l1.4-1.6a8.7 8.7 0 0 0-12 0zM.4 3.2a11 11 0 0 1 15.2 0L16 2.7A12.4 12.4 0 0 0 0 2.7z" fill="currentColor" /></svg>
        <svg viewBox="0 0 26 12" width="24" height="11"><rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".5" /><rect x="2" y="2" width="17" height="8" rx="1.6" fill="currentColor" /><path d="M24 4v4c.8-.3 1.4-1 1.4-2s-.6-1.7-1.4-2z" fill="currentColor" opacity=".5" /></svg>
      </span>
    </div>
  );
}

// ------------------------------------------------------------------ Meera's phone

function SellerPhone({ state, mode, sendText, approve, waitingForApproval, pressing }: Props & { waitingForApproval: boolean; pressing: string | null }) {
  const [text, setText] = useState("");
  const chat = useStickToBottom<HTMLDivElement>(`${state.seller.length}-${state.busy}`);
  const replay = mode === "replay";
  return (
    <section className="device-col" aria-label="Meera's WhatsApp chat with RAY">
      <div className="device-cap"><span className="cap-who">Meera's phone</span><span className="cap-role">Seller</span></div>
      <div className="device">
        <StatusBar />
        <div className="wa-head">
          <span className="wa-back" aria-hidden><IconBack size={20} /></span>
          <span className="wa-avatar ray" aria-hidden><RayMark size={34} /></span>
          <div className="wa-title">
            <div className="wa-name">RAY by Razorpay <span className="verified" aria-label="verified business"><IconCheck size={10} /></span></div>
            <div className="wa-sub">{state.busy ? "typing..." : "Business account"}</div>
          </div>
        </div>
        <div className="wa-chat" role="log" aria-live="polite" ref={chat}>
          <div className="wa-date">{state.phase === "onboarding" ? "Day 1" : niceDate(state.today)}</div>
          {state.seller.length === 0 && (
            <div className="wa-sys">Meera sells cupcakes from her home kitchen through Instagram DMs and WhatsApp. No website. Start the demo with the first step above.</div>
          )}
          {state.seller.map((m, i) => <SellerBubble key={i} m={m} approve={approve} replay={replay} pressing={pressing} />)}
          {state.busy && !waitingForApproval && <div className="typing" aria-label="RAY is working"><span /><span /><span /></div>}
        </div>
        <form className="wa-composer" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { sendText(text.trim()); setText(""); } }}>
          <input aria-label="Message RAY" value={text} onChange={(e) => setText(e.target.value)} disabled={replay || state.busy}
            placeholder={replay ? "Replay: use the demo steps" : "Message"} />
          <button type="submit" disabled={replay || state.busy || !text.trim()} aria-label="Send"><IconSend size={18} /></button>
        </form>
      </div>
    </section>
  );
}

export function SellerBubble({ m, approve, replay, pressing }: { m: SellerItem; approve: Props["approve"]; replay: boolean; pressing?: string | null }) {
  if (m.kind === "skip") {
    return (
      <div className="skip">
        <div className="skip-icon"><IconClock size={18} /></div>
        <div><b>Three months later</b><span>{niceDate(m.today)}. Meera's shop has been running on RAY Shop since July.</span></div>
      </div>
    );
  }
  if (m.kind === "ray") {
    if (m.system) {
      return (
        <div className="bubble in notify">
          <div className="notify-head"><span className="notify-dot"><IconCheck size={11} /></span>Payment captured on Razorpay</div>
          {clean(m.text).replace(/^✅\s*/, "")}
        </div>
      );
    }
    return <div className="bubble in">{clean(m.text)}</div>;
  }
  if (m.kind === "meera") {
    const f = FWD.exec(m.text);
    return (
      <div className={`bubble out ${m.images.length ? "has-img" : ""}`}>
        {f && <div className="fwd"><IconForward size={12} /> Forwarded from {f[1]}{f[2] ? `, ${f[2]}` : ""}</div>}
        {m.images.map((id) => <img key={id} src={imageUrl(id)} alt="" className="att" />)}
        <div>{f ? f[3] : m.text}</div>
        <span className="ticks" aria-hidden>✓✓</span>
      </div>
    );
  }
  return <ApprovalCard m={m} approve={approve} replay={replay} pressing={pressing === m.id} />;
}

function ApprovalCard({ m, approve, replay, pressing }: { m: Extract<SellerItem, { kind: "approval" }>; approve: Props["approve"]; replay: boolean; pressing?: boolean }) {
  const d = m.detail || {};
  const title: Record<string, string> = {
    publish_shop: "Publish your shop?", send_payment_link: `Send payment link to ${d.quote?.customer ?? "customer"}?`,
    send_customer_message: `Send this to ${d.customer ?? "the customer"}?`, send_broadcast: `Send to ${d.recipients} customers?`,
  };
  const ok: Record<string, string> = { publish_shop: "Publish shop", send_payment_link: "Send payment link", send_customer_message: "Send message", send_broadcast: "Send broadcast" };
  return (
    <div className={`approval ${m.status}`}>
      <div className="approval-kicker">
        {m.status === "pending" ? <><IconShield size={14} />Needs your approval</> : m.status === "approved" ? <><IconCheck size={14} />Approved</> : "Not sent"}
      </div>
      <div className="approval-title">{title[m.tool] ?? "Approve?"}</div>
      {m.tool === "publish_shop" && (
        <ul className="menu-list">
          {(d.items ?? []).map((it: any) => {
            const pack = packLabel(it.name, it.pack);
            return <li key={it.sku}><span>{it.name}{pack ? <small>{pack}</small> : null}</span><b>{inr(it.price)}</b></li>;
          })}
        </ul>
      )}
      {m.tool === "send_payment_link" && d.quote && (
        <>
          <table className="bill">
            <tbody>
              {d.quote.lines.map((l: any, i: number) => (
                <tr key={i}><td>{l.qty} x {l.name}{l.eggless ? " (eggless)" : ""}</td><td>{inr(l.amount)}</td></tr>
              ))}
              {d.quote.delivery_fee > 0 && <tr><td>Delivery, {d.quote.area}</td><td>{inr(d.quote.delivery_fee)}</td></tr>}
              <tr className="tot"><td>Total</td><td>{inr(d.quote.total)}</td></tr>
              {d.quote.due_now < d.quote.total && <tr className="adv"><td>Advance now</td><td>{inr(d.quote.due_now)}</td></tr>}
            </tbody>
          </table>
          <div className="rule-note"><IconShield size={13} />Priced by Meera's rules, not by AI. {niceDate(d.quote.date)}{d.quote.time ? `, ${d.quote.time}` : ""}.</div>
          <div className="preview">{d.message}</div>
        </>
      )}
      {(m.tool === "send_customer_message" || m.tool === "send_broadcast") && (
        <>
          <div className="preview">{d.message}</div>
          {m.tool === "send_broadcast" && <div className="rule-note"><IconShield size={13} />Only customers who said yes to offers. {d.skipped} skipped.</div>}
          {d.order_id && <div className="rule-note"><IconCard size={13} />Payment link for {d.order_id} attached.</div>}
        </>
      )}
      {m.status === "pending" ? (
        <div className="approval-actions">
          <button className={`btn-primary ${pressing ? "pressing" : ""}`} onClick={() => approve(m.id, true)}>{ok[m.tool] ?? "Approve"}</button>
          {!replay && <button className="btn-secondary" onClick={() => approve(m.id, false, "Not now")}>Not now</button>}
        </div>
      ) : <div className="approval-done">{m.status === "approved" ? `You approved: ${APPROVAL_LABEL[m.tool]}` : "You said not now"}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ customer's phone

function CustomerPhone({ state, pay, gateway, mode, waitingForPay, auto }:
  { state: State; pay: (id: string) => void; gateway?: string; mode: string; waitingForPay: boolean; auto: boolean }) {
  const names = Object.keys(state.chats).filter((n) => state.chats[n].length);
  const [pick, setPick] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ id: string; amount: number; customer: string } | null>(null);
  useEffect(() => { setPick(null); }, [state.activeCustomer]);
  const who = pick ?? state.activeCustomer ?? names[names.length - 1];
  const msgs: ChatMsg[] = who ? state.chats[who] ?? [] : [];
  const chat = useStickToBottom<HTMLDivElement>(`${msgs.length}-${who}`);
  const paidLinks = new Set(state.orders.filter((o) => o.payment_status !== "unpaid").map((o) => o.payment_link?.id));
  // Real Razorpay test links are paid on Razorpay's own checkout; everything else uses the labelled mock sheet.
  const realLinks = gateway === "razorpay_test" && mode !== "replay";
  // A replay only records one payment, from the customer it is waiting on.
  const payable = mode !== "replay" || (waitingForPay && who === state.activeCustomer);
  const open = (link: NonNullable<ChatMsg["link"]>) => {
    if (realLinks && /^https?:/.test(link.url)) window.open(link.url, "_blank", "noopener");
    else setCheckout({ id: link.id, amount: link.amount, customer: who ?? "" });
  };
  // Autoplay: the customer opens the newest unpaid link and pays it.
  const due = [...msgs].reverse().find((m) => m.link && !paidLinks.has(m.link.id))?.link;
  useEffect(() => {
    if (!auto || !waitingForPay || !payable || checkout || !due) return;
    const t = window.setTimeout(() => setCheckout({ id: due.id, amount: due.amount, customer: who ?? "" }), AUTO.openPay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, waitingForPay, payable, checkout, due?.id]);
  return (
    <section className="device-col" aria-label="Customer's chat with Meera's Bakes">
      <div className="device-cap">
        <span className="cap-who">{who ? `${who.split(" ")[0]}'s phone` : "Customer's phone"}</span>
        {names.length > 1 ? (
          <span className="cap-tabs" role="tablist" aria-label="Switch customer">
            {names.map((n) => <button key={n} role="tab" aria-selected={n === who} className={n === who ? "on" : ""} onClick={() => setPick(n)}>{n.split(" ")[0]}</button>)}
          </span>
        ) : <span className="cap-role">Customer</span>}
      </div>
      <div className="device">
        <StatusBar />
        <div className="wa-head">
          <span className="wa-back" aria-hidden><IconBack size={20} /></span>
          <span className="wa-avatar shop" aria-hidden>MB</span>
          <div className="wa-title">
            <div className="wa-name">Meera's Bakes <span className="verified" aria-label="business"><IconCheck size={10} /></span></div>
            <div className="wa-sub">Business account</div>
          </div>
        </div>
        <div className="wa-chat" ref={chat}>
          {!who && <div className="wa-sys">What customers see appears here: payment links, reminders and offers, sent only after Meera approves.</div>}
          {msgs.map((m, i) => (
            <div key={i} className={`bubble ${m.from === "customer" ? "out" : "in"} ${m.link ? "has-link" : ""}`}>
              {m.images?.map((id) => <img key={id} src={imageUrl(id)} alt="" className="att" />)}
              <div>{clean(m.text)}</div>
              {m.link && (
                <PayLinkCard amount={m.link.amount} paid={paidLinks.has(m.link.id)} tag={realLinks ? "Test mode" : "Mock link"}>
                  <button className={`rzp-pay ${payable && waitingForPay ? "attn" : ""}`} onClick={() => open(m.link!)}
                    disabled={!payable} title={payable ? undefined : "This customer doesn't pay in the recorded demo"}>
                    Pay {inr(m.link.amount)}</button>
                </PayLinkCard>
              )}
              {m.from === "customer" && <span className="ticks" aria-hidden>✓✓</span>}
            </div>
          ))}
        </div>
        <div className="wa-composer">
          <input aria-label="Customer message" disabled placeholder="Message" />
          <button type="button" disabled aria-label="Send"><IconSend size={18} /></button>
        </div>
        {checkout && <Checkout {...checkout} auto={auto} onPaid={() => pay(checkout.id)} onClose={() => setCheckout(null)} />}
      </div>
    </section>
  );
}

// A Razorpay payment link as it previews in the customer's WhatsApp.
export function PayLinkCard({ amount, paid, tag, children }: { amount: number; paid: boolean; tag: string; children?: React.ReactNode }) {
  return (
    <div className={`rzp-link ${paid ? "is-paid" : ""}`}>
      <div className="rzp-link-head">
        <span className="rzp-word">Razorpay</span>
        <span className="rzp-tag">{tag}</span>
      </div>
      <div className="rzp-link-body">
        <span>Meera's Bakes</span>
        <b>{inr(amount)}</b>
      </div>
      {paid ? <div className="rzp-paid"><IconCheck size={15} />Paid</div> : children}
    </div>
  );
}

// A mock of Razorpay's mobile checkout, clearly marked as a test. It never touches real money.
function Checkout({ amount, customer, onPaid, onClose, auto }: { id: string; amount: number; customer: string; onPaid: () => void; onClose: () => void; auto?: boolean }) {
  const [stage, setStage] = useState<"options" | "processing" | "success">("options");
  const [method, setMethod] = useState("upi");
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const [pressingPay, setPressingPay] = useState(false);
  useEffect(() => {
    if (!auto) return;
    const a = window.setTimeout(() => setPressingPay(true), AUTO.submitPay - 400);
    const b = window.setTimeout(() => submit(), AUTO.submitPay);
    return () => { clearTimeout(a); clearTimeout(b); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submit = () => {
    setStage("processing");
    timers.current.push(window.setTimeout(() => { onPaid(); setStage("success"); }, 1300));
    timers.current.push(window.setTimeout(onClose, 3200));
  };
  const methods = [
    { id: "upi", label: "UPI", sub: "Google Pay, PhonePe, Paytm and more", icon: <IconBolt size={18} /> },
    { id: "card", label: "Cards", sub: "Visa, Mastercard, RuPay", icon: <IconCard size={18} /> },
    { id: "nb", label: "Netbanking", sub: "All Indian banks", icon: <IconBank size={18} /> },
    { id: "wallet", label: "Wallet", sub: "Paytm, Mobikwik", icon: <IconWallet size={18} /> },
  ];
  return (
    <div className="checkout" role="dialog" aria-label="Razorpay checkout (test)">
      <div className="co-ribbon">Test mode · mock checkout · no real money</div>
      <div className="co-head">
        <div className="co-merchant">
          <span className="co-logo">MB</span>
          <div><b>Meera's Bakes</b><small>{customer ? `Paying as ${customer}` : "Payment"}</small></div>
          {stage === "options" && <button className="co-x" onClick={onClose} aria-label="Close checkout">×</button>}
        </div>
        <div className="co-amount"><small>Amount</small>{inr(amount)}</div>
      </div>
      {stage === "options" && (
        <div className="co-body">
          <div className="co-label">Payment options</div>
          <ul className="co-methods">
            {methods.map((x) => (
              <li key={x.id}>
                <button className={method === x.id ? "on" : ""} onClick={() => setMethod(x.id)}>
                  <span className="co-micon">{x.icon}</span>
                  <span className="co-mtext"><b>{x.label}</b><small>{x.sub}</small></span>
                  <span className="co-radio" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          {method === "upi" && (
            <div className="co-apps" aria-label="UPI apps">
              {[["G", "GPay", "#1a73e8"], ["P", "PhonePe", "#5f259f"], ["P", "Paytm", "#00baf2"], ["B", "BHIM", "#f47920"]].map(([l, n, c]) => (
                <span key={n}><i style={{ background: c }}>{l}</i>{n}</span>
              ))}
            </div>
          )}
          <button className={`co-pay ${pressingPay ? "pressing" : ""}`} onClick={submit}>Pay {inr(amount)}</button>
          <div className="co-secure"><IconLock size={12} />Secured by Razorpay</div>
        </div>
      )}
      {stage === "processing" && (
        <div className="co-state">
          <span className="co-spinner" aria-hidden />
          <b>Processing payment</b>
          <small>Please don't close this page</small>
        </div>
      )}
      {stage === "success" && (
        <div className="co-state ok">
          <span className="co-tick"><IconCheck size={34} /></span>
          <b>Payment successful</b>
          <span className="co-paid">{inr(amount)} paid to Meera's Bakes</span>
          <small>Redirecting to WhatsApp</small>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ trace

export const THREADS: [string, string, (p: { size?: number }) => JSX.Element][] = [
  ["docs", "Photos and menu", IconCamera], ["rules", "Rules, no AI", IconShield], ["razorpay", "Razorpay", IconCard],
  ["shopify", "To customers", IconSend], ["ray", "To Meera", IconChat],
];
const THREAD_ICON: Record<string, (p: { size?: number }) => JSX.Element> = Object.fromEntries(THREADS.map(([k, , I]) => [k, I]));

function Trace({ state }: { state: State }) {
  const list = useStickToBottom<HTMLOListElement>(state.trace.length);
  const tools = state.trace.filter((x): x is Extract<TraceItem, { kind: "tool" }> => x.kind === "tool");
  const blocked = tools.filter((x) => x.ok === false
    || (x.tool === "quote_order" && x.summary && !x.summary.can_send_link)
    || (x.tool === "verify_screenshot" && x.summary && !x.summary.safe_to_start)).length;
  const approvals = state.trace.filter((x) => x.kind === "event" && x.text.startsWith("Meera approved")).length;
  return (
    <section className="trace" aria-label="What the agent is doing">
      <div className="trace-head">
        <div className="trace-title">
          <h2><span className={`live-dot ${state.busy ? "on" : ""}`} aria-hidden />What RAY is doing</h2>
          <p>Claude reads and writes. Code does the money. Meera approves.</p>
        </div>
        <dl className="trace-stats">
          <div title="Tools RAY called"><dt>Steps</dt><dd>{tools.length}</dd></div>
          <div title="Blocked quotes, failed guardrails and fake screenshots"><dt>Blocked</dt><dd className={blocked ? "hot" : ""}>{blocked}</dd></div>
          <div title="Actions Meera approved"><dt>Approved</dt><dd>{approvals}</dd></div>
          <div title="Claude API cost of this run"><dt>Cost</dt><dd>${state.cost.toFixed(2)}</dd></div>
        </dl>
        <ul className="legend">{THREADS.map(([k, l, I]) => <li key={k} className={`th-${k}`}><span className="th-chip"><I size={11} /></span>{l}</li>)}</ul>
      </div>
      <ol className="trace-list" ref={list}>
        {state.trace.length === 0 && (
          <li className="trace-empty">
            <IconBolt size={22} />
            <span>Every step RAY takes shows up here as it happens: what Claude read, what the rules decided, and what went to Razorpay.</span>
          </li>
        )}
        {state.trace.map((it, i) => <Row key={i} it={it} />)}
      </ol>
    </section>
  );
}

export function Row({ it }: { it: TraceItem }) {
  const [open, setOpen] = useState(false);
  const time = <span className="tr-time">{it.t.toFixed(1)}s</span>;
  if (it.kind === "note") {
    return (
      <li className={`tr tr-note ${open ? "open" : ""}`}>
        {time}
        <button className="tr-note-text" onClick={() => setOpen(!open)} aria-expanded={open}>{clean(it.text)}</button>
      </li>
    );
  }
  if (it.kind === "error") return <li className="tr tr-error">{time}<span><IconWarn size={14} /> {it.text}</span></li>;
  if (it.kind === "event") {
    return <li className={`tr tr-event tone-${it.tone}`}>{time}<span className="tr-pill">{it.tone === "ok" ? <IconCheck size={13} /> : <IconClock size={13} />}{it.text}</span></li>;
  }
  if (it.kind === "turn") return <li className="tr tr-turn">{time}<span>Turn done{it.cost ? ` · $${it.cost.toFixed(2)}` : ""}</span></li>;
  const th = thread(it.tool);
  const Icon = THREAD_ICON[th] ?? IconBolt;
  return (
    <li className={`tr tr-tool th-${th} ${it.ok === false ? "tr-failed" : ""}`}>
      {time}
      <div className="tr-body">
        <div className="tr-label">
          <span className="th-chip"><Icon size={12} /></span>
          {TOOL_LABEL[it.tool] ?? it.tool}
          <span className="tr-source">{it.source}</span>
          {it.ok === undefined && <span className="spinner" aria-label="running" />}
        </div>
        <Detail it={it} />
      </div>
    </li>
  );
}

function Detail({ it }: { it: Extract<TraceItem, { kind: "tool" }> }) {
  if (it.ok === false) {
    return (
      <div className="guard">
        <div className="guard-title"><IconShield size={13} />Guardrail stopped this. RAY has to fix it.</div>
        {(it.error || "").split("\n").map((l, i) => <div key={i}>{l}</div>)}
      </div>
    );
  }
  const s = it.summary;
  if (!s) return null;
  switch (it.tool) {
    case "read_image":
      return <div className="doc-link"><img src={imageSrc(s.url)} alt="" className="thumb" /><span>{s.title}</span></div>;
    case "draft_catalogue":
      return <div className="tr-detail">{s.items} items read from the photo</div>;
    case "quote_order":
      return (
        <div className="tr-detail">
          Total <b>{inr(s.total)}</b>{s.due_now < s.total ? `, advance ${inr(s.due_now)}` : ""}{s.delivery_fee ? `, delivery ${inr(s.delivery_fee)}` : ""}
          {s.issues?.length ? <span className="chip sev-warn">{s.issues.join(", ")}</span> : <span className="chip sev-ok">all checks pass</span>}
        </div>
      );
    case "send_payment_link":
      return <div className="tr-detail ok">{s.order_id}: {inr(s.amount)} link sent to {s.sent_to}</div>;
    case "check_payment":
      return <div className="tr-detail">{s.order_id}: <span className={`chip ${s.status === "paid" ? "sev-ok" : "sev-warn"}`}>{s.status === "paid" ? "paid" : "not paid yet"}</span></div>;
    case "verify_screenshot":
      return s.safe_to_start
        ? <div className="tr-detail ok">{s.order_id}: payment found in Razorpay</div>
        : <div className="tr-detail err"><span className="chip sev-err">blocked</span>{s.order_id}: {s.verdict === "not_received" ? "no such payment in Razorpay. Don't bake yet." : String(s.verdict).replace("_", " ")}</div>;
    case "get_orders":
      return <div className="tr-detail">{s.count} orders</div>;
    case "growth_insights": {
      const ready = (s.ready as string[]).map((r) => LADDER[r]?.product ?? r);
      return <div className="tr-detail">Run rate {inr(s.run_rate)} a month, {s.repeat_customers} repeat customers. Ready for: {ready.join(", ") || "not yet"}</div>;
    }
    case "find_customers":
      return <div className="tr-detail">{s.count} {s.segment} customers, {s.opted_in} opted in to offers</div>;
    case "send_broadcast":
      return <div className="tr-detail ok">Sent to {s.recipients}, skipped {s.skipped_no_consent} without consent</div>;
    case "publish_shop":
      return <div className="tr-detail ok">Shop page is live</div>;
    case "get_shop":
      return <div className="tr-detail">Today {s.today}, {s.menu_items} menu items</div>;
    default:
      return null;
  }
}
