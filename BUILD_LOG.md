# AI build log

What AI built, what a person decided, and how it was checked.

## Template for your own entries

```
### YYYY-MM-DD HH:MM, <tool and model>
Goal:
What the AI produced:
What I changed or rejected, and why:
How I checked it:
```

---

### 2026-10-10, first prototype: Clear-to-Settle (dropped)

- Built an agent for D2C brands whose settlements are on hold (separate repo).
- A Razorpay PM reviewed it and said no. His direction: help small sellers with no storefront (a cupcake seller on Instagram and WhatsApp) start on Razorpay, so it is already in their stack when they grow. He also noted that kirana ideas fail because UPI is free while Razorpay charges a fee.
- Kept from that build: the approval gate, the live trace, rules-for-money, and the guardrail pattern.

### 2026-10-13, 02:15 to 03:10 IST: Claude (cloud session), first build (working name "Shuru")

**Goal (Vidhi):** "how do we build it", building the WhatsApp shop idea in time for the deadline.

**Decisions**
- Story: Meera's Bakes, Bengaluru (working name at the time: "Shuru"). The demo opens on day 1 with a menu photo, then jumps three months so growth has real history.
- The fee problem is answered in the product, not hidden: the seller gets orders, reminders and screenshot checks that free UPI does not give, and the pitch asks Razorpay to keep it cheap at the start (an open question for the PM).
- All money in code. The model never passes an amount to the payment link tool; it passes a quote id.
- Money guard scoped per audience. A customer message is checked against the menu and that customer's own order, so an amount that exists elsewhere in the books cannot slip through. A unit test caught this: "Rs 500" passed the first, global version of the guard because some other order had that amount.
- Item matching: "Red velvet cake 2 kg" first matched "Red velvet cupcakes" (two words in common). Fixed so a cake never matches cupcakes. Caught by a unit test before any live run.

**What the first live run showed, and the fix**
- The agent asked Meera to reply "haan" in chat instead of calling the publish and broadcast tools, so the approval card never appeared. The prompt now says approvals happen on the card, never in chat.
- The money guard blocked a correct menu summary because draft prices weren't in the known amounts yet. Fixed.

**How it was checked**
- 13 deterministic tests (`backend/tests`): pricing, advance, zones, eggless, not on menu, capacity and notice, scoped money guard, one link per quote, blocked quotes, fake and real screenshots, payment flow, broadcast consent and weekly limit, catalogue checks, growth ladder.
- Full live run through the UI, recorded as `demo/meera-live-demo.jsonl`: menu read correctly, Rs 1,180 quote, payment confirmed, fake screenshot caught, one reminder (Arjun not reminded twice), broadcast to 27 opted-in customers, Kavya's Whitefield order handled with pickup and the discount refused. About 113 seconds of agent time, $0.86.
- Eval (`python -m eval.run_eval`), Sonnet:

| Case | Expected | Got | Link sent | Pass | Cost |
|---|---|---|---|---|---|
| riya | Rs 1180 | Rs 1180 | yes | yes | $0.03 |
| cake_hsr | Rs 1320 | Rs 1320 | yes | yes | $0.03 |
| pickup_tomorrow | no link (rules block) | Rs 1140 (short_notice, capacity) | no | yes | $0.03 |
| not_on_menu | no link (rules block) | - | no | yes | $0.02 |
| outside_zone | no link (rules block) | Rs 2998 (outside_zone) | no | yes | $0.03 |
| discount_push | Rs 3058 | Rs 3058 | yes | yes | $0.04 |
| advance | Rs 1920 | Rs 1920 | yes | yes | $0.03 |
| capacity | no link (rules block) | Rs 12052 (capacity) | no | yes | $0.04 |
| menu photo | 6 items | 6 read right | - | yes | $0.04 |
| screenshot_ss-arjun-1 | not_received | not_received | - | yes | $0.03 |
| screenshot_ss-real-1 | matches | matches | - | yes | $0.03 |

11/11 passed, $0.35 total. One correction, stated openly: the first run marked `pickup_tomorrow` as a failure because my expected answer was wrong. Tomorrow's oven was already 10 of 12 slots full, so the rules correctly blocked the order. I fixed the expectation, not the agent, and reran the whole eval.
- UI checked with screenshots of every step in scripted, live and replay modes, plus phone width.

**Known gaps**
- Razorpay test-mode links are written but untested here (no test keys in the build session).
- WhatsApp and Instagram are simulated; in production RAY would sit on the seller's WhatsApp Business number.
- Growth thresholds (Rs 50k a month for a shop page and so on) are assumptions for Razorpay to set.
- Human checks still to do: show it to 2 or 3 home sellers, and ask the PM about pricing for tiny sellers.

### 2026-10-13, 12:00 to 15:30 IST: Claude (cloud session), research, proofread and rename to RAY Shop

**What Vidhi asked:** check whether Razorpay already does this, study Razorpay's Instagram for ideas, write the final idea in detail, proofread it "with all the context", suggest names that fit Razorpay's product names.

**What the AI produced**
- Feasibility check: RAY on WhatsApp (launched 2 Sep 2026) sends payment links, refunds and settlement updates for existing merchants, but has no shop or order layer. Unregistered individuals can onboard with PAN, Aadhaar and a bank account.
- A review of about 50 Razorpay Instagram posts (Aug to Oct 2026). Used in the pitch: "RAY on WhatsApp bringing Razorpay to millions of SMEs" (GFF'26), Agent Studio relaunch, Builders Day agent use cases. Used for the roadmap: drop mode, UPI Autopay subscriptions, gifting from abroad, AI discovery.
- A detailed idea doc, then an independent review of it by a second agent playing a Razorpay judge.

**What the review caught, and what changed**
- Wrong maths: "one fake screenshot costs more than 2% of a month's sales" was false (2% of September is Rs 1,532, more than the Rs 1,320 cake). Rewritten: one fake screenshot costs as much as the 2% fee on Rs 66,000 of sales.
- Wrong ladder claim: Meera was not "one month away from a website" (September was under Rs 1 lakh). Rewritten with the real numbers.
- Overclaims removed: "100% of fields" (it was 6 items and 2 screenshots), a weekly summary that is not built, voice notes that are not built, and test-mode links described as if they had run.
- Eval wording fixed: 4 orders linked at the exact price and 4 correctly blocked (the discount push was linked at the right price, not blocked).
- Added: a comparison with WhatsApp Business, Instamojo, store builders and plain Payment Links; risks for customers who pay personal UPI directly, settlement timing and consent.

**Decision (Vidhi):** name it RAY Shop, because it extends RAY instead of adding a new brand.

**Rename and re-check**
- Python package `shuru` renamed to `rayshop`, env vars `SHURU_*` to `RAYSHOP_*`, all UI text updated. The system prompt changed by one word (the product name).
- 13 deterministic tests pass.
- Eval rerun after the rename: 11/11 passed again, $0.62 total ($0.03 to $0.10 per case; the first three cases were slower and costlier in this run).
- The recorded demo run (`demo/meera-live-demo.jsonl`) was made before the rename. The product name never appears in its messages, so it was kept; only one internal field name was updated.

### 2026-10-13, evening: Claude Code (desktop), local setup, demo walkthrough and Razorpay-style UI

**What Vidhi asked:** get the prototype running, click through the demo, then "build properly, very very good Razorpay like UI". She will record the video by clicking through replay mode.

**What the AI produced**
- Local setup: Python 3.12 environment, UI build, 13 tests passing.
- A new UI in Razorpay's visual language: navy sidebar, Razorpay blue (#305EFF) for actions, TASA Orbiter and Inter fonts, Dashboard-style KPI cards, tables and status badges, a dark "What RAY is doing" panel, and a demo step bar that says what to click next.
- A mock Razorpay checkout sheet on the customer's phone (UPI, cards, netbanking, processing, success), labelled "Test mode · mock checkout · no real money".
- Orders page with summary cards and filters; a shop preview and `/shop` page styled like Razorpay Payment Pages with working quantity buttons; a Growth page with progress toward each Razorpay product.

**Fixes found while clicking through**
- "Stopped by rules" stayed at 0 for the whole demo; a caught fake screenshot now counts.
- The trace said "Ready for: website" while RAY told Meera she wasn't ready. The id `website` is the Payment Pages step; the trace now shows product names.
- "Biscoff cheesecake jar jar": the pack is hidden when the item name already contains it.
- Six synthetic orders listed the same item on two lines (e.g. 1 + 2 boxes of eggless vanilla). Merged in `ledger.json`, in the recorded demo's order snapshot (order lines only, no AI text changed) and in the generator. Totals are unchanged.
- The Rs 1 lakh rule counted October's projection as a finished month. It now counts finished months only (`rules.py`).
- With Razorpay test keys, the customer's Pay button called the mock endpoint, which refuses real links. It now opens Razorpay's own checkout page.
- Replay waited only 20 seconds for the presenter to tap Pay; now 90.
- In replay, Pay buttons for links the recording never pays are disabled, so a stray click can't show a fake success.
- The `/pay` and `/shop` pages put the link id and session id into HTML and JavaScript unescaped. Both are now escaped.

**How it was checked**
- 13 deterministic tests pass. TypeScript build is clean.
- Full replay run through all 7 steps in the browser at 1440x900, including the checkout sheet, plus the Orders, Growth and `/shop` pages, and phone width (375px, no sideways scroll).

**Known gaps (unchanged)**
- Three wording slips live in the recorded AI text and need a new live run to fix: Riya called unpaid in a trace note after she paid, a half-Devanagari word, and "Biscuit" for "Biscoff".

### 2026-10-13, late evening: Claude Code (desktop), fewer clicks, Razorpay Dashboard frame

**What Vidhi asked:** make it as neat as a reference prototype (razorpay-blindspot.vercel.app) and show the Razorpay-relevant parts right away, since the demo took too many clicks.

**What changed**
- New landing page, Overview: Razorpay KPIs (collected on Razorpay, October pace, paid after reminders, fake screenshots caught) and the six moments of the recorded run. Picking a moment shows it finished on Meera's phone and the customer's phone side by side, with what happened behind it. No clicks to see value, one per moment (it was about 14 to reach the payment).
- The recorded run is played instantly through the same reducer (`buildStory` in `state.ts`), so Orders and Growth open populated instead of empty on day 1.
- "How it works" page: five steps, where AI is used and where it is not, guardrails, prototype versus production. Claims are taken from the README and this log.
- Shell styled like the Razorpay Dashboard: dark top bar, light grouped nav, demo-account strip, light activity panel. The step-by-step demo stays as "Live on WhatsApp", and each page has its own link (#overview, #demo, #orders, #growth, #how).

**How it was checked**
- 13 tests pass, TypeScript build clean.
- All six moments clicked at 1440x900; step-by-step demo run end to end (27 steps, $0.86) on the server build; Overview checked on the static build and at 375px.

### 2026-10-13, night: Claude Code (desktop), match Razorpay's dashboard, less clutter

**What Vidhi said:** it did not look quite like Razorpay and was still cluttered; she shared a screenshot of the real dashboard (Magic Checkout page).

**What changed**
- Measured the reference prototype's styles (it is built on Razorpay's Blade): Razorpay blue #1364F1, TASA Orbiter 600 headings, Inter 14px body, muted #616D75, hairline-border card shadow. Matched them in CSS rather than adding Blade as a dependency.
- Shell copied from the screenshot: black top bar (Razorpay Home, Payments, More, search), content in a rounded panel, quiet white side nav with RAY Shop under Payment Products, and page tabs.
- Overview rebuilt as a Razorpay product page: hero card (pill, big heading with the product name in blue, three ticks, one wide blue button, product phone), a card of four big blue numbers, the six moments as a clean list with one phone and a Meera/customer toggle, and a four-step growth strip. The behind-the-scenes trace moved off the overview.
- Coloured chips toned down to neutral grey tags; Growth's six tiles became one four-number card.

**How it was checked:** 13 tests pass; every tab checked at 1440x900; step-by-step demo run end to end (27 steps, $0.86); Overview at 375px with no sideways scroll.
- Autoplay (same session): "Try RAY Shop now" on the Overview, or "Play all" on the demo, runs the whole step-by-step demo hands-free in about 2 minutes. It presses each approval button visibly, opens and pays the mock checkout, and pauses between moments so they can be read. Pause and Play again are on the step bar; manual clicking still works. Checked: one click ran all 7 steps to "Demo complete" (27 steps, $0.86); Pause stops before the next step.

### 2026-10-14: Claude Code (desktop), persona, manual play, README links

- **Meet Meera** section on the Overview: a logo for Meera's Bakes (a cupcake mark, now used wherever "MB" was), who she is, how she sells today, before and after RAY Shop, her handwritten menu, and facts from the demo data (70 customers, 37 repeat; 223 paid orders since July, all through payment links; 12 boxes a day; delivery fees; her rules).
- **Second persona: decided against.** RAY Shop targets one kind of seller (home businesses with no website). A second persona would need its own recorded AI run and would double the demo without a new Razorpay point. One line notes that the same flow fits tiffin services, saree resellers and candle makers.
- **Click through yourself** button beside Try RAY Shop now, for manual play. The step bar's idle hint and counter are hidden on narrower screens so all seven steps fit next to Play all.
- README: Live demo section with every link, how to play it both ways, and a Meet Meera section.
- Checked: 13 tests pass; manual button opens the demo waiting for a tap; Play all fits the step bar with no overflow at 1440px; shop page shows the logo.

### 2026-10-14: Claude Code (desktop), what sells, order value, offer result

**What Vidhi asked:** show what sold most and least (so Meera can drop items), the biggest earner, average order value per customer, and how many the Diwali message reached versus how many paid. Check first whether each is worth showing.

**What the data supported**
- What sells and what earns: yes. Red velvet sells most (131 boxes, 34% of item revenue). Chocolate cake earns almost as much (31%) from fewer than half the sales. Biscoff jar is smallest (4.5%) but growing and bought with another item 52% of the time, so the rules do not suggest dropping it. Chocolate truffle is slowing (15 boxes on 1 to 12 Sep, 10 on 1 to 12 Oct).
- Order value: yes. Average paid order Rs 1,037. Repeat customers spend a little less per order (Rs 1,007) but Rs 5,171 each over three months, against Rs 1,849 for occasional ones.
- Offer reached versus paid: only partly. 27 sent, 10 skipped for consent are real. The recorded run ends the day it was sent and orders carry no source, so "paid" is shown as 0 with a note, not invented.

**What changed**
- `rules.insights`: per-item units, revenue, share, same-days trend, and rule-based tags and advice (best seller, most revenue, growing, slowing, add-on, seasonal, candidate to drop), plus order value by customer type. Served at `/api/insights` and exported to `static/insights.json` for Vercel.
- The Diwali hamper is marked seasonal in the catalogue, so its unpaid first order does not make it a "candidate to drop". A new test caught that case.
- Growth page: What's selling table with a one-line verdict, What an order is worth, and the Diwali offer funnel.
- Checked: 14 tests pass; Growth page on the server and static builds.
