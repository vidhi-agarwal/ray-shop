import { useState } from "react";
import { State, imageUrl, inr, niceDate, packLabel } from "../state";
import { IconExternal, IconLock, IconShield } from "../Icons";

const STATUS: Record<string, [string, string]> = {
  unpaid: ["Not paid", "st-unpaid"], paid: ["Paid", "st-paid"], advance_paid: ["Advance paid", "st-advance"],
};

type Filter = "all" | "unpaid" | "paid";

export default function OrdersView({ state }: { state: State }) {
  const [filter, setFilter] = useState<Filter>("all");
  const cat = state.catalogue ?? state.draft ?? [];
  const today = state.today ?? "";
  const upcoming = state.orders.filter((o) => o.deliver_on >= today && o.status !== "delivered")
    .sort((a, b) => a.deliver_on.localeCompare(b.deliver_on) || a.id.localeCompare(b.id));
  const shown = upcoming.filter((o) => filter === "all" || (filter === "unpaid" ? o.payment_status === "unpaid" : o.payment_status !== "unpaid"));
  const cap = state.view?.merchant?.policies?.daily_capacity_units ?? 12;
  const units: Record<string, number> = {};
  const bySku = Object.fromEntries((state.catalogue ?? []).map((c) => [c.sku, c]));
  for (const o of upcoming) units[o.deliver_on] = (units[o.deliver_on] ?? 0) + o.lines.reduce((s, l) => s + (bySku[l.sku]?.units ?? 1) * l.qty, 0);
  const days = Object.keys(units).filter((d) => d > today).sort().slice(0, 7);

  const collected = upcoming.reduce((s, o) => s + o.amount_paid, 0);
  const unpaid = upcoming.filter((o) => o.payment_status === "unpaid");
  const toCollect = upcoming.reduce((s, o) => s + Math.max(0, o.due_now - o.amount_paid), 0);
  const fakes = state.checks.filter((c) => !c.safe_to_start).length;

  return (
    <div className="orders">
      <div className="kpis">
        <div className="kpi"><dt>Collected on upcoming orders</dt><dd>{inr(collected)}</dd><small>{upcoming.length - unpaid.length} orders paid or part paid</small></div>
        <div className="kpi"><dt>Waiting for payment</dt><dd className={toCollect ? "warn" : ""}>{inr(toCollect)}</dd><small>{unpaid.length} payment link{unpaid.length === 1 ? "" : "s"} open</small></div>
        <div className="kpi"><dt>Upcoming orders</dt><dd>{upcoming.length}</dd><small>{days.length ? `next ${days.length} days booked` : "none yet"}</small></div>
        <div className="kpi"><dt>Fake screenshots caught</dt><dd className={fakes ? "bad" : ""}>{fakes}</dd><small>checked against Razorpay</small></div>
      </div>

      <div className="orders-grid">
        <div className="orders-main">
          <section className="card">
            <div className="card-head">
              <h2>Upcoming orders</h2>
              <div className="seg" role="tablist" aria-label="Filter orders">
                {([["all", "All"], ["unpaid", "Not paid"], ["paid", "Paid"]] as [Filter, string][]).map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{l}</button>
                ))}
              </div>
            </div>
            {upcoming.length === 0 ? <p className="card-empty">No upcoming orders yet. They appear here as RAY creates them. Use "3 months later" to load Meera's history.</p> : (
              <div className="table-wrap">
                <table className="otable">
                  <thead><tr><th>Order ID</th><th>Customer</th><th>Delivery</th><th>Items</th><th className="num">Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {shown.map((o) => {
                      const [label, cls] = STATUS[o.payment_status] ?? [o.payment_status, ""];
                      return (
                        <tr key={o.id}>
                          <td><span className="oid">{o.id}</span></td>
                          <td><b>{o.customer}</b><div className="sub"><span className={`ch ch-${o.channel}`}>{o.channel === "instagram" ? "Instagram" : "WhatsApp"}</span></div></td>
                          <td>{niceDate(o.deliver_on)}{o.time ? `, ${o.time}` : ""}<div className="sub">{o.fulfilment === "pickup" ? "Pickup" : o.area}</div></td>
                          <td className="items">{o.lines.map((l, i) => <div key={i}>{l.qty} x {bySku[l.sku]?.name ?? l.sku}{l.eggless ? " (eggless)" : ""}</div>)}</td>
                          <td className="num"><b>{inr(o.total)}</b>{o.payment_status === "advance_paid" && <div className="sub">{inr(o.amount_paid)} paid</div>}</td>
                          <td><span className={`status ${cls}`}>{label}</span>{o.reminded && <div className="sub">Reminded</div>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {days.length > 0 && (
            <section className="card">
              <div className="card-head"><h2>Oven slots booked</h2><span className="card-meta">{cap} boxes a day, checked before every quote</span></div>
              <ul className="oven">
                {days.map((d) => {
                  const pct = Math.min(100, (units[d] / cap) * 100);
                  return (
                    <li key={d}>
                      <span className="oven-day">{niceDate(d)}</span>
                      <span className="oven-bar"><span style={{ width: `${pct}%` }} className={units[d] > cap ? "over" : pct >= 80 ? "high" : ""} /></span>
                      <span className="oven-val">{units[d]}/{cap}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {state.checks.length > 0 && (
            <section className="card">
              <div className="card-head"><h2>Screenshots checked against Razorpay</h2></div>
              <ul className="checks">
                {state.checks.map((c, i) => (
                  <li key={i} className={c.safe_to_start ? "ok" : "bad"}>
                    <img src={imageUrl(c.image_id)} alt="" />
                    <div>
                      <div className="check-top"><span className="oid">{c.order_id}</span>
                        <span className={`status ${c.safe_to_start ? "st-paid" : "st-failed"}`}>{c.safe_to_start ? "Payment found" : "No payment received"}</span></div>
                      {c.reasons.map((r: string, j: number) => <p key={j}>{r}</p>)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {state.broadcasts.length > 0 && (
            <section className="card">
              <div className="card-head"><h2>Broadcasts</h2></div>
              {state.broadcasts.map((b, i) => (
                <div key={i} className="bcast">
                  <p>{b.text}</p>
                  <div className="bcast-meta"><span className="status st-paid">Sent to {b.recipients}</span><span><IconShield size={13} />{b.skipped_no_consent} skipped, no consent for offers</span></div>
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="paypage" aria-label="Shop page preview">
          <div className="paypage-cap">Shop page preview<span className={`status ${state.shopPublished ? "st-paid" : cat.length ? "st-advance" : "st-muted"}`}>{state.shopPublished ? "Live" : cat.length ? "Draft" : "Not built"}</span></div>
          <div className="pp">
            <div className="pp-banner">
              <span className="pp-logo">MB</span>
              <div className="pp-name">Meera's Bakes</div>
              <div className="pp-tag">Home baked in Indiranagar, Bengaluru. Order 2 days ahead.</div>
            </div>
            <div className="pp-body">
              <div className="pp-label">Menu</div>
              {cat.length === 0 ? <p className="card-empty">Send the menu photo on the WhatsApp tab to build the shop.</p> : (
                <ul className="pp-items">
                  {cat.map((c) => {
                    const pack = packLabel(c.name, c.pack);
                    const extra = c.eggless_extra ? `eggless +${inr(c.eggless_extra)}` : "";
                    return (
                      <li key={c.sku}>
                        <div><b>{c.name}</b><small>{[pack, extra].filter(Boolean).join(" · ")}</small></div>
                        <span className="pp-price">{inr(c.price)}</span>
                        <span className="pp-add" aria-hidden>Add</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {state.shopPublished && <a className="pp-open" href="/shop/meeras-bakes" target="_blank" rel="noreferrer">Open shop page <IconExternal size={14} /></a>}
            </div>
            <div className="pp-foot"><IconLock size={12} />Payments secured by <b>Razorpay</b></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
