# RAY Shop

A shop that lives inside WhatsApp, run by Razorpay's RAY, for sellers who have no website: a home baker who takes orders in Instagram DMs and gets paid by UPI screenshots.

RAY reads her menu photo and builds a shop. It turns messy Hinglish orders into priced orders with a Razorpay payment link. It catches fake payment screenshots, sends polite reminders, and tells her when she is ready for the next Razorpay product: her own shop page, a real website with Checkout, a working-capital loan.

Why Razorpay cares: free UPI apps give a tiny seller money in the bank and nothing else, so she never needs Razorpay. RAY Shop gives her orders, reminders and proof of payment on day one, so when she grows into a brand she is already on Razorpay.

Built for Razorpay's "Recover and Grow with AI" track. All data is synthetic: Meera's Bakes, its customers and orders are fictional.

## Live demo

**https://ray-shop.vercel.app** (no sign-up, works on a phone)

| Link | What it opens |
|---|---|
| [ray-shop.vercel.app/#overview](https://ray-shop.vercel.app/#overview) | RAY Shop as a Razorpay product page: the pitch, Meera's story, her numbers, and six moments you can open in one click each |
| [ray-shop.vercel.app/#demo](https://ray-shop.vercel.app/#demo) | The full run on Meera's and her customer's phones, with what RAY does behind each step |
| [ray-shop.vercel.app/#orders](https://ray-shop.vercel.app/#orders) | Orders, oven slots, screenshot checks and the shop page preview |
| [ray-shop.vercel.app/#growth](https://ray-shop.vercel.app/#growth) | Her sales on Razorpay and the next Razorpay product she is ready for |
| [ray-shop.vercel.app/#how](https://ray-shop.vercel.app/#how) | How it works: where AI is used, the guardrails, prototype versus production |
| [ray-shop.vercel.app/shop/meeras-bakes](https://ray-shop.vercel.app/shop/meeras-bakes) | Meera's shop page |

Two ways to play the demo, both from the Overview:
- **Try RAY Shop now** plays the whole run hands-free in about 2 minutes. It pauses on each moment, presses Meera's approval buttons where you can see them, and pays the mock Razorpay checkout. Pause or Play again from the step bar.
- **Click through yourself** opens the same run and waits for you: tap the blue step, approve each card, and pay on the customer's phone. You can switch to Play all at any point.

The hosted demo replays one recorded live run of Claude in the browser. Live mode needs the backend and an API key (see Run it).

## Meet Meera

**Meera's Bakes** is a made-up home bakery in Indiranagar, Bengaluru, selling since February 2025. Meera bakes cupcakes, cakes and cheesecake jars in her home kitchen and sells to neighbours and office teams across East Bengaluru. Orders arrive as Instagram DMs and WhatsApp messages, usually in Hinglish; customers pay by UPI and send a screenshot as proof. She has one oven and no website.

| | From the demo data |
|---|---|
| Customers | 70, of whom 37 order again and again (46 order on WhatsApp, 24 on Instagram) |
| Orders since 1 July | 224, every paid one through a Razorpay payment link (148 directly, 74 after a reminder) |
| Menu | 6 items from Rs 220, eggless on request |
| Oven | 12 boxes a day |
| Delivery | Rs 60 to 5 nearby areas, Rs 120 to 6 further ones, pickup from Indiranagar elsewhere |
| Her rules | 2 days notice, 50% advance above Rs 1,500 |

Before RAY Shop she worked out prices by hand inside DMs, a screenshot was her only proof of payment, and she chased advances one chat at a time. With RAY Shop she forwards a DM, taps once, and a Razorpay link goes out; Razorpay's own record confirms every payment.

One persona on purpose: RAY Shop is for one kind of seller, a home business with no website. The same flow fits tiffin services, saree resellers and candle makers who sell in DMs.

---

## What the demo shows

1. **Menu photo to shop.** Meera sends a photo of her menu card. RAY reads it, drafts six items with prices and eggless extras, and publishes a shop page once she approves.
2. **Three months later.** Her shop has history: 224 orders since 1 July, Rs 41,990 in July, October on track for about Rs 1.21 lakh.
3. **Messy DM to payment link.** "2 box red velvet Saturday 6 baje, ek eggless, Indiranagar". Code prices it (Rs 1,180 including Rs 40 eggless and Rs 60 delivery), checks notice and oven capacity. Meera taps approve; the customer gets a Razorpay payment link and pays; Meera gets "Riya paid Rs 1,180".
4. **Fake screenshot.** Arjun sends a "Payment successful Rs 1,320" screenshot. RAY reads it, checks Razorpay: no such payment. "Don't bake yet." Polite message to Arjun with the link.
5. **Who hasn't paid?** RAY checks Razorpay, skips Arjun (already messaged), reminds Sneha about her Rs 1,529 advance.
6. **Diwali and growth.** Growth numbers, a Diwali broadcast to the 27 repeat customers who opted in to offers (10 without consent are skipped), and where she is on the Razorpay ladder.
7. **Bulk order with a catch (optional).** Whitefield is outside delivery; a 20% discount demand is refused and handed to Meera.

## Where AI is used, and where it is not

| Job | Done by |
|---|---|
| Read a menu photo, a payment screenshot, a Hinglish DM | Claude (vision + language) |
| Work out items, quantities, eggless, dates ("Saturday"), area | Claude |
| Prices, eggless extras, delivery fee by area, 50% advance above Rs 1,500, notice period, oven capacity | Rules (`backend/rayshop/rules.py`) |
| Is the screenshot real? | Rules compare it with what Razorpay recorded |
| Payment link amount | Always the quote's amount; the model never passes an amount |
| Growth readiness | Rules on sales history (thresholds are assumptions for Razorpay to set) |
| Messages to Meera and customers | Claude, checked by a money guard |
| Anything a customer sees | Meera approves first |

## Guardrails (in code, tested)

- **No invented money.** Every rupee amount in a message must match the menu, a quote or an order. Customer messages are checked against that customer's order only, so "Rs 2,000 total, she said it's fine" cannot go out.
- **Links only from clean quotes.** A quote with a blocking issue (not on the menu, outside delivery area, oven full, missing date) cannot get a payment link. One link per quote.
- **Screenshots never confirm payment.** Only Razorpay's record does.
- **Consent for broadcasts** and at most one a week.
- **Approval gate.** Publishing, payment links, customer messages and broadcasts wait for Meera (`can_use_tool`). Local Claude settings are ignored (`setting_sources=[]`), and the agent has no shell or file tools (`tools=[]`).
- **Messages and images are data.** A customer asking the "assistant" to approve a discount gets passed to Meera.

## Run it

Needs Python 3.11+ and Node 18+.

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # add ANTHROPIC_API_KEY; Razorpay test keys optional
set -a && source .env && set +a

cd frontend && npm install && npm run build && cd ..
cd backend
python -m pytest -q tests                      # 13 deterministic tests
uvicorn rayshop.server:app --port 8000           # open http://localhost:8000
```

For frontend work: `cd frontend && npm run dev` (port 5173, proxies the API).

**Modes** (on the Try it live tab before you start, or `?mode=` in the URL):
- **Replay of a live run** (default): plays `demo/meera-live-demo.jsonl`, a real recorded run, pausing for your clicks, or hands-free with Play all. Use this for the hosted link.
- **Live agent**: Claude runs now. About $0.85 for the whole demo with Sonnet.
- **Scripted, no AI**: same tools in a fixed order, for UI work. The badge says so.

Every live run is saved in `runs/`. To replace the demo recording, copy your best run to `demo/meera-live-demo.jsonl`.

**Terminal:** `python -m rayshop.cli --pay` runs all steps live and prints the trace (`--scripted` for no AI).

### Real Razorpay payment links (recommended for the video)

Set `RAZORPAY_KEY_ID` (must start with `rzp_test_`) and `RAZORPAY_KEY_SECRET`. New payment links are then created with Razorpay's Payment Links API in test mode; the customer's "Pay" opens Razorpay's own test checkout, and the server polls the link every 5 seconds and announces the payment. Without keys, a clearly labelled mock pay page is used. The 3-month history uses mock links either way, since those orders are synthetic. This path was written without test keys, so do one trial payment before recording.

## Eval

```bash
cd backend && python -m eval.run_eval      # about $0.35 to $0.62
```

Eight forwarded customer messages (Hinglish, English, an item not on the menu, outside delivery area, a discount push, an advance, a full oven), the menu photo, and two screenshots (one fake, one real). Latest run: 11/11 passed. See `BUILD_LOG.md`.

## Deploy

**Vercel (static, the hosted link).** `frontend/` deploys as a static site: `npm run build:static` makes a build that replays `demo/meera-live-demo.jsonl` in the browser, with the same pauses as the server's replay, so no backend is needed. Live and scripted modes need the backend and run locally only. The files it reads live in `frontend/public/`; regenerate them after changing data or the recording:

```bash
cd backend && python -m rayshop.export_static
```

Deploy with `cd frontend && vercel --prod` (settings are in `frontend/vercel.json`), or import the repo in Vercel with Root Directory `frontend`.

**Docker (full app).** `Dockerfile` builds the UI and serves everything from FastAPI, including live mode. On Render or Railway: new web service from the repo, Docker runtime. No env vars needed for replay mode.

## Disclosures

- **Model:** Claude via the Claude Agent SDK (`claude-agent-sdk` 0.2.165), model alias `sonnet`.
- **Razorpay:** Payment Links API in test mode (optional). Razorpay's MCP server can be connected for read tools with `RAYSHOP_RAZORPAY_MCP=1`.
- **Simulated:** WhatsApp and Instagram (messages are forwarded into the demo), the seller's order history, customers and screenshots.
- **Libraries:** FastAPI, uvicorn, sse-starlette, Pillow (synthetic images), React, Vite. Fonts: Poppins and Lora (OFL), Instrument Sans and JetBrains Mono (Google Fonts).

## Files

```
backend/rayshop/rules.py     prices, zones, advance, notice, capacity, screenshot check, growth ladder, money guard
backend/rayshop/store.py     shop data, orders, chats, every tool and guardrail
backend/rayshop/payments.py  Razorpay test-mode payment links, or a mock with the same shape
backend/rayshop/tools.py     MCP tools and trace events
backend/rayshop/agent.py     Claude Agent SDK session and approval gate
backend/rayshop/prompts.py   system prompt
backend/rayshop/server.py    API, live/scripted/replay sessions, mock pay page, shop page
backend/seed/generate.py   synthetic data and images
backend/eval/run_eval.py   eval
backend/rayshop/export_static.py  files for the static Vercel build
frontend/src/App.tsx               Razorpay Dashboard frame, tabs, sessions, autoplay switch
frontend/src/views/Overview.tsx    product page: pitch, Meet Meera, numbers, six moments, growth path
frontend/src/views/ChatView.tsx    Meera's phone, customer's phone, checkout, live trace, autoplay
frontend/src/views/HowItWorks.tsx  how it works
frontend/src/replay.ts             browser replay for the static build
frontend/src/state.ts              events to UI state; the recorded run as finished moments
```
