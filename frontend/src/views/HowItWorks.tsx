import { IconBolt, IconCamera, IconCard, IconCheck, IconClock, IconGrowth, IconShield } from "../Icons";

const STEPS = [
  { icon: IconCamera, title: "Snap the menu", product: "Payment Pages",
    body: "Meera sends a photo of her menu card. RAY reads the items and prices, and her shop page goes live when she approves." },
  { icon: IconCard, title: "Forward a DM", product: "Payment Links",
    body: "\"2 box red velvet Saturday 6 baje, ek eggless\". Rules price it, check notice and oven space, and a Razorpay link goes out after her tap." },
  { icon: IconShield, title: "Check every 'paid'", product: "Payment check",
    body: "A screenshot never confirms a payment. Only Razorpay's own record does, so fake screenshots are caught before she bakes." },
  { icon: IconClock, title: "Chase, politely", product: "Payment Links",
    body: "\"Who hasn't paid?\" RAY asks Razorpay about every open link and reminds only the customers who need it." },
  { icon: IconGrowth, title: "Grow on Razorpay", product: "Pages, Checkout, Capital",
    body: "From her sales history, RAY tells her when she is ready for her own shop page, a website with Checkout, or a loan." },
];

const SPLIT: [string, string, boolean][] = [
  ["Read a menu photo, a payment screenshot, a Hinglish DM", "Claude (vision and language)", true],
  ["Work out items, quantities, eggless, \"Saturday\", the area", "Claude", true],
  ["Prices, delivery fee, 50% advance above ₹1,500, notice, oven space", "Rules in code", false],
  ["Is the screenshot real?", "Rules, against Razorpay's record", false],
  ["Payment link amount", "Always the quote's amount. The model never passes an amount", false],
  ["Messages to Meera and customers", "Claude, checked by a money guard", true],
  ["Anything a customer sees", "Meera approves first", false],
];

const GUARDS = [
  "No invented money: every rupee in a message must match the menu, a quote or that customer's order.",
  "Links only from clean quotes: not on the menu, outside delivery or oven full means no link.",
  "Screenshots never confirm payment. Only Razorpay's record does.",
  "Broadcasts only to customers who opted in, at most one a week.",
  "Publishing, links, customer messages and broadcasts wait for Meera's approval.",
];

export default function HowItWorks({ go }: { go: (page: string) => void }) {
  return (
    <div className="how">
      <section className="pcard hero2">
        <div className="hero2-text">
          <span className="pill-soft">How RAY Shop works</span>
          <h1 className="display">A shop that lives in WhatsApp,<br /><span className="blue">paid through Razorpay</span></h1>
          <p className="lead">For the home baker who takes orders in Instagram DMs and gets paid by UPI screenshots. No website, no app to learn. She forwards messages to RAY; RAY does the orders, the links and the follow-ups, and she approves.</p>
          <div className="hero-actions">
            <button className="btn-primary btn-big" onClick={() => go("play")}>Try it live</button>
            <button className="btn-secondary btn-lg" onClick={() => go("overview")}>See Meera's shop</button>
          </div>
        </div>
        <div className="why-box">
          <span className="eyebrow light">Why Razorpay cares</span>
          <div className="why-row"><b>Free UPI apps</b><span>Money in her bank, and nothing else. She never needs Razorpay.</span></div>
          <div className="why-row on"><b>RAY Shop</b><span>Orders, reminders and proof of payment on day 1. When she grows into a brand, she is already on Razorpay.</span></div>
        </div>
      </section>

      <section className="sec">
        <h2 className="sec-title">Five steps, one seller</h2>
        <p className="sec-sub">Meera's Bakes, a made-up home bakery in Bengaluru, from day 1 to three months later.</p>
        <ol className="how-steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card">
              <span className="how-icon"><s.icon size={22} /></span>
              <span className="how-num">{i + 1}</span>
              <b>{s.title}</b>
              <p>{s.body}</p>
              <span className="product-chip">{s.product}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="how-grid">
        <section className="card">
          <div className="card-head"><div><h2>Where AI is used, and where it is not</h2><p className="card-sub">Claude reads the mess. Code does the money.</p></div></div>
          <table className="split">
            <tbody>
              {SPLIT.map(([job, who, ai]) => (
                <tr key={job}><td>{job}</td><td><span className={`who ${ai ? "ai" : "code"}`}>{ai ? <IconBolt size={12} /> : <IconShield size={12} />}{who}</span></td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card">
          <div className="card-head"><div><h2>Guardrails, in code and tested</h2><p className="card-sub">13 deterministic tests cover them.</p></div></div>
          <ul className="checklist">{GUARDS.map((g) => <li key={g}><IconCheck size={14} />{g}</li>)}</ul>
        </section>
      </div>

      <section className="card">
        <div className="card-head"><div><h2>Today and in production</h2><p className="card-sub">What this prototype does, and what changes inside Razorpay.</p></div></div>
        <div className="today-grid">
          <div>
            <h3>In this prototype</h3>
            <ul className="checklist">
              <li><IconCheck size={14} />Claude runs through the Claude Agent SDK. The hosted demo replays one recorded live run.</li>
              <li><IconCheck size={14} />Eval: 8 forwarded messages, the menu photo and 2 screenshots. 11 of 11 passed.</li>
              <li><IconCheck size={14} />WhatsApp and Instagram are simulated. Payment links are mock, or Razorpay test mode with keys.</li>
              <li><IconCheck size={14} />Meera, her customers and every order are made up.</li>
            </ul>
          </div>
          <div>
            <h3>In production</h3>
            <ul className="checklist muted">
              <li><IconClock size={14} />RAY sits on the seller's WhatsApp Business number, next to RAY on WhatsApp today.</li>
              <li><IconClock size={14} />Real Payment Links and Payment Pages, settled to her bank.</li>
              <li><IconClock size={14} />Growth thresholds and pricing for tiny sellers set by Razorpay.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
