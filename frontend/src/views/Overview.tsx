import { useEffect, useRef, useState } from "react";
import { LADDER, Moment, State, imageUrl, inr, packLabel } from "../state";
import { IconCamera, IconCard, IconCheck, IconClock, IconLock, IconSend, IconShield, IconWarn, MeeraLogo, RayMark } from "../Icons";
import { PayLinkCard, SellerBubble, StatusBar, clean } from "./ChatView";

type Copy = { title: string; body: string; product: string; icon: (p: { size?: number }) => JSX.Element };

const COPY: Record<string, Copy> = {
  menu: { title: "A menu photo becomes a shop", product: "Payment Pages", icon: IconCamera,
    body: "RAY reads Meera's handwritten menu, drafts the items and prices, and publishes her shop page when she taps Publish." },
  riya: { title: "An Instagram DM becomes a paid order", product: "Payment Links", icon: IconCard,
    body: "A Hinglish DM is priced by Meera's rules. After her tap, a Razorpay payment link goes out, and Riya pays." },
  arjun: { title: "A fake 'paid' screenshot is caught", product: "Payment check", icon: IconShield,
    body: "The screenshot says paid. Razorpay has no such payment, so RAY tells Meera not to bake and sends Arjun the link." },
  unpaid: { title: "Who hasn't paid? Chased politely", product: "Payment Links", icon: IconClock,
    body: "RAY asks Razorpay about every open link, skips Arjun who was just reminded, and nudges Sneha for her advance." },
  diwali: { title: "A Diwali offer, only with consent", product: "Customer list", icon: IconSend,
    body: "The hamper offer goes to repeat customers who said yes to offers. Everyone else is skipped." },
  kavya: { title: "A bulk order with a catch", product: "Rules, no AI", icon: IconWarn,
    body: "Whitefield is outside delivery, so it becomes a pickup. The 20% discount demand is refused and left to Meera." },
};

function stat(m: Moment): { text: string; tone: string } {
  const ev = (t: string) => m.events.find((e) => e.type === t);
  switch (m.id) {
    case "menu": return { text: `${ev("catalogue_draft")?.items?.length ?? 0} items, shop live`, tone: "blue" };
    case "riya": return { text: `${inr(ev("payment_received")?.order?.amount_paid)} paid`, tone: "green" };
    case "arjun": return { text: `${inr(ev("screenshot_check")?.check?.claimed?.amount)} not baked for free`, tone: "red" };
    case "unpaid": {
      const o = m.after.orders.find((x) => x.customer === m.customer && x.payment_status === "unpaid");
      return { text: `${inr(o?.due_now)} reminded`, tone: "amber" };
    }
    case "diwali": return { text: `${m.broadcast?.recipients ?? 0} reached, ${m.broadcast?.skipped_no_consent ?? 0} skipped`, tone: "blue" };
    case "kavya": return { text: `${inr(ev("quote")?.quote?.total ?? ev("quote")?.total)} quoted`, tone: "muted" };
    default: return { text: "", tone: "muted" };
  }
}

const lakh = (v: number) => (v >= 100000 ? `₹${(v / 100000).toFixed(2)}L` : inr(v));

export default function Overview({ story, go }: { story: { final: State; moments: Moment[] } | null; go: (page: string) => void }) {
  const [pick, setPick] = useState("riya");
  const [side, setSide] = useState<"seller" | "customer">("seller");
  if (!story) return <div className="loading">Loading Meera's shop...</div>;
  const { final, moments } = story;
  const g = final.growth;
  const m = moments.find((x) => x.id === pick) ?? moments[0];
  const collected = (g?.series ?? []).reduce((s: number, x: any) => s + x.sales, 0);
  const fakeAmount = final.checks.filter((c) => !c.safe_to_start).reduce((s, c) => s + (c.claimed?.amount ?? 0), 0);
  const riya = moments.find((x) => x.id === "riya");
  const steps = [{ id: "start", product: "Payment Links", title: "Shop in WhatsApp", ready: true },
    ...(g?.next_steps ?? []).map((x: any) => ({ id: x.id, product: LADDER[x.id]?.product, title: LADDER[x.id]?.title, ready: x.ready }))];
  const customerLabel = m.id === "menu" ? "Shop page" : m.broadcast ? "A customer" : (m.customer ?? "Customer").split(" ")[0];
  return (
    <div className="overview">
      <section className="pcard hero2">
        <div className="hero2-text">
          <span className="pill-soft"><IconSparkle />Live in 2 minutes, on WhatsApp</span>
          <h1 className="display">Give every home seller a shop with<br /><span className="blue">RAY Shop</span><span className="ver">Prototype</span></h1>
          <p className="lead">For the home baker who sells in Instagram DMs and gets paid by UPI screenshots. RAY runs her shop inside WhatsApp, and every rupee goes through Razorpay.</p>
          <ul className="hero-ticks">
            <li><IconCheck size={18} />A forwarded DM becomes a priced order and a payment link.</li>
            <li><IconCheck size={18} />Fake "paid" screenshots are caught against Razorpay.</li>
            <li><IconCheck size={18} />She grows into Payment Pages, Checkout and Capital.</li>
          </ul>
          <div className="hero2-ctas">
            <button className="btn-hero" onClick={() => go("play")}>Try RAY Shop now <span aria-hidden>→</span></button>
            <button className="btn-manual" onClick={() => go("manual")}>Click through yourself</button>
          </div>
          <div className="hero2-cap">Plays hands-free in about 2 minutes <span>|</span> or tap each step yourself</div>
        </div>
        <div className="hero2-art">{riya && <HeroPhone m={riya} final={final} />}</div>
      </section>

      <Persona final={final} />

      <section className="pcard stats4">
        <div><b>{lakh(collected)}</b><span>collected on Razorpay in 3 months</span></div>
        <div><b>{inr(g?.collected_after_reminder)}</b><span>paid after a RAY reminder</span></div>
        <div><b>{inr(fakeAmount)}</b><span>fake payment caught</span></div>
        <div><b>+{g?.growth_last_month_pct ?? 0}%</b><span>sales growth in September</span></div>
      </section>

      <section className="sec">
        <h2 className="sec-title">It's not just a payment link. It's a shop that runs itself.</h2>
        <p className="sec-sub">Six moments from Meera's three months on RAY Shop. Pick one to see it on WhatsApp.</p>
        <div className="pcard moments-card">
          <ol className="mlist">
            {moments.map((x) => {
              const c = COPY[x.id];
              if (!c) return null;
              const Icon = c.icon;
              return (
                <li key={x.id}>
                  <button className={`mrow ${x.id === m.id ? "on" : ""}`} onClick={() => { setPick(x.id); setSide("seller"); }} aria-pressed={x.id === m.id}>
                    <span className="mrow-icon"><Icon size={18} /></span>
                    <span className="mrow-main"><b>{c.title}</b><small>{c.body}</small></span>
                    <span className="mrow-right"><b>{stat(x).text}</b><span className="tag">{c.product}</span></span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mphone">
            <div className="seg" role="tablist" aria-label="Whose phone">
              <button role="tab" aria-selected={side === "seller"} className={side === "seller" ? "on" : ""} onClick={() => setSide("seller")}>Meera's phone</button>
              <button role="tab" aria-selected={side === "customer"} className={side === "customer" ? "on" : ""} onClick={() => setSide("customer")}>{customerLabel}{m.id === "menu" ? "" : "'s phone"}</button>
            </div>
            {side === "seller" ? (
              <MiniPhone title="" sub="RAY by Razorpay" avatar={<RayMark size={32} />} scrollKey={m.id + side}>
                {m.seller.map((it, i) => <SellerBubble key={i} m={it} approve={() => {}} replay />)}
              </MiniPhone>
            ) : <CustomerSide m={m} final={final} />}
          </div>
        </div>
      </section>

      <section className="sec">
        <h2 className="sec-title">Grows with her, on Razorpay</h2>
        <p className="sec-sub">Each next product unlocks from her own sales history. <button className="link" onClick={() => go("growth")}>See growth</button></p>
        <div className="pcard ladder4">
          {steps.map((x: any, i: number) => (
            <div key={x.id} className={x.ready ? "ready" : ""}>
              <span className="l4-num">{x.ready ? <IconCheck size={16} /> : i + 1}</span>
              <small>{x.product}</small>
              <b>{x.title}</b>
              <span className="l4-state">{x.ready ? (i === steps.map((y: any) => y.ready).lastIndexOf(true) ? "Meera is here" : "Done") : "Unlocks as she grows"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Who Meera is. Every number here comes from the demo data; the bakery and its customers are made up.
function Persona({ final }: { final: State }) {
  const merchant = final.view?.merchant ?? {};
  const pol = merchant.policies ?? {};
  const zones: { name: string; fee: number; areas: string[] }[] = merchant.delivery_zones ?? [];
  const g = final.growth ?? {};
  const cat = final.catalogue ?? [];
  const from = cat.length ? Math.min(...cat.map((c) => c.price)) : 0;
  const since = merchant.selling_since ? new Date(merchant.selling_since + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "";
  const facts: [string, string, string?][] = [
    ["Customers", `${g.customers ?? 0}`, `${g.repeat_customers ?? 0} order again and again`],
    ["Orders since July", `${g.orders_total ?? 0}`, "paid, all on Razorpay links"],
    ["Menu", `${cat.length} items`, `from ${inr(from)}, eggless on request`],
    ["Oven", `${pol.daily_capacity_units ?? 0} boxes a day`, "so RAY checks space before every order"],
    ["Delivery", zones.map((z) => inr(z.fee)).join(" or "), `${zones.reduce((n, z) => n + z.areas.length, 0)} areas near ${merchant.base_area ?? "home"}, pickup elsewhere`],
    ["Rules", `${pol.lead_days ?? 0} days notice`, `${pol.advance_percent ?? 0}% advance above ${inr(pol.advance_threshold)}`],
  ];
  return (
    <section className="sec">
      <h2 className="sec-title">Meet Meera</h2>
      <p className="sec-sub">The seller RAY Shop is built for. Meera, her bakery and her customers are made up for this demo; her numbers come from its data.</p>
      <div className="pcard persona">
        <div className="persona-main">
          <div className="persona-id">
            <MeeraLogo size={64} />
            <div>
              <div className="persona-name">{merchant.name ?? "Meera's Bakes"}</div>
              <div className="persona-where">Home bakery in {merchant.base_area}, {merchant.city}</div>
              <div className="persona-tags"><span className="tag">Selling since {since}</span><span className="tag">{String(merchant.instagram ?? "").replace(" (fictional)", "")}</span><span className="tag">No website</span></div>
            </div>
          </div>
          <p className="persona-story">
            Meera bakes cupcakes, cakes and cheesecake jars in her home kitchen and sells to neighbours and office teams across East Bengaluru.
            Orders arrive as Instagram DMs and WhatsApp messages, usually in Hinglish. Customers pay by UPI and send a screenshot as proof.
            She has one oven and no website, and she does the prices, the follow-ups and the baking herself.
          </p>
          <div className="persona-compare">
            <div>
              <h3>Before RAY Shop</h3>
              <ul className="persona-list before">
                <li>Works out every price by hand inside DMs</li>
                <li>A screenshot is her only proof of payment</li>
                <li>Chases advances one chat at a time</li>
                <li>Nothing to share but her Instagram handle</li>
              </ul>
            </div>
            <div>
              <h3>With RAY Shop</h3>
              <ul className="persona-list after">
                <li>Forwards the DM, taps once, a Razorpay link goes out</li>
                <li>Razorpay's own record confirms every payment</li>
                <li>Reminders go only to customers who owe</li>
                <li>A shop page built from one menu photo</li>
              </ul>
            </div>
          </div>
        </div>
        <aside className="persona-side">
          <figure className="persona-menu">
            <img src={imageUrl("menu-1")} alt="Meera's handwritten menu card" />
            <figcaption>Her handwritten menu card, the photo RAY reads on day 1</figcaption>
          </figure>
          <dl className="persona-facts">
            {facts.map(([k, v, sub]) => <div key={k}><dt>{k}</dt><dd><b>{v}</b>{sub && <small>{sub}</small>}</dd></div>)}
          </dl>
        </aside>
      </div>
      <p className="persona-also">The same flow fits other home sellers who take orders in DMs, such as tiffin services, saree resellers and candle makers.</p>
    </section>
  );
}

const IconSparkle = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
  </svg>
);

// The product shot: the end of Riya's order on her phone, with the Razorpay link paid.
function HeroPhone({ m, final }: { m: Moment; final: State }) {
  const paid = new Set(final.orders.filter((o) => o.payment_status !== "unpaid").map((o) => o.payment_link?.id));
  const link = m.customerChat.find((c) => c.link)?.link;
  const thanks = m.customerChat[m.customerChat.length - 1];
  return (
    <div className="hero-phone" aria-label="Riya's WhatsApp: payment link paid">
      <div className="device">
        <StatusBar />
        <div className="wa-head">
          <span className="wa-avatar shop" aria-hidden><MeeraLogo size={36} /></span>
          <div className="wa-title"><div className="wa-name">Meera's Bakes <span className="verified"><IconCheck size={10} /></span></div><div className="wa-sub">Business account</div></div>
        </div>
        <div className="wa-chat">
          <div className="bubble out">2 box red velvet Saturday 6 baje, ek eggless please 🙏 Kitna hoga?<span className="ticks" aria-hidden>✓✓</span></div>
          {link && (
            <div className="bubble in has-link">
              <div>Order pakka! Total {inr(link.amount)} with delivery. Pay here to confirm:</div>
              <PayLinkCard amount={link.amount} paid={paid.has(link.id)} tag="Payment link" />
            </div>
          )}
          {thanks && thanks.from === "shop" && !thanks.link && <div className="bubble in">{clean(thanks.text)}</div>}
        </div>
      </div>
    </div>
  );
}

function MiniPhone({ title, sub, avatar, children, scrollKey, kind = "chat" }:
  { title: string; sub: string; avatar: React.ReactNode; children: React.ReactNode; scrollKey: string; kind?: "chat" | "web" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: 0 }); }, [scrollKey]);
  return (
    <div className="mini">
      {title && <div className="device-cap"><span className="cap-who">{title}</span></div>}
      <div className="device">
        <StatusBar />
        {kind === "chat" ? (
          <div className="wa-head">
            <span className="wa-avatar ray" aria-hidden>{avatar}</span>
            <div className="wa-title"><div className="wa-name">{sub} <span className="verified"><IconCheck size={10} /></span></div><div className="wa-sub">Business account</div></div>
          </div>
        ) : (
          <div className="web-bar"><IconLock size={11} /><span>{sub}</span></div>
        )}
        <div className={kind === "chat" ? "wa-chat" : "web-body"} ref={ref}>{children}</div>
      </div>
    </div>
  );
}

function CustomerSide({ m, final }: { m: Moment; final: State }) {
  if (m.id === "menu") {
    const cat = m.after.catalogue ?? [];
    return (
      <MiniPhone title="" sub="Meera's Bakes · shop page" avatar={null} scrollKey={m.id} kind="web">
        <div className="pp mini-pp">
          <div className="pp-banner"><span className="pp-logo"><MeeraLogo size={36} /></span><div className="pp-name">Meera's Bakes</div><div className="pp-tag">Home baked in Indiranagar. Order 2 days ahead.</div></div>
          <div className="pp-body">
            <ul className="pp-items">
              {cat.map((c) => {
                const pack = packLabel(c.name, c.pack);
                return <li key={c.sku}><div><b>{c.name}</b><small>{pack}</small></div><span className="pp-price">{inr(c.price)}</span><span className="pp-add">Add</span></li>;
              })}
            </ul>
          </div>
          <div className="pp-foot"><IconLock size={12} />Payments secured by <b>Razorpay</b></div>
        </div>
      </MiniPhone>
    );
  }
  const paid = new Set(final.orders.filter((o) => o.payment_status !== "unpaid").map((o) => o.payment_link?.id));
  return (
    <MiniPhone title="" sub="Meera's Bakes" avatar={<MeeraLogo size={32} />} scrollKey={m.id}>
      {m.broadcast ? (
        <div className="bubble in">
          <div className="notify-head blue">Offer from Meera's Bakes</div>
          {clean(m.broadcast.text)}
        </div>
      ) : m.customerChat.map((c, i) => (
        <div key={i} className={`bubble ${c.from === "customer" ? "out" : "in"} ${c.link ? "has-link" : ""}`}>
          <div>{clean(c.text)}</div>
          {c.link && <PayLinkCard amount={c.link.amount} paid={paid.has(c.link.id)} tag="Mock link"><div className="rzp-open">Pay {inr(c.link.amount)}</div></PayLinkCard>}
          {c.from === "customer" && <span className="ticks" aria-hidden>✓✓</span>}
        </div>
      ))}
      {m.id === "kavya" && <div className="wa-sys">Nothing sent yet. RAY drafted a reply and is waiting for Meera to decide on the discount.</div>}
      {m.broadcast && <div className="wa-sys">Sent to {m.broadcast.recipients} customers who said yes to offers. {m.broadcast.skipped_no_consent} without consent were skipped.</div>}
    </MiniPhone>
  );
}
