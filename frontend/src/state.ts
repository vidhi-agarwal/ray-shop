// UI state built only from events, so live, scripted and replay runs look the same.

export type Ev = { seq: number; t: number; type: string; mode: string; recorded_mode?: string; [k: string]: any };

export type Item = { sku: string; name: string; pack?: string; price: number; eggless_extra?: number | null; units?: number; seasonal?: boolean };
export type Line = { sku: string; qty: number; eggless?: boolean; name?: string; amount?: number; unit_price?: number };
export type Order = {
  id: string; customer: string; channel: string; placed_at: string; deliver_on: string; time?: string; area?: string;
  fulfilment: string; lines: Line[]; total: number; due_now: number; amount_paid: number; payment_status: string;
  status: string; payment_link?: { id: string; url: string; amount: number; status: string }; reminded?: boolean;
};
export type ChatMsg = { from: "shop" | "customer"; text: string; at?: string; link?: { id: string; url: string; amount: number }; images?: string[] };

export type SellerItem =
  | { kind: "meera"; text: string; images: string[]; t: number }
  | { kind: "ray"; text: string; t: number; system?: boolean }
  | { kind: "approval"; id: string; tool: string; status: "pending" | "approved" | "declined"; detail: any; note?: string; t: number }
  | { kind: "skip"; today: string; t: number };

export type TraceItem =
  | { kind: "tool"; tool: string; source: string; input: any; t: number; ok?: boolean; summary?: any; error?: string }
  | { kind: "note"; text: string; t: number }
  | { kind: "event"; text: string; tone: "ok" | "warn" | "info"; t: number }
  | { kind: "error"; text: string; t: number }
  | { kind: "turn"; cost?: number; turns?: number; t: number };

export type State = {
  view?: any;
  phase: string;
  today?: string;
  catalogue?: Item[] | null;
  draft?: Item[] | null;
  shopPublished: boolean;
  orders: Order[];
  chats: Record<string, ChatMsg[]>;
  activeCustomer?: string;
  seller: SellerItem[];
  trace: TraceItem[];
  growth?: any;
  checks: any[];
  broadcasts: any[];
  busy: boolean;
  cost: number;
  waiting?: { next: string; text?: string; images?: string[] };
  stepsDone: string[];
  replayDone: boolean;
  paidCount: number;
};

export const initial: State = {
  phase: "onboarding", shopPublished: false, orders: [], chats: {}, seller: [], trace: [], checks: [], broadcasts: [],
  busy: false, cost: 0, stepsDone: [], replayDone: false, paidCount: 0,
};

const FWD = /^\[Forwarded from ([^,\]]+)[^\]]*\]\n?([\s\S]*)$/;

function upsertOrder(orders: Order[], o: Order): Order[] {
  const i = orders.findIndex((x) => x.id === o.id);
  if (i < 0) return [...orders, o];
  const copy = [...orders];
  copy[i] = o;
  return copy;
}

export function reduce(s: State, e: Ev): State {
  const t = e.t;
  switch (e.type) {
    case "__reset":
      return initial;
    case "snapshot": {
      const v = e.view;
      setImageFiles(v.images);
      return { ...s, view: v, phase: v.phase, today: v.today, catalogue: v.catalogue, draft: v.catalogue_draft,
        shopPublished: v.shop_published, orders: v.orders, chats: { ...v.chats, ...mergeChats(s.chats, v.chats) },
        growth: v.growth ?? s.growth, checks: v.screenshot_checks ?? [], broadcasts: v.broadcasts ?? [] };
    }
    case "founder_message": {
      const chats = { ...s.chats };
      let active = s.activeCustomer;
      const m = FWD.exec(e.text);
      if (m) {
        const who = m[1].trim();
        chats[who] = [...(chats[who] ?? []), { from: "customer", text: m[2].trim(), images: e.images }];
        active = who;
      }
      return { ...s, busy: true, waiting: undefined, chats, activeCustomer: active,
        seller: [...s.seller, { kind: "meera", text: e.text, images: e.images ?? [], t }] };
    }
    case "ray_message":
      return { ...s, seller: [...s.seller, { kind: "ray", text: e.text, t, system: !!e.system }] };
    case "agent_note":
      return { ...s, trace: [...s.trace, { kind: "note", text: e.text, t }] };
    case "tool_call":
      return { ...s, trace: [...s.trace, { kind: "tool", tool: e.tool, source: e.source, input: e.input, t }] };
    case "tool_result": {
      const trace = [...s.trace];
      for (let i = trace.length - 1; i >= 0; i--) {
        const it = trace[i];
        if (it.kind === "tool" && it.tool === e.tool && it.ok === undefined) {
          trace[i] = { ...it, ok: e.ok, summary: e.summary, error: e.error };
          break;
        }
      }
      return { ...s, trace };
    }
    case "catalogue_draft":
      return { ...s, draft: e.items };
    case "shop_published":
      return { ...s, catalogue: e.items, shopPublished: true };
    case "order":
      return { ...s, orders: upsertOrder(s.orders, e.order) };
    case "customer_message": {
      const chats = { ...s.chats, [e.customer]: [...(s.chats[e.customer] ?? []), e.message] };
      return { ...s, chats, activeCustomer: e.customer };
    }
    case "payment_received":
      return { ...s, orders: upsertOrder(s.orders, e.order), paidCount: s.paidCount + 1,
        trace: [...s.trace, { kind: "event", tone: "ok", text: `Razorpay: ${e.order.customer} paid for ${e.order.id}`, t }] };
    case "screenshot_check":
      return { ...s, checks: [...s.checks, e.check] };
    case "broadcast":
      return { ...s, broadcasts: [...s.broadcasts, e.broadcast] };
    case "growth":
      return { ...s, growth: { ...(s.growth ?? {}), ...e.growth } };
    case "time_skip":
      return { ...s, phase: e.phase, today: e.today, seller: [...s.seller, { kind: "skip", today: e.today, t }],
        trace: [...s.trace, { kind: "event", tone: "info", text: `Three months later: ${e.today}`, t }] };
    case "approval_required":
      return { ...s, seller: [...s.seller, { kind: "approval", id: e.approval_id, tool: e.tool, status: "pending", detail: e.detail, t }] };
    case "approval":
      return { ...s, seller: s.seller.map((c) => (c.kind === "approval" && c.id === e.approval_id
        ? { ...c, status: e.approved ? "approved" : "declined", note: e.note } : c)),
        trace: [...s.trace, { kind: "event", tone: e.approved ? "ok" : "warn", text: `Meera ${e.approved ? "approved" : "declined"}: ${APPROVAL_LABEL[e.tool] ?? e.tool}`, t }] };
    case "turn_done":
      return { ...s, busy: false, cost: s.cost + (e.cost_usd || 0), trace: [...s.trace, { kind: "turn", cost: e.cost_usd, turns: e.turns, t }] };
    case "error":
      return { ...s, busy: false, trace: [...s.trace, { kind: "error", text: e.message, t }] };
    case "replay_waiting":
      return { ...s, busy: false, waiting: { next: e.next, text: e.text, images: e.images } };
    case "replay_done":
      return { ...s, busy: false, replayDone: true, waiting: undefined };
    default:
      return s;
  }
}

function mergeChats(prev: Record<string, ChatMsg[]>, next: Record<string, ChatMsg[]>) {
  // keep customer-side messages the server does not know about (forwarded DMs)
  const out: Record<string, ChatMsg[]> = {};
  for (const k of Object.keys(prev)) {
    const mine = prev[k].filter((m) => m.from === "customer");
    if (mine.length) out[k] = [...mine, ...(next[k] ?? [])];
  }
  return out;
}

export const APPROVAL_LABEL: Record<string, string> = {
  publish_shop: "publish the shop", send_payment_link: "send the payment link",
  send_customer_message: "send the message", send_broadcast: "send the Diwali broadcast",
};

export function inr(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  const n = Math.round(v);
  const s = String(Math.abs(n));
  if (s.length <= 3) return (n < 0 ? "-" : "") + "₹" + s;
  let head = s.slice(0, -3);
  const tail = s.slice(-3);
  const g: string[] = [];
  while (head.length > 2) { g.unshift(head.slice(-2)); head = head.slice(0, -2); }
  if (head) g.unshift(head);
  return (n < 0 ? "-" : "") + "₹" + g.join(",") + "," + tail;
}

// "Biscoff cheesecake jar" with pack "jar" should not read "jar jar".
export function packLabel(name: string, pack?: string | null): string {
  if (!pack) return "";
  return name.toLowerCase().includes(pack.toLowerCase()) ? "" : pack;
}

// Growth ladder ids are internal; these are the Razorpay products they stand for.
export const LADDER: Record<string, { title: string; product: string }> = {
  website: { title: "Her own shop page", product: "Payment Pages" },
  checkout: { title: "A real website", product: "Checkout + Magic Checkout" },
  capital: { title: "Working-capital loan", product: "Razorpay Capital" },
};

export function niceDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export const TOOL_LABEL: Record<string, string> = {
  get_shop: "Check the shop and today's date", read_image: "Look at the photo", draft_catalogue: "Draft the menu",
  publish_shop: "Publish the shop page", quote_order: "Price the order", send_payment_link: "Send Razorpay payment link",
  check_payment: "Ask Razorpay if it's paid", verify_screenshot: "Check the screenshot against Razorpay",
  send_customer_message: "Message the customer", message_seller: "Message Meera", get_orders: "Look up orders",
  sales_summary: "Add up the day", growth_insights: "Work out growth and next steps", find_customers: "Find customers",
  send_broadcast: "Send Diwali broadcast",
};

export function thread(tool: string): string {
  if (["send_payment_link", "check_payment", "verify_screenshot"].includes(tool)) return "razorpay";
  if (["quote_order", "sales_summary", "growth_insights"].includes(tool)) return "rules";
  if (["read_image", "draft_catalogue", "publish_shop"].includes(tool)) return "docs";
  if (["message_seller"].includes(tool)) return "ray";
  if (["send_customer_message", "send_broadcast"].includes(tool)) return "shopify";
  return "agent";
}

// The static build (Vercel) has no backend: data, images and the recording are files under /static.
export const STATIC = import.meta.env.VITE_STATIC === "1";

const imageFiles: Record<string, string> = {};
export function setImageFiles(images: { id: string; file: string }[] = []) {
  for (const im of images) imageFiles[im.id] = im.file.split("/").pop() ?? im.id;
}
export function imageUrl(id: string): string {
  return STATIC ? `/static/images/${imageFiles[id] ?? id}` : `/api/images/${id}`;
}
// Recorded events carry backend image paths such as /api/images/menu-1.
export function imageSrc(url: string): string {
  const m = /^\/api\/images\/([^/?#]+)$/.exec(url);
  return m ? imageUrl(m[1]) : url;
}
