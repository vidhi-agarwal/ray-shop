import { useEffect, useState } from "react";
import { LADDER, STATIC, State, inr, niceDate } from "../state";
import { IconCheck, IconGrowth, IconLock } from "../Icons";

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Stage = { id: string; title: string; product: string; body: string; when?: string; ready: boolean; progress: number; status: string };

type Insights = {
  period: string; summary: string; item_revenue: number; delivery_fees: number; orders: number; aov: number;
  items: { sku: string; name: string; units: number; revenue: number; share_pct: number; change_pct: number | null; tags: string[]; advice: string }[];
  customers: { paying: number; repeat: number; occasional: number; aov_repeat: number; aov_occasional: number; orders_per_repeat: number; spend_repeat: number; spend_occasional: number };
};

export default function GrowthView({ state }: { state: State }) {
  const [ins, setIns] = useState<Insights | null>(null);
  useEffect(() => {
    fetch(STATIC ? "/static/insights.json" : "/api/insights").then((r) => r.json()).then(setIns).catch(() => setIns(null));
  }, []);
  const g = state.growth;
  if (!g) {
    return (
      <div className="empty">
        <span className="empty-icon"><IconGrowth size={26} /></span>
        <h2>No sales history yet</h2>
        <p>On day 1 Meera only has a menu. Use "3 months later" on the WhatsApp tab to see how her shop grows on Razorpay.</p>
      </div>
    );
  }
  const series = g.series as { month: string; sales: number; orders: number }[];
  const cur = state.today?.slice(0, 7) ?? "";
  const full = series.filter((m) => m.month < cur);
  const lastFull = full[full.length - 1];
  // Finished months only: a month on pace is not yet a month over Rs 1 lakh.
  const monthsOver1l = full.filter((m) => m.sales >= 100000).length;
  const monthsOn = g.months_on_razorpay ?? full.length;
  const steps = g.next_steps as { id: string; product: string; when: string; ready: boolean }[];
  const detail: Record<string, { progress: number; status: string; ready?: boolean }> = {
    website: { progress: Math.min(1, (lastFull?.sales ?? 0) / 50000),
      status: `${inr(lastFull?.sales ?? 0)} in ${lastFull ? MONTH[Number(lastFull.month.slice(5)) - 1] : "last month"}, ${(lastFull?.sales ?? 0) >= 50000 ? "above" : "needs"} ${inr(50000)}` },
    checkout: { progress: monthsOver1l / 2, ready: monthsOver1l >= 2,
      status: `${monthsOver1l} of 2 months over ₹1 lakh. ${MONTH[Number(cur.slice(5)) - 1]} is on pace for ${inr(g.this_month_run_rate)}.` },
    capital: { progress: Math.min(1, monthsOn / 6), status: `${monthsOn} of 6 months of sales on Razorpay` },
  };
  const stages: Stage[] = [
    { id: "start", title: "Shop in WhatsApp", product: "Payment Links", body: "Menu, payment links, reminders and screenshot checks. Day 1, no website needed.", ready: true, progress: 1, status: "Live since July" },
    ...steps.map((s) => ({
      id: s.id, title: LADDER[s.id]?.title ?? s.id, product: LADDER[s.id]?.product ?? "", body: s.product, when: s.when,
      ready: detail[s.id]?.ready ?? s.ready, progress: detail[s.id]?.progress ?? (s.ready ? 1 : 0), status: detail[s.id]?.status ?? "",
    })),
  ];
  const here = stages.map((s) => s.ready).lastIndexOf(true);

  const bars = series.map((m) => ({ ...m, value: m.month === cur ? g.this_month_run_rate : m.sales, projected: m.month === cur }));
  const max = Math.max(...bars.map((b) => b.value), 100000) * 1.12;
  const W = 560, H = 240, top = 20, base = 200, bw = 64;
  const y = (v: number) => base - (v / max) * (base - top);
  const step = (W - 60) / bars.length;

  return (
    <div className="growth">
      <section className="card journey" aria-label="Meera's path on Razorpay">
        <div className="card-head">
          <div>
            <h2>Meera grows, and stays on Razorpay</h2>
            <p className="card-sub">Each step unlocks from her own sales history. Thresholds are prototype assumptions for Razorpay to set.</p>
          </div>
        </div>
        <ol className="journey-steps">
          {stages.map((s, i) => (
            <li key={s.id} className={`${s.ready ? "ready" : "locked"} ${i === here ? "here" : ""}`}>
              <div className="j-top">
                <span className="j-dot" aria-hidden>{s.ready ? <IconCheck size={15} /> : <IconLock size={14} />}</span>
                <span className="j-product">{s.product}</span>
                {i === here && <span className="here-tag">Meera is here</span>}
              </div>
              <div className="j-title">{s.title}</div>
              <div className="j-body">{s.body}</div>
              <div className="j-progress" aria-hidden><span style={{ width: `${Math.round(s.progress * 100)}%` }} /></div>
              <div className="j-status">{s.status}</div>
              {s.when && <div className="j-when">Unlocks at {s.when.replace(/Rs\s?/g, "₹")}</div>}
            </li>
          ))}
        </ol>
      </section>

      <section className="pcard stats4">
        <div><b>{inr(g.this_month_run_rate)}</b><span>October, at current pace</span></div>
        <div><b>{g.growth_last_month_pct != null ? `+${g.growth_last_month_pct}%` : "-"}</b><span>sales growth, {full.length >= 2 ? `${MONTH[Number(full[full.length - 1].month.slice(5)) - 1]} over ${MONTH[Number(full[full.length - 2].month.slice(5)) - 1]}` : "last month"}</span></div>
        <div><b>{g.repeat_customers}<small> of {g.customers}</small></b><span>repeat customers</span></div>
        <div><b>{inr(g.collected_after_reminder)}</b><span>paid after a reminder</span></div>
      </section>

      {ins && <Insights ins={ins} state={state} />}

      <div className="growth-grid">
        <section className="card">
          <div className="card-head"><h2>Monthly sales on Razorpay</h2><span className="card-meta"><i className="lg lg-solid" />Collected <i className="lg lg-proj" />On pace</span></div>
          <svg viewBox={`0 0 ${W} ${H}`} className="sales-chart" role="img" aria-label="Monthly sales on Razorpay">
            <defs>
              <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="#DCE5FF" /><line x1="0" y1="0" x2="0" y2="6" stroke="#305EFF" strokeWidth="2" opacity=".35" />
              </pattern>
            </defs>
            {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1="30" x2={W - 10} y1={y(max * f)} y2={y(max * f)} className="grid" />)}
            <line x1="30" x2={W - 10} y1={y(100000)} y2={y(100000)} className="lakh" />
            <text x={34} y={y(100000) - 7} className="lakh-label">₹1 lakh a month</text>
            {bars.map((b, i) => {
              const x = 30 + step * i + (step - bw) / 2;
              return (
                <g key={b.month}>
                  <rect x={x} y={y(b.value)} width={bw} height={base - y(b.value)} rx="6" className={b.projected ? "bar proj" : "bar"} />
                  <text x={x + bw / 2} y={y(b.value) - 8} textAnchor="middle" className="val">{inr(b.value)}</text>
                  <text x={x + bw / 2} y={base + 20} textAnchor="middle" className="axis">{MONTH[Number(b.month.slice(5)) - 1]}{b.projected ? " (pace)" : ""}</text>
                </g>
              );
            })}
            <line x1="30" x2={W - 10} y1={base} y2={base} className="base" />
          </svg>
        </section>
        <section className="why">
          <span className="eyebrow light">Why this matters to Razorpay</span>
          <h3>She starts on Razorpay on day 1, and never needs to leave.</h3>
          <p>Free UPI apps give Meera money in her bank and nothing else. RAY Shop gives her orders, reminders and proof of payment. When she is ready for a website, Checkout or a loan, she is already here.</p>
          <ul>
            <li><IconCheck size={14} />Every rupee moves through Razorpay Payment Links</li>
            <li><IconCheck size={14} />Her sales history builds up for Razorpay Capital</li>
            <li><IconCheck size={14} />The upgrade to Payment Pages and Checkout is one tap</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

const TAG_TONE: Record<string, string> = {
  "Best seller": "t-blue", "Most revenue": "t-blue", Growing: "t-green", Slowing: "t-amber",
  "Consider dropping": "t-red", "Add-on": "t-grey", Seasonal: "t-grey",
};

// What sells, what earns, what an order is worth, and how the Diwali offer did. All from rules on paid orders.
function Insights({ ins, state }: { ins: Insights; state: State }) {
  const max = Math.max(...ins.items.map((i) => i.units), 1);
  const c = ins.customers;
  const offer = state.broadcasts[state.broadcasts.length - 1];
  const since = offer ? state.orders.filter((o) => o.placed_at.slice(0, 10) >= offer.date && o.lines.some((l) => l.sku === "DH")) : [];
  const paidSince = since.filter((o) => o.payment_status !== "unpaid");
  const drop = ins.summary.startsWith("Consider");
  return (
    <div className="insights">
      <section className="pcard menu-card">
        <div className="card-head">
          <div>
            <h2>What's selling</h2>
            <p className="card-sub">{ins.orders} paid orders from 1 July to yesterday. Trend compares {ins.period}.</p>
          </div>
        </div>
        <div className={`menu-verdict ${drop ? "drop" : "keep"}`}>{ins.summary}</div>
        <div className="menu-table" role="table" aria-label="Menu performance">
          <div className="mt-row mt-head" role="row"><span>Item</span><span>Sold</span><span className="num">Revenue</span><span className="num">Trend</span></div>
          {ins.items.map((i) => (
            <div key={i.sku} className="mt-row" role="row">
              <span className="mt-item">
                <b>{i.name}</b>
                <span className="mt-tags">{i.tags.map((t) => <span key={t} className={`mtag ${TAG_TONE[t] ?? "t-grey"}`}>{t}</span>)}</span>
                {i.advice && <small>{i.advice}</small>}
              </span>
              <span className="mt-sold"><span className="mt-bar"><span style={{ width: `${(i.units / max) * 100}%` }} /></span><b>{i.units}</b></span>
              <span className="num"><b>{inr(i.revenue)}</b><small>{i.share_pct}%</small></span>
              <span className={`num trend ${i.change_pct == null ? "" : i.change_pct >= 0 ? "up" : "down"}`}>
                {i.change_pct == null ? "-" : `${i.change_pct >= 0 ? "▲" : "▼"} ${Math.abs(i.change_pct)}%`}
              </span>
            </div>
          ))}
        </div>
        <p className="menu-foot">Item sales {inr(ins.item_revenue)} plus {inr(ins.delivery_fees)} in delivery fees. The advice comes from fixed rules: small share and falling means a candidate to drop.</p>
      </section>

      <div className="insights-side">
        <section className="pcard aov-card">
          <h2>What an order is worth</h2>
          <div className="aov-big"><b>{inr(ins.aov)}</b><span>average paid order</span></div>
          <table className="aov-table">
            <thead><tr><th /><th>Per order</th><th>Per customer, 3 months</th></tr></thead>
            <tbody>
              <tr><td>Repeat customers <small>{c.repeat}, about {c.orders_per_repeat} orders each</small></td><td>{inr(c.aov_repeat)}</td><td><b>{inr(c.spend_repeat)}</b></td></tr>
              <tr><td>Occasional <small>{c.occasional}, 1 or 2 orders</small></td><td>{inr(c.aov_occasional)}</td><td>{inr(c.spend_occasional)}</td></tr>
            </tbody>
          </table>
          <p className="aov-note">Repeat customers spend a little less per order but about {Math.round(c.spend_repeat / Math.max(c.spend_occasional, 1) * 10) / 10}x as much overall.</p>
        </section>

        {offer && (
          <section className="pcard offer-card">
            <h2>Diwali offer</h2>
            <p className="card-sub">Sent {niceDate(offer.date)}, hamper at {inr(state.catalogue?.find((x) => x.sku === "DH")?.price ?? 0)} with the shop link.</p>
            <ol className="funnel">
              <li><span>Sent to</span><b>{offer.recipients}</b><small>repeat customers who said yes to offers</small></li>
              <li className="muted"><span>Skipped</span><b>{offer.skipped_no_consent}</b><small>no consent for offers</small></li>
              <li><span>Hamper orders since</span><b>{since.length}</b><small>{paidSince.length} paid</small></li>
            </ol>
            <p className="aov-note">None yet: the offer went out on the day the recorded run ends. In production, orders through the offer's shop link would be counted here.</p>
          </section>
        )}
      </div>
    </div>
  );
}
