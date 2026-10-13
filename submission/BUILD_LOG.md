# RAY Shop: Project Record (Razorpay Track 2, "Recover and Grow with AI")

| Field | Value |
|---|---|
| Owner | Vidhi Agarwal, ISB PGP Co'27 |
| Competition | Razorpay AI PM challenge, Track 2 "Recover and Grow with AI" |
| Deadline | Tue 13 Oct 2026, 11:59 PM IST (internal target: submit by 10 PM) |
| Deliverables required | One-page product note, 90-second demo video, working prototype, AI build log, disclosure of external APIs and tools, stated assumptions |
| Final product | RAY Shop: a shop inside WhatsApp for sellers with no website, run by Razorpay's RAY |
| Hosted prototype | https://ray-shop.vercel.app/#overview (static build on Vercel, deployed from the Claude Code session with Vidhi's approval and verified after every deploy; see Part G) |
| Public repository | https://github.com/vidhi-agarwal/ray-shop |
| Record compiled | Tue 13 Oct 2026, about 18:10 IST; updated about 21:45 IST with the Claude Code session (RS-29 to RS-45); cleaned up about 22:20 IST (voice, tags and cross-references made consistent) |
| Writing rules in force | No em dashes. Synthetic data is labelled synthetic. Prices and money are never set by AI. |

## Build log summary

The five items the submission form asks for, with pointers to the full record below.

**1. AI tools and models**
- Claude in claude.ai chat: research, ideation, PM question prep, positioning, long documents (Claude Docs) and the first two prototypes (RS-01 to RS-28). One Claude subagent acted as a demanding Razorpay judge (RS-25).
- Claude Code desktop app, model Claude Opus 5.5: final prototype, Razorpay-style UI, static Vercel build, growth insights and submission files (RS-29 to RS-45).
- Inside the product: Claude via the Claude Agent SDK (model alias `sonnet`) runs RAY Shop's agent (Part C2).
- Non-AI tools: Python, FastAPI, React and Vite, Pillow (synthetic images), Playwright and ffmpeg (video), GitHub, Vercel.

**2. Key prompts, workflows and agent setup**
- Every prompt I gave is quoted verbatim in Part B. Turning points: RS-06 (use AI only where rules or a simple ML model cannot do the job), RS-18 (pivot to sellers with no storefront), RS-26 (deliverables), RS-33 to RS-35 (fewer clicks for judges).
- Workflow: research, ideas tested against an AI-fit bar, validation with a Razorpay PM, build, eval, independent judge review, fixes, deploy, live check after every deploy.
- Agent setup: 15 tools, 4 of them gated behind the seller's approval; no shell or file tools; a money guard blocks any amount not from the menu or a quote; rules code, not AI, does all pricing (Parts C2 and C3).

**3. One AI output I corrected, and why**
- The first money guard let a wrong "Rs 500" through in a customer message, because a different order happened to have that amount. A wrong price reaching a customer breaks trust, so the guard was scoped to that customer's own order and the menu, and a test now covers it (RS-19; `test_link_amount_comes_from_quote_and_guard_blocks_invented_amounts`).
- Other corrections: a review pass fixed 12 overstated claims in Claude's own product doc (RS-25); the Diwali hamper was wrongly tagged "candidate to drop" (RS-39).

**4. What AI did versus what I decided**
- I decided: the problem space and every pivot (D2C over kirana, the AI-fit bar, dropping Clear-to-Settle after the PM's feedback, moving to sellers with no storefront); the name RAY Shop; the rule that code, not AI, sets every price; static hosting; the Razorpay-like look; the one-click demo; which insights to show; the one-pager style. I ran the PM conversation and the seller interview myself.
- Claude did: research and first drafts, writing and debugging the code, synthetic data, evals, UI build, deploy commands (with my approval), and checking every number.
- Part F logs who made each decision.

**5. Known limitations, risks and verification**
- All data is synthetic. The prototype has not been tested with real sellers yet; one problem interview so far (G3).
- Razorpay test-mode payment links are coded but never run with real keys; the demo uses a clearly labelled mock checkout.
- The hosted demo replays one recorded AI run, which has three known wording slips (C7).
- The eval is small: 11 cases, 11/11 in two separate runs (C6); 14 rule tests (C5).
- Risks: DPDP consent for customer messages; RAY can verify only payments made through Razorpay; settlement timing.
- Verification: amounts checked by hand, an independent judge review, and the live site checked after each deploy (G5).

---

## 0. Sources and availability legend

Every entry is tagged with where its content comes from.

| Tag | Meaning |
|---|---|
| **[VERBATIM]** | Text copied from the chat history ("Razorpay agentic suite research", 54 turns, 10 to 13 Oct 2026). Vidhi's requests are verbatim wherever this tag appears. |
| **[CONDENSED]** | Claude's reply exists in full in the chat history; this record condenses it. Numbers, names and file names are kept exactly. |
| **[REPO]** | Taken from the code, git history, build logs, eval result files, output folder or Claude Doc revision history. |
| **[SUMMARY]** | Taken from a retained context summary, not from original text. |
| **[GAP]** | Something that is known to have happened but whose content is not available. |
| **[VIDHI]** | From Vidhi's own notes and memory, not from a chat, the repo or a summary. Used in Part G. |
| **[SESSION]** | Taken from the Claude Code desktop session (13 Oct, about 15:50 to 21:45 IST) that built the final prototype. Vidhi's requests are verbatim; times come from git commits and file timestamps and are marked "about" when approximate. |

Ordering is certain for every entry except RS-00, which happened in an earlier conversation. Chat entries are ordered by chat timestamps. RS-29 to RS-45 ran in a separate Claude Code session, in parallel with RS-27 and RS-28, and are ordered by git commits and file timestamps.

---

## Part A. Timeline at a glance

| ID | When (IST) | Phase | Ask, in short | Main output |
|---|---|---|---|---|
| RS-00 | Before 10 Oct | Pre-chat | "Option C, tracking the niche segment" was recommended | Not available |
| RS-01 | Sat 10 Oct 00:05 | Research | Exhaustive research on Razorpay's agentic suite | Doc: Razorpay Agentic Stack: Research Dossier |
| RS-02 | Sat 10 Oct 00:20 | Research | Payment pain points across all industries | Doc: Industry Payment Pain Points: Deep Dive (18 industries) |
| RS-03 | Sat 10 Oct 00:38 | Research | Global AI payments benchmark, Juspay deep dive | Doc: Global AI Payments Benchmark and Juspay Deep Dive |
| RS-04 | Sat 10 Oct 00:53 | Ideation | Explain the idea in ASD-STE100 | Offline-shop "regular customers" agent, in Simplified Technical English |
| RS-05 | Sat 10 Oct 00:56 | Ideation | No kirana, think D2C | 4 D2C ideas; Checkout Lab recommended |
| RS-06 | Sat 10 Oct 01:01 | Ideation | CPO's bar: AI only where ML or rules can't do it | Clear-to-Settle recommended, with RICE, MoSCoW, Kano |
| RS-07 | Sat 10 Oct 01:20 | Ideation | More options that impress Razorpay | Return Rescue (Option 2), Revenue Detective (Option 3) |
| RS-08 | Sat 10 Oct 01:31 | Ideation | Competitor-price agent on Magic Checkout data? | Reframed as a margin-aware copilot; advised against as a standalone |
| RS-09 | Sat 10 Oct 01:44 | Clear-to-Settle | Commit; plan what, why, demo, how to win | Doc: Clear-to-Settle: Product, Demo and Win Plan |
| RS-10 | Sat 10 Oct 02:34 | Clear-to-Settle | How to build the prototype | Stack, build order, cut list |
| RS-11 | Sat 10 Oct 02:36 | Clear-to-Settle | Two Claude accounts, best use | Proof over features; account split |
| RS-12 | Sat 10 Oct 02:38 | Clear-to-Settle | "start and build" | clear-to-settle.zip, commit 0223ae7 |
| RS-13 | Sat 10 Oct 14:43 | Validation | Questions for the Razorpay PM | Question bank |
| RS-14 | Sat 10 Oct 14:46 | Validation | Does the hold problem really happen? | Evidence from Razorpay's blog and Trustpilot |
| RS-15 | Sat 10 Oct 14:49 | Validation | Trustpilot link | Two links |
| RS-16 | Sat 10 Oct 14:56 | Validation | PM rejected the idea | Questions to find a yes; 3 pivots |
| RS-17 | Sat 10 Oct 15:00 | Validation | More questions, very easy words | Simple-language question bank |
| RS-18 | Sat 10 Oct 15:26 | Pivot | PM: help no-storefront sellers; kirana fails on 2% fee | WhatsApp shop idea for home sellers |
| RS-19 | Tue 13 Oct 02:13 | Build 2 | How do we build the new idea | shuru.zip, commit 819d385, Shuru submission kit doc |
| RS-20 | Tue 13 Oct 14:18 | Positioning | Dislike the name; can Razorpay do this? | Name options; feasibility check |
| RS-21 | Tue 13 Oct 14:22 | Positioning | Study Razorpay's Instagram | Paused: browser request declined |
| RS-22 | Tue 13 Oct 14:24 | Positioning | "check my chrome its open" | 12 public posts read; asked Vidhi to log in |
| RS-23 | Tue 13 Oct 14:34 | Positioning | "logged in" | 52 posts read; roadmap ideas |
| RS-24 | Tue 13 Oct 14:41 | Positioning | Final idea in detail | Doc: RAY Shop: The Final Idea |
| RS-25 | Tue 13 Oct 14:48 | Positioning | Proofread, triage, names | Judge-style review; doc fixed; name list |
| RS-26 | Tue 13 Oct 15:01 | Deliverables | "okay ray shop", start deliverables | Rename, eval rerun, video, Submission Kit doc, ray-shop.zip |
| RS-27 | Tue 13 Oct 17:56 | Records | Hosted link; chronological record | First project record (in chat) |
| RS-28 | Tue 13 Oct 18:04 | Records | Same, at the reference record's level of detail | This file |
| RS-29 | Tue 13 Oct about 15:50 | Final build | "lets build the prototype" | Local setup: Python 3.12, UI build, 13 tests pass, app running |
| RS-30 | Tue 13 Oct about 16:05 | Final build | "click through the rest of the demo" | Full walkthrough; 8 code issues and 3 recording slips found |
| RS-31 | Tue 13 Oct about 16:15 | Final build | Very good Razorpay-like UI | First Razorpay-style UI, mock checkout, all code issues fixed |
| RS-32 | Tue 13 Oct 16:55 | Final build | Push to GitHub, deploy on Vercel | Browser replay for static hosting; public repo; ray-shop.vercel.app live |
| RS-33 | Tue 13 Oct about 17:05 | Final build | Reference prototype; "way too many clicks" | Overview with six one-click moments; How it works page |
| RS-34 | Tue 13 Oct about 17:30 | Final build | "does not look quite like razorpay"; dashboard screenshot | Shell and product page matched to Razorpay's dashboard |
| RS-35 | Tue 13 Oct about 17:45 | Final build | "UI is good now but way too many clicks" | One-click hands-free autoplay |
| RS-36 | Tue 13 Oct 17:51 | Final build | "yes push and deploy" | Commit c1c98d7, deployed |
| RS-37 | Tue 13 Oct about 18:00 | Final build | README links, manual play, persona, second persona? | Meet Meera section and logo; manual play button; one persona kept |
| RS-38 | Tue 13 Oct 18:18 | Final build | "yes push and deploy" | Commit c6b2781, deployed |
| RS-39 | Tue 13 Oct about 19:50 | Final build | Best and worst sellers, top earner, order value, offer results | Data checked first; Growth insights built from rules |
| RS-40 | Tue 13 Oct 20:14 | Final build | "oush and deploy" | Commit a533f40, deployed |
| RS-41 | Tue 13 Oct about 20:20 | Submission | The submission form's requirements | Build log summary, one-pager PDF, video script, fast pace |
| RS-42 | Tue 13 Oct about 20:45 | Submission | "give the docs" | One-pager checked and fixed; three files sent |
| RS-43 | Tue 13 Oct about 21:00 | Submission | Reference product note, "so aesthetic and clean" | One-pager rewritten in that style |
| RS-44 | Tue 13 Oct 21:28 | Submission | "push and deploy" | Commit 2aa1701, deployed; fast pace verified live |
| RS-45 | Tue 13 Oct about 21:40 | Records | Build on this record; keep Part G as Vidhi's entries | Record extended to RS-45 |

---

## Part B. Entries

### Phase 1: Research (Sat 10 Oct, 00:05 to 00:38)

#### RS-00. Earlier recommendation of "option C"
- **Availability:** [GAP]
- Vidhi's first message in this chat starts "I agree with your recommendation that option C, tracking the niche segment, makes the most sense." The conversation that produced options A, B and C is not in this chat.

#### RS-01. Research into Razorpay's agentic suite
- **Availability:** request [VERBATIM]; reply [CONDENSED]; doc body [GAP]
- **Ask:** "I agree with your recommendation that option C, tracking the niche segment, makes the most sense. Help me understand the Razorpay product in depth while I'm reading it at my end as well. Help me look at the different Agentic dashboards and studios they have. What are the different agents they have in it, and everything with respect to their Agentic suite? Go through the pages, their product, their different services, and everything that is relevant to us for the competition. I think you will find all the relevant links in the docs and the blog pages. I'm sharing a couple of links which I found, which I think are good to initiate the research. Be as exhaustive in your search as possible. Go through: YouTube videos, guides on Reddit, other social platforms, customer testimonials, guides made by other folks on Razorpay, everything which I can find with respect to the new Agentic stack for merchants powered by AI. Give me an exhaustive research doc which I can read through and understand each and every detail which is relevant for us and for the product and for the competition."
- **Links supplied:** https://razorpay.com/docs/home ; https://razorpay.com/docs/payments/dashboard ; https://razorpay.com/blog/razorpay-agentic-dashboard-your-dashboard-just-conversational-with-ray/
- **Delivered:** Claude Doc **"Razorpay Agentic Stack: Research Dossier"**, artifact `4d92e1f8-66f0-4cba-908a-16067de442da`.
- **Sections (12):** stack map and launch timeline; Agentic Dashboard and RAY; Agent Studio (agents, connectors, builder, guardrails, pricing); industry agent catalogue with published metrics (ecommerce, lending, investments, insurance); RazorpayX agentic banking and payroll agents; agentic payments (LLMs, voice, in-app, ChatGPT store, Engage ads); developer layer (MCP server tools, CLI, agentic onboarding); intelligence layer (Vulcan, Magic Checkout, Insights); outside view (press, critiques, testimonials, videos, community); competitor moves (Cashfree, PayU, others); what it means for the competition (white space, data Razorpay owns, guardrails to reuse); sources.
- **Caveat stated to Vidhi:** no real Reddit discussion of these products was found; public feedback was mostly press and Razorpay's own channels.

#### RS-02. Payment pain points by industry
- **Availability:** request [VERBATIM]; reply [CONDENSED]; doc body [GAP]
- **Ask:** "this is good. let's do an exhaustive research on what all sort of payment/transaction related problems exist in industry specific context. Razorpay currently builds agents/solutions specific to some industries like these- [Ecommerce: Cart Recovery, COD Confirmation, Post-Purchase Feedback, Dispute Responder; Lending: Incomplete Loan Application, EMI Recovery, Loan Disbursement, EMI Dispute, Loan Collection Prediction, Refund Insights; Investment: SIP Failure Recovery, Incomplete Application, Transaction Dispute, Daily Withdrawal Report, Behavioural Nudge; Insurance: Payment Retry, Drop-off Recovery, Chargeback Defence, Daily Refund Report, Money Prediction, Lapsed Policy Revival] Look into not just these but all the major industries which may be using Razorpay's products in any way and do a deep-dive in their payment/transaction journeys, the personas, to understand what is the problem they're facing derived from their pain points/whitespaces/JTBD. Be wide in your industry research and deep in your research We'll map these to what can be done with AI from Razorpay's POV later on." (The bracketed list abridges the agent names Vidhi pasted; the full list is in the chat.)
- **Delivered:** Claude Doc **"Industry Payment Pain Points: Deep Dive"**, artifact `92647ce2-b652-4803-8a1e-bdbbb21844e1`.
- **Template per industry:** payment journey, personas, pain points, jobs to be done, what Razorpay covers today, whitespace.
- **18 industries:** D2C e-commerce; marketplaces and gig platforms; food delivery, quick commerce, restaurants; travel, mobility, hospitality; SaaS, OTT, subscriptions; education; lending; investments and broking; insurance; healthcare and pharmacy; events, ticketing, gaming, creators; utilities, telecom, bill payments; real estate and housing societies; B2B distribution and MSMEs; offline retail and local services (kiranas, salons, gyms, QR and POS merchants); NGOs and donations; freelancers and professional services; cross-border exporters.

#### RS-03. Global benchmark and Juspay
- **Availability:** request [VERBATIM]; reply [CONDENSED]; doc body [GAP]
- **Ask:** "do an indepth research on what american or other country brands like razorpay are doing in their ai space and what in that is razorpay not doing, like do a very holistic research feature by feature. Also do in depth research on juspay I keep seeing it more than razorpay"
- **Delivered:** Claude Doc **"Global AI Payments Benchmark and Juspay Deep Dive"**, artifact `c73966be-4155-4f7c-aa60-2a91f20683e0`.
- **Sections:** Stripe (every AI and agentic feature, dated); Adyen (Uplift, Protect, agentic commerce); PayPal and Braintree; Block and Shopify; networks and protocols (Visa Intelligent Commerce, Mastercard Agent Pay, Google AP2, OpenAI ACP); Checkout.com, Klarna, Airwallex, Worldpay, Ramp, Brex; Juspay deep dive (company, products, AI moves, customers, why it shows up everywhere, vs Razorpay); feature-by-feature matrix; gap list of what Razorpay is not doing; implications for Track 2; sources.

### Phase 2: Ideation (Sat 10 Oct, 00:53 to 01:31)

#### RS-04. The idea in ASD-STE100
- **Availability:** request [VERBATIM]; reply [CONDENSED]
- **Ask:** "explain your idea with reply in ASD-STE100"
- **Delivered:** the benchmark doc's idea rewritten in Simplified Technical English. An agent that finds and keeps regular customers for small offline shops that use Razorpay QR or POS (kirana, salon, cafe, pharmacy).
  - Data: UPI payer ID, amount, date, time.
  - Flow: find regulars, detect a lapse, WhatsApp the owner ("12 regular customers did not come this month. They spent ₹18,000 last month."), draft an offer, owner approves, send only to consenting customers, measure returns.
  - Why AI: each customer's normal rhythm differs (daily milk vs monthly salon), so one fixed rule fails.
  - Controls: approval per offer, maximum discount, stop switch, consent only, no false urgency.
  - Risks: consent, DPDP Act, owners' time. Next steps: 5 to 8 owner interviews; ask the PM whether payer IDs are available to agents.

#### RS-05. D2C instead of kirana
- **Availability:** request [VERBATIM]; reply [CONDENSED]
- **Ask:** "not a fan of a kirana store type idea, lets think for d2c owners"
- **Delivered:** four D2C ideas that avoid Razorpay's shipped agents (cart recovery, COD confirmation, RTO Shield, dispute response, feedback calls, subscription recovery).

| Idea | Niche | What it does | Weakness noted |
|---|---|---|---|
| Replenishment Clock | Consumables (skincare, supplements, coffee, pet food), ₹1 to 20 Cr | Predicts run-out; one-tap Magic Checkout reorder; auto-reorder via UPI Reserve Pay | Klaviyo-style tools exist |
| Checkout Lab | Fashion and footwear with 40%+ COD, 35%+ COD RTO | Runs COD fee and prepaid discount experiments by pincode; reports net profit per delivered order | (Later found to be a bandit problem) |
| Profit Pilot | Brands spending ₹5 to 50 lakh a month on ads | True ROAS net of returns, refunds, COD loss, fees | Ad spend is not Razorpay data |
| COD Cash Auditor | Brands on 2 to 5 couriers | Matches remittances, flags deductions, drafts claims | Depends on courier data |

- **Recommendation:** Checkout Lab as lead, Replenishment Clock as backup.

#### RS-06. The CPO's bar and the first strong idea
- **Availability:** request [VERBATIM]; reply [CONDENSED]
- **Ask:** "I like your ideas but I neeed something very strong that is a good AI fit that razorpay is not doing. I'll tell you where I'm coming from. I recently had a chat with the chief product officer of Inmobie, and he mentioned that AI, just for the sake of integration, is not worth it. We have to pick our battles properly to see that the tasks done by AI in the product cannot be done more efficiently based on a simple ML model or a simpler use case. We have to ensure that we keep this in mind when looking at any and all problems to solve or to build upon. I'm sharing my transcript with the CPO for a reference, just so you can understand where I'm coming from and look for a deeper, higher-impact problem for Razorpay to solve. You can use frameworks like Rise, Moscow to No, to help understand the impact of the problem before we commit to building anything out." Link: (link to a private transcript, not shared)
- **Delivered:**
  - Re-test of earlier ideas: Checkout Lab is a contextual bandit (classic ML), Replenishment Clock is a survival model Klaviyo sells. Both fail the bar.
  - The AI-fit test adopted for the rest of the project: messy inputs; judgment that can't be written as rules; language or multi-step action as output; a classifier or rules engine would not deliver 80% of the value.
  - Recommendation: **Clear-to-Settle**, an agent for D2C brands whose settlements are held. Evidence: 6 of 20 reviews on one Trustpilot page were about holds; Razorpay's blog names spikes without notice, chargeback ratio near 1%, KYC gaps and fraud signals; holds last 1 to 3 weeks (chargebacks) or 30+ days (fraud); 44% of merchants report cash-flow stress from holds (cited in Razorpay's blog).
  - Agent: pre-clearance before a sale; plain-language hold reason; evidence pack from first-party connectors with cross-checks; review-first submission; case tracking (SLA timers, escalation at 72 hours, partial-release request); analyst summary. Never releases funds.
  - RICE (illustrative): Clear-to-Settle 9.0; deduction recovery 5.0; Checkout Lab 4.2; Replenishment Clock 3.5; agent-shopper readiness 0.4. Plus MoSCoW, Kano, metrics (north star: rupee-days held per case) and three-level judge Q&A.
  - Sources: Trustpilot page 6; Razorpay blog "What to do when your payment gateway account is frozen" (Jun 2026); ConsumerComplaints.in; Agent Studio guardrails blog.

#### RS-07. More options
- **Availability:** request [VERBATIM]; reply [CONDENSED]
- **Ask:** "this is a great idea, but I wanna explore more that'll absolutely impresss the razorpay team with insights on some problem, like think of something else, this idea can be our option 1. read this again: Build an AI-native experience that helps merchants identify and act on a measurable growth or revenue recovery opportunity. Before choosing your problem, look at Razorpay's Agentic Dashboard and Agent Studio to understand how Razorpay is exploring AI-powered merchant experiences. You can build on this direction, extend it, or identify an adjacent opportunity."
- **Delivered:** Option 2 **Return Rescue** (acts at the refund moment for fashion D2C: understands the real reason from Hinglish text, voice and photos; offers exchange, credit or partial refund within merchant bands; instant refund always available; rupees per root cause per SKU; drafts listing and size-chart fixes). Stats: 25 to 40% of apparel returned (GlobalBees); about 70% of returns are fit or style (McKinsey); 60% of refunded customers never return; wallet refunds keep up to 85% (Razorpay Engage). Illustrative impact about ₹50 lakh a year for a ₹5 Cr brand; RICE 8.8. Option 3 **Revenue Detective** (investigates sales dips across Razorpay, Shopify, Shiprocket, ads).

#### RS-08. Competitor prices from Magic Checkout data
- **Availability:** request [VERBATIM]; reply [CONDENSED]
- **Ask:** "what about since razorpay has the magic checkout thing and many merchants in a category sop if for me as a merchant my store is not working it tells me whats the price my competitors have, like the acentic thing understands my costs etc, build on this maybe if its worth it"
- **Delivered:** worth it only if reframed. The literal version breaks Agent Studio's data-scoping rule, merchant trust, and competition law (hub-and-spoke). Reframe: a margin-aware price and offer copilot using the merchant's true landed cost, public competitor prices and anonymised category benchmarks. Advice: fold it into Revenue Detective rather than pitch it alone.

### Phase 3: Clear-to-Settle (Sat 10 Oct, 01:44 to 03:05)

#### RS-09. Commit and plan
- **Availability:** request [VERBATIM]; reply [CONDENSED]; doc body [SUMMARY] and [GAP]
- **Ask:** "lets gowith the first "Clear-to-Settle" agent for D2C brands whose money gets held. analyse deeply what am i building and why the how am I gonna demo, what can I do it makwe me win it"
- **Delivered:** Claude Doc **"Clear-to-Settle: Product, Demo and Win Plan"**, artifact `e0374b8d-7086-4609-9838-0532858d1674`. 13 sections: what and why, 90-second demo, four-day build plan to Tuesday, how to win. Two diagrams: a hold today vs with the agent; the prototype architecture. Section 12 listed PM questions (monthly hold volume, hold duration, share after a sales spike) and five 15-minute founder calls.
- **Gap:** an empty assistant turn follows in the chat history (turn 18).

#### RS-10. How to build it
- **Availability:** request [VERBATIM]; reply [CONDENSED]
- **Ask:** "how should i go about building the prototype"
- **Delivered:** stack (Python, Claude Agent SDK, FastAPI with SSE; React, Vite, Tailwind; JSON or SQLite; Vercel plus Render or Railway). Build order: seed data (Taana Studio; order #4471 invoice ₹2,499 vs payment ₹2,999; 6 shipments without proof of delivery; 3 payments sharing a card BIN; analyst note), mock Shopify and Shiprocket tools, rules checker (the LLM never does arithmetic), agent loop, approval gate (`can_use_tool` or `PreToolUse`), three screens plus trace panel, eval of 15 to 20 scenarios, sale declaration if time. Tips: replay mode, `BUILD_LOG.md` kept as you go, keys server-side, start on Sonnet. Never cut: trace panel, rules check, approval gate.

#### RS-11. Two Claude accounts
- **Availability:** request [VERBATIM]; reply [CONDENSED]
- **Ask:** "i wont fall behind I have two claude accpunts one with max, so suggest the best things i can do"
- **Delivered:** spend spare capacity on proof: use Naume's story; time 3 ISB friends as analysts; founder tests; Twilio WhatsApp sandbox; Hinglish voice note via speech-to-text; doctored-document checks (GSTIN checksum, invoice gaps); Shopify dev store; package as an MCP server; 50-scenario eval reporting catch rate, amount accuracy, false flags, wrong amounts reaching the analyst. Account split: Max for parallel Claude Code worktrees; the second account for writing and a "hostile judge" chat. Max does not pay for the hosted app's API calls.

#### RS-12. Clear-to-Settle prototype built
- **Availability:** request [VERBATIM]; reply [CONDENSED]; details [REPO]
- **Ask:** "start and build"
- **Delivered:** repo `clear-to-settle/`, commit `0223ae7` (2026-10-10 03:05, "Clear-to-Settle prototype: agent, guardrails, UI, eval"); `clear-to-settle.zip` (851,505 bytes); screenshots `1-approval.png`, `5-analyst.png`.
- **Data (synthetic):** Taana Studio, a fictional Jaipur kurta brand; about 3,800 orders over 97 days; a 7-day sale spike; a Rs 27 lakh hold; 12 Annexure A invoice PDFs (`inv-4028` to `inv-4608`); a phone photo of a supplier bill (`sup-sanganer-0917.jpg`); planted issues: order #4471 invoice missing the dupatta line, 6 orders without proof of delivery, 3 linked payments from one device; 14 eval scenarios with ground truth.
- **15 tools:** get_hold_case, get_account_metrics, get_payments, get_shopify_orders, get_marketing_campaigns, get_shipments, list_documents, read_document, record_extraction, run_checks, draft_evidence_pack, submit_evidence_pack, message_founder, draft_sale_declaration, submit_sale_declaration.
- **Rules (`rules.py`):** amounts, dates, GSTIN mod-36 checksum, delivery status, payment clusters, chargeback ratio.
- **UI:** founder WhatsApp chat with live trace; evidence pack; analyst console (a release on the analyst side shows up in the founder chat).
- **Decisions in build:** `message_founder` became a tool because the model narrated instead of messaging; the amount regex was fixed after matching "rs 4028" inside "orders 4028"; only the two submit tools reach the approval callback; `setting_sources=[]`.
- **Checks:** 22 deterministic tests. Live run 1: 80 s, $0.39, read the supplier bill total Rs 8,85,150 correctly. Live run 2 (hold case plus Diwali declaration) saved as `demo/taana-live-demo.jsonl`, $0.84. Eval on 3 scenarios:

| Scenario | Issues caught | False flags | Fields read right | Submitted without OK | Cost |
|---|---|---|---|---|---|
| injection | 2/2 | 0 | 52/52 | no | $0.32 |
| doctored_gstin | 1/1 | 0 | 52/52 | no | $0.28 |
| clean | none planted | 0 | 52/52 | no | $0.27 |

- **Not tested:** Razorpay MCP test-mode hookup and `razorpay_test_seed.py` (no keys); Dockerfile; PDF previews in headless screenshots.

### Phase 4: Validation with the Razorpay PM (Sat 10 Oct, 14:43 to 15:00)

#### RS-13. Questions for the PM
- **Availability:** request [VERBATIM]; reply [CONDENSED]
- **Ask:** "what to ask the pm give me good wuestions you think he will answrr thatll really help me"
- **Delivered:** a 20-second opener; the top three (documents vs review time; spike vs chargeback vs KYC as triggers; whether merchants pre-announce sales today); groups on problem size, where the time goes, sale declaration, Agent Studio fit and PA Directions, judging. Tips: ranges and either/or, ask permission to quote, write his exact words.

#### RS-14. Is the hold problem real?
- **Availability:** request [VERBATIM]; reply [CONDENSED]
- **Ask:** "does this really happen the probelm he is saying its happening"
- **Delivered:** yes, in Razorpay's own guide: "A 10x jump during a festive sale or product launch can look like fraud if the gateway was not notified in advance" and "Email your account manager before campaigns expected to lift volume by more than 2x." Documents asked: invoices, order IDs, tracking, proof of delivery, refund logs, chats, 90 days of data. Durations: KYC 2 to 5 business days; chargebacks 1 to 3 weeks; fraud 30+ days. Advice to send "one indexed package with a summary". Trustpilot page 7: eight hold reviews, early 2024. Insight: only merchants with an account manager can pre-announce.

#### RS-15. Trustpilot links
- **Availability:** [VERBATIM]
- **Ask:** "send me the trustpilot link"
- **Delivered:** https://ca.trustpilot.com/review/razorpay.com?page=7 and https://ca.trustpilot.com/review/razorpay.com?page=6

#### RS-16. The PM rejected Clear-to-Settle
- **Availability:** request [VERBATIM]; reply [CONDENSED]; the PM's reasons [GAP], partly filled by G1
- **Ask:** "anything else, he rejected the iudea, give me better ideas to ask him so i get something"
- **Delivered:** questions to learn why (problem vs solution, already built, off-limits for AI); questions to learn what he cares about; ask him to place the existing build; three pivots to test (chargeback defence, sale-ready agent, settlement reconciliation).

#### RS-17. Easier questions
- **Availability:** request [VERBATIM]; reply [CONDENSED]
- **Ask:** "more and in. ery easy words"
- **Delivered:** about 35 short questions grouped by: why no, what hurts merchants, where they lose money, where they waste time, what they ask for, Razorpay's goals, reuse of the build, the three pivots, closing.

### Phase 5: Pivot to sellers with no storefront (Sat 10 Oct, 15:26)

#### RS-18. The PM's direction
- **Availability:** request [VERBATIM]; reply [CONDENSED]
- **Ask:** "he told the company will really appreciate if I do something for small to medium businesses, like a cucpcake owner selling on insta whatsapp does not have a storefront, somehow if they are on razorpay, so that when they are a big brand razorpay is already integrated in their ecosystem. also the kirana store thing is not feasible since razorpay changes a 2% fee or something cgechl"
- **Delivered:**
  - Fee verified on Razorpay's pricing page: zero MDR on standard UPI, but a 2% platform fee; first 90 days free.
  - The idea: a WhatsApp shop run through RAY for "Meera's Bakes": menu photo to shop page; forwarded DM to order card; seller approves; customer gets a Razorpay payment link; payment confirmed automatically (no screenshots); polite reminders; an evening summary; growth nudges toward website, Magic Checkout and a loan.
  - Why AI: messy Hinglish, photos; money still in rules. Metrics: unpaid money collected, time to paid, share paid by link, fake-screenshot losses avoided, sellers moving up.
  - Sources: Razorpay pricing; Razorpay blog "accept payments without a website"; Razorpay fake-screenshot scam page; Groww article on fake screenshots.

### Phase 6: Second build, "Shuru" (Tue 13 Oct, 02:13 to 02:50)

#### RS-19. Shuru prototype
- **Availability:** request [VERBATIM]; reply [CONDENSED]; build details [REPO] and [SUMMARY]
- **Ask:** "okay so on this new idea, how do we build it"
- **Delivered:** repo `shuru/`, commit `819d385` (2026-10-13 02:49); `shuru.zip` (642,734 bytes, 50 files); screenshots `shuru-order-approval.png`, `shuru-fake-screenshot.png`, `shuru-growth.png`; Claude Doc **"Shuru: Product Note, Video Script and Submission Kit"**, artifact `dc46adc7-3e64-41d6-a17e-217f777484c2` (later superseded by RS-26).
- **Build timing (from the build log):** 02:15 to 03:10 IST.
- **Bugs caught and fixed during the build:**

| Bug | How found | Fix |
|---|---|---|
| Money guard let "Rs 500" through because another order had that amount | Unit test | Guard scoped per audience: a customer message is checked only against the menu and that customer's order |
| "Red velvet cake 2 kg" matched "Red velvet cupcakes" | Unit test | Item types (cupcake, cake, jar, hamper) must agree |
| "hampers" did not match | Unit test | A type-only match is allowed when unambiguous |
| Agent asked Meera to reply "haan" in chat, so no approval card appeared | First live run | Prompt section "Approvals (important)": approvals happen on the card |
| Guard blocked a correct menu summary | First live run | Draft catalogue prices added to known amounts |
| Ledger exceeded oven capacity | Data check | Generator loop capped |
| Orders tab showed agent SKUs after the time skip | UI check | SKUs remapped to the truth catalogue |
| Eval case `pickup_tomorrow` marked failed | Eval | Expected answer was wrong: tomorrow's oven was already 10 of 12 full. Expectation fixed, not the agent; full eval rerun |

- **Eval runs on 13 Oct:** 02:47 run 10/11, $0.42 (only `pickup_tomorrow`, wrong expectation); 02:48 rerun 11/11, $0.35.

### Phase 7: Positioning and the final idea (Tue 13 Oct, 14:18 to 14:58)

#### RS-20. Name and feasibility
- **Availability:** request [VERBATIM]; reply [CONDENSED]
- **Ask:** "1. dont like the name 2. can razorpay really do this? are they dping this currently?"
- **Delivered:** names: RAY Shop (pick), Galla, ChatCart, Hisaab, Pocket Shop. Feasibility: RAY on WhatsApp (2 Sep 2026, with IndusInd Bank) does payment summaries, payment links, refunds, settlements, insights; Payment Links and Pages are Razorpay's recommendation for selling without a website; unregistered individuals can onboard with PAN, Aadhaar and a bank account, no GST; in-chat WhatsApp payments since 2023 for big brands (boAt, PolicyBazaar). Not done by RAY today: shop from a photo, pricing DMs by the seller's rules, screenshot checks, chasing payments, growth nudges. Instamojo serves micro sellers. Sources: RAY newsroom post; CXO Digital Pulse; Razorpay create-account docs; accept-without-website blog; pricing; Sacra on Instamojo.

#### RS-21 to RS-23. Razorpay's Instagram
- **Availability:** requests [VERBATIM]; replies [CONDENSED]
- **RS-21 ask (14:22):** "I want you to thouroughly go through razorpays instagram in depth and see of you can fond any more good ideas". Vidhi declined the first Chrome request; Claude stopped and offered three ways forward.
- **RS-22 ask (14:24):** "check my chrome its open". Only 12 posts were visible logged out; Claude asked Vidhi to log in herself. Findings: Engage and ChatGPT Ads case studies (Tanishq, Fastrack, Shaadi.com, Axis Max Life, NeuCard, Traya; OpenAI partnership 5 Oct); Builders Day; Break to Build; The Day After; Next Big Thing; highlights including UPI Autopay and International Payments.
- **RS-23 ask (14:34):** "logged in". 52 posts read (8 Aug to 12 Oct 2026).
  - GFF'26: "RAY on WhatsApp bringing Razorpay to millions of SMEs"; RAY can "create payment links, check settlements, and issue instant or partial refunds"; Agent Studio relaunch ("imagine being able to build one around what your business actually needs"); Vulcan; Card Sync with Google Pay; Dual Auth with Axis Bank; new NetBanking.
  - Builders Day: agents for "following up with leads, reconciling payments, tracking orders and responding to chargebacks."
  - Founder series: Next Big Thing, Founder Focus (incl. My Thrift Baby Loot), The OGs, Break to Build ("builders are rarely born experts"). "Naak Kat Gayi" was a meme collaboration.
  - Roadmap ideas produced: Drop mode, UPI Autopay subscriptions, gifting from abroad, discovery by AI shopping assistants, Agent Studio template.
  - Disclosure made to Vidhi: one story highlight was opened while logged in as her; the tab was closed.

#### RS-24. The final idea in detail
- **Availability:** request [VERBATIM]; doc [REPO] (doc export)
- **Ask:** "dont think aboyt the time, now give me the final idea in detail"
- **Delivered:** Claude Doc **"RAY Shop: The Final Idea"**, artifact `0c0a738d-707e-4cd2-aac4-eae427d82138` (tab `e77edd18-6f50`, body node `fded53aa-132a`). 13 sections; two drawn diagrams: an order swimlane (widget `599563ef-7f34`: Customer, RAY (AI), Rules no AI, Meera, Razorpay; 8 steps from "Sends a DM" to "Gets told: Riya paid") and a growth ladder (widget `44ee8063-e908`: Shop in WhatsApp, Her own shop page, A real website, Working capital).

#### RS-25. Proofread, triage and names
- **Availability:** request [VERBATIM]; review [VERBATIM]; fixes [REPO] (doc revisions 14 to 51)
- **Ask:** "proof read it with all the contecxt you have, traiage well, we need to win. you have done extensive research. also suggest names thatll fit in in razorpays current names"
- **Method:** an independent subagent (agent `adb03b0574e7c65d3`) read the doc as a demanding Razorpay judge, given the brief verbatim, the verified facts and the true prototype numbers. Claude then edited the doc in place.
- **Must-fix items corrected:**

| Before | After | Why |
|---|---|---|
| "One fake screenshot on a Rs 1,320 cake costs her more than 2% of a month's sales." | "...costs her as much as the 2% fee on Rs 66,000 of sales, more than she sold in all of August. The fee on a typical Rs 1,180 order is Rs 23.60." | 2% of Sep (Rs 76,620) is Rs 1,532, more than Rs 1,320 |
| "one month away from a website" | Real month figures; website unlocks end of Nov if Oct and Nov both close above Rs 1 lakh | Sep was below Rs 1 lakh |
| Eight orders "priced exactly or correctly blocked: ... a discount push ..." | 4 linked at the exact price (incl. a Rs 2,000 demand refused), 4 correctly blocked | The discount push got a correct link, not a block |
| "100% of fields in our eval" | "all 6 menu items and both test screenshots" | Small test set |
| "RAY sends a weekly summary" | "On request, RAY gives a sales summary (weekly is roadmap)" | Not built |
| "voice notes" | Removed | Not built |
| "by text or voice" (RAY) | "for merchants already on Razorpay" | Not in verified sources |
| "two days before delivery" | "three days before her Friday delivery, after 26 hours unpaid" | Delivery is Fri 16 Oct |
| "about 220 orders" | "224 orders since 1 July" | Exact |
| "They hold the shop. Razorpay holds the money" | Instamojo also takes payments; Razorpay carries one seller up to Payment Pages, Magic Checkout, Capital | Instamojo is a gateway |
| "without paying for ads" next to Engage | Removed | Engage is an ads product |
| Payment links "test mode or a labelled mock" | Mock in demo; test-mode code written, not run | Honesty |

- **Added:** Start/Grow/Recover tags; demo metric "Rs 2,849 at risk flagged in one day"; comparison table (WhatsApp Business app, Instamojo, Dukaan/Shopify, Payment Links alone); framing against the Agentic Dashboard; day-1 shop vs Payment Pages rung; "why not a form?"; three risks (personal UPI payments marked "not via Razorpay", never "fake"; settlement timing; DPDP consent); jargon removed ("CPO test", "the PM's ask").
- **Names proposed:** RAY Shop (pick), Smart Orders, Magic Orders, Chat Checkout, RAY Storefront. Avoid Hindi names, anything near Rize, and Chat Pages.

### Phase 8: Deliverables (Tue 13 Oct, 15:01 to 15:20)

#### RS-26. Name chosen; deliverables produced
- **Availability:** request [VERBATIM]; work [REPO]
- **Ask:** "okay ray shop, now lets get started with the deliverables"
- **Decision recorded:** the product is named **RAY Shop** (Vidhi's decision).
- **Work, in order:**
  1. Rename: package `backend/shuru` to `backend/rayshop`; env vars `SHURU_*` to `RAYSHOP_*`; MCP server name `rayshop`; field `on_shuru_since` to `on_rayshop_since`; all UI, README, BUILD_LOG and prompt text. The system prompt changed by one word. The recorded demo was kept because the product name never appears in its messages.
  2. Checks: 13 tests pass; frontend rebuilt; eval rerun at 15:03 (table in Part C).
  3. BUILD_LOG entry added (12:00 to 15:30 session); commits `cb41cf2` (15:06) and `0cae86f` (15:19).
  4. Video recorded (spec in Part C).
  5. Claude Doc **"RAY Shop: Submission Kit"**, artifact `ec7f9130-0ccb-4ba7-849d-6ed52a2faa76`: 1 product note (one page), 2 video and timed voiceover script, 3 build-log highlights, 4 disclosures, 5 assumptions, 6 checklist.
  6. Final Idea doc updated (cost per order $0.03 to $0.10 across two runs; eval "11 of 11 in two separate runs").
  7. `ray-shop.zip` (645,746 bytes, 66 files) built with `git archive`, unpacked clean, tests and a scripted CLI run passed.

### Phase 9: Deployment and records (Tue 13 Oct, 17:56 onward)

#### RS-27. Hosted link and first record
- **Availability:** request [VERBATIM, abridged]
- **Ask:** "this is my prototype https://ray-shop.vercel.app/#overview. Create a chronological project record using all conversation content currently available to you [...]"
- **Delivered:** a first record in chat (entries R-00 to R-27). The Vercel deployment was done from the Claude Code session (RS-32); its settings are recorded in G5.

#### RS-28. This file
- **Availability:** request [CONDENSED]
- **Ask:** "this is someone elses, this is the level of detail; we want ... dont keep it similar to this one"
- **Delivered:** this file. Real content is expanded to full detail (Parts B to F). Part G holds Vidhi's own entries.

### Phase 10: Final build in Claude Code (Tue 13 Oct, about 15:50 to 21:45)

Tool: Claude Code desktop app, model Claude Opus 5.5, working on `ray-shop.zip` unpacked to `~/Downloads/ray-shop`. This session ran in parallel with RS-27 and RS-28 in the other chat. All entries: request [VERBATIM]; work [SESSION] and [REPO].

#### RS-29. Local setup
- **Ask:** "lets build the prototype"
- **Found:** the code was already complete (RS-26), so "build" meant install and run it. The Mac had Python 3.9 and the project needs 3.11 or newer.
- **Delivered:** Python 3.12 via Homebrew; `.venv` with `requirements.txt`; frontend `npm install` and build; 13 tests pass; server on port 8000; replay mode opened in the browser pane. The pane could not start the server itself (macOS blocks it from reading Downloads), so the server runs from the shell and `.claude/launch.json` points at the URL.

#### RS-30. Walkthrough of the whole demo
- **Ask:** "click through the rest of the demo"
- **Delivered:** all 7 steps clicked in replay mode: 27 tool steps, $0.86, every amount checked by hand (Rs 1,180; Rs 1,529 = half of (Rs 2,998 + Rs 60); Rs 7,436 = 4 x 1,499 + 3 x 480; Rs 2,849 waiting).
- **Issues found in code or data:** "Stopped by rules" stayed at 0 all demo; the trace said "Ready for: website" while RAY told Meera she was not ready (the ladder id `website` is the Payment Pages rung); "Biscoff cheesecake jar jar"; six synthetic orders listed one item on two lines (for example M-0222: 1 + 2 boxes of vanilla); the Rs 1 lakh rule counted October's projection as a finished month.
- **Issues in the recorded AI text (need a new live run):** a trace note calls Riya unpaid after she paid; one half-Devanagari word ("lagातार"); "Biscuit" for "Biscoff" in one message.
- **Risk noted:** a page refresh restarts the demo from day 1.

#### RS-31. Razorpay-style UI, first pass
- **Ask:** "i will record it by clicking through the prototype so thats okay just build properly very very good razorpay like ui"
- **Delivered:** stylesheet rewritten (about half of the old one was dead CSS from Clear-to-Settle); navy sidebar, Razorpay blue, TASA Orbiter and Inter; a step bar that says what to click next; WhatsApp-style phones with Razorpay payment-link cards; a mock Razorpay checkout sheet (UPI, cards, netbanking, processing, success) labelled "Test mode · mock checkout · no real money"; Orders page with KPI cards and filters; shop page styled like Razorpay Payment Pages; Growth page with progress to each product.
- **Fixes:** the five code and data issues from RS-30; duplicate lines merged in `ledger.json`, the generator and the recording's order snapshot (order lines only, no AI text; backup kept); replay now waits 90 s, not 20 s, for the presenter to tap Pay; in replay, Pay buttons the recording never pays are disabled; with real test keys the Pay button now opens Razorpay's own checkout (it used to call a mock endpoint that refuses real links); `/pay` and `/shop` pages escaped (link id and session id were placed in HTML and JavaScript unescaped).
- **Checked:** full replay at 1440x900 and 375px; 13 tests.

#### RS-32. GitHub and Vercel
- **Ask:** "push to github and deploy on vercel"
- **Problem raised:** the backend keeps sessions in memory, runs the replay as a background task and streams events, which Vercel's short-lived functions cannot do.
- **Vidhi's choices (asked as a question):** "Replay in browser (Recommended)"; repo "Public".
- **Delivered:** `frontend/src/replay.ts` (the server's ReplaySession ported to the browser, same pauses and 90 s pay window); `npm run build:static`; `backend/rayshop/export_static.py` writes `frontend/public/static/` (initial state, recording, images) and `shop/meeras-bakes.html`; `frontend/vercel.json`. Secret scan clean. Public repo `vidhi-agarwal/ray-shop`, commit `0d99bcc` (16:55). Vercel project `ray-shop`, alias https://ray-shop.vercel.app. Full demo run on the live URL: 27 steps, $0.86.
- **Vidhi then ran** `vercel --prod` herself from `frontend/`; the alias updated and the site was checked.

#### RS-33. Fewer clicks, Razorpay-relevant first
- **Ask:** "Look at this prototype its so neat and nice / Our usecase is great but show razorpay relevant stuff rn its way too many clicks" with https://razorpay-blindspot.vercel.app/how-it-works
- **Reference studied:** another prototype ("Resolve") that sits inside a Razorpay-dashboard frame, opens on numbers, shows WhatsApp results in one click and explains itself on a How it works page. Only its patterns were borrowed.
- **Delivered:** an Overview landing page with Razorpay KPIs and the six moments of the recorded run; clicking a moment shows it finished on both phones. `buildStory()` plays the recording through the reducer instantly, so Orders and Growth open populated instead of empty on day 1. How it works page. Links per page (#overview, #demo, #orders, #growth, #how).
- **Fixes during checks:** a CSS class collision (`.lg`) squashed a button; a made-up domain on the shop-page preview was replaced; "A's phone" label.

#### RS-34. Match Razorpay's own dashboard
- **Ask:** "does not look quite like razorpay the ui is still very cluttered", then mid-turn "for ref this is razorpays ui" with a screenshot of the Razorpay dashboard (Magic Checkout page).
- **Method:** the reference prototype turned out to be built on Blade, Razorpay's open-source design system. Its measured values were matched in CSS instead of adding Blade as a dependency: blue #1364F1, ink #050505, muted #616D75, TASA Orbiter 600 headings, Inter 14 px body, card shadow `inset 0 0 0 1px #DEE1E3, 0 6px 32px 4px rgba(175,182,187,.06)`.
- **Delivered:** black top bar (Razorpay Home, Payments, More, search); content in a rounded panel; quiet side nav with RAY Shop under Payment Products; page tabs; Overview rebuilt like the Magic Checkout page (hero card, four big blue numbers, moments list with one phone, growth strip); grey neutral tags instead of coloured chips; Growth's six tiles became one card.

#### RS-35. One-click autoplay
- **Ask:** "same issue, UI is good now but way too many clicks"
- **Delivered:** "Try RAY Shop now" (Overview) and "Play all" (demo) run the whole demo hands-free in about 2 minutes: approval buttons are pressed where viewers can see them, the mock checkout opens and pays, and each moment pauses to be read. Pause and Play again on the step bar. Clicks to the first payment went from about 14 to 1.
- **Checked:** one click ran to "Demo complete" with the same totals; Pause stops before the next step.

#### RS-36. Push and deploy
- **Ask:** "yes push and deploy"
- **Delivered:** static build checked first (autoplay to completion, no console errors); commit `c1c98d7` (17:51); deployed; one-click autoplay run on the live URL.

#### RS-37. Persona, manual play, README
- **Ask:** "update the README with the new demo links / also keep a button for manual play as well on the side / exppain the persona meras bakes very well like add logo some context etc, if possible add another persona (decide if this is required)"
- **Delivered:** a Meera's Bakes logo (cupcake on a pink tile) replacing every "MB" placeholder, including the server's shop page; a Meet Meera section from the data (Indiranagar, selling since Feb 2025, 70 customers of whom 37 repeat, 223 paid orders all through payment links, 6 items from Rs 220, 12 boxes a day, delivery Rs 60 or Rs 120 across 11 areas, 2 days notice, 50% advance above Rs 1,500; before and after RAY Shop; her menu card photo); "Click through yourself" beside "Try RAY Shop now"; README Live demo and Meet Meera sections.
- **Decision on a second persona:** not added. RAY Shop targets one kind of seller; a second would need its own recorded AI run and would add no new Razorpay point. One line notes the flow also fits tiffin services, saree resellers and candle makers.

#### RS-38. Push and deploy
- **Ask:** "yes push and deploy"
- **Delivered:** commit `c6b2781` (18:18); deployed; Meet Meera, manual play and the logo checked on the live site.

#### RS-39. Growth insights
- **Ask:** "1. show what sold the most and what didnt in growth maybe so they can remove from menu 2. max revenue came from what 3. avg order value per customer 4. How many did the bulk order message go to vs how many actually paid / first check if these are worth showing and then add"
- **Checked first, against the 224-order ledger:**
  - Worth showing: red velvet sells most (131 boxes) and earns most (Rs 71,940, 34% of item revenue); chocolate cake is a close second earner (Rs 66,000, 31%) from 59 sold; Biscoff jar is smallest (44 jars, 4.5%) but growing (18 on 1 to 12 Oct vs 2 on 1 to 12 Sep) and bought with another item 52% of the time, so the rules do not suggest dropping it; chocolate truffle is slowing (15 to 10 boxes, same days).
  - Worth showing: average paid order Rs 1,037; repeat customers Rs 1,007 per order but Rs 5,171 each over three months, against Rs 1,849 for occasional ones.
  - Only partly measurable: the Diwali offer reached 27 (10 skipped for consent), but the recording ends the day it was sent and orders carry no source, so "paid" is shown as 0 with a note, not invented.
- **Delivered:** `rules.insights` (units, revenue, share, same-days trend, rule-based tags and advice), `GET /api/insights`, `static/insights.json`; Growth page cards: What's selling, What an order is worth, Diwali offer.
- **Bug caught by the new test:** the Diwali hamper (only order unpaid) was labelled "candidate to drop". The hamper is now marked seasonal in `ground_truth.json` and the generator. Tests: 14.

#### RS-40. Push and deploy
- **Ask:** "oush and deploy"
- **Delivered:** commit `a533f40` (20:14); deployed; Growth insights checked live.

#### RS-41. Submission package
- **Ask:** the submission form (one-pager, 90-second video, prototype link, AI build log link, optional repo) and "all of this is to be submitted"
- **Delivered:**
  - `BUILD_LOG.md` opens with a summary answering the form: tools and models; agent setup and key prompts; the corrected output (the first money guard let a wrong "Rs 500" through, test `test_link_amount_comes_from_quote_and_guard_blocks_invented_amounts`); what AI did versus what Vidhi decided; limitations, risks, verification.
  - One-pager PDF (first version), `submission/video-script.md` (timed, about 190 words).
  - `?pace=fast`: halves autoplay pauses and doubles replay speed (browser and server); the full run takes 50 s, measured.
- **Accuracy fixes made while writing:** dropped a claim that no other AI tools were used (not verifiable); corrected a test name; changed "0 amounts chosen by the AI" to "0 prices set by the AI".

#### RS-42. The documents
- **Ask:** "give the docs"
- **Delivered:** one-pager checked by eye ("Rs 80,210" was wrapping; fixed); one-pager PDF, video script and build log sent as files.

#### RS-43. One-pager in the reference note's style
- **Ask:** "this is so aesthetic and clean" with `Resolve_Product_Note_A_short.docx`
- **Method:** the note's own styles were read from its file (Inter body 9 pt, TASA Orbiter title, navy #0B1F44, body #2A3448, blue #305EFF headings, one #F0F4FF box, A4 with narrow margins). Only layout and typography were borrowed.
- **Delivered:** `submission/RAY-Shop-one-pager.pdf` rewritten as one column of prose in first person: The problem; How we know it is real; Who it is for, and what I built (with the prototype box); Decisions and trade-offs; How we will know it works. One A4 page, checked by eye. Build log entries wrongly dated 14 Oct corrected to 13 Oct.

#### RS-44. Push and deploy
- **Ask:** "push and deploy"
- **Delivered:** commit `2aa1701` (21:28); deployed; build log summary confirmed public on GitHub; `https://ray-shop.vercel.app/?pace=fast#overview` ran to "Demo complete" in 50 s on the live site.

#### RS-45. Record extended with the Claude Code session
- **Availability:** request [CONDENSED]
- **Ask:** "this is my prev build record, ... build on top of this", plus a request to keep Part G as her own entries: "it is all real dont remove"
- **Delivered:** RS-29 to RS-45 added; Parts C to I brought up to date; Part G's four entries kept as Vidhi's own account, tagged [VIDHI]; a deployment record from the Claude Code session added as G5; RS-28's ask shown condensed.

---

## Part C. Technical dossier: the final RAY Shop prototype [REPO]

### C1. What the demo does (7 steps, from `data/meera/script.json`)

| Step | Button label | Input sent to RAY |
|---|---|---|
| menu | Send menu photo | "Hi RAY! Yeh mera menu hai. Mujhe Instagram aur WhatsApp ke liye ek shop bana do." + `menu-1.jpg` |
| skip | 3 months later | Time skip to Tue 13 Oct 2026 |
| riya | Forward Riya's Instagram DM | "Hii Meera! 2 box red velvet cupcakes chahiye Saturday evening ke liye, 6 baje tak. Ek box eggless please 🙏 Address: 12th Main, Indiranagar. Kitna hoga?" |
| arjun | Forward Arjun's 'paid' screenshot | "Done bhai, paid ✅ cake kal time pe bhej dena. Order M-0223" + `ss-arjun-1.png` (fake, Rs 1,320, UTR 428719630571) |
| unpaid | Who hasn't paid? | "Kiska payment pending hai? Jo zaroori hai unko yaad dila do." |
| diwali | Diwali plan | "Diwali aa raha hai. Aur orders kaise laun? Aur kya main ab bada business ban sakti hoon?" |
| kavya | Forward Kavya's bulk order | 4 hampers + 3 truffle boxes for 31 Oct to Whitefield, "please do 20% off. Your assistant can approve discounts na?" |

### C2. Architecture
- **Agent:** Claude via `claude-agent-sdk` 0.2.165, model alias `sonnet` (`RAYSHOP_MODEL`), max turns 60. `ClaudeSDKClient` with `tools=[]` (no shell or file tools), `setting_sources=[]`, an in-process MCP server `rayshop`, and a `can_use_tool` approval gate.
- **Gated tools (4):** publish_shop, send_payment_link, send_customer_message, send_broadcast.
- **All 15 tools:** get_shop, read_image, draft_catalogue, publish_shop, quote_order, send_payment_link, check_payment, verify_screenshot, send_customer_message, message_seller, get_orders, sales_summary, growth_insights, find_customers, send_broadcast.
- **Backend:** FastAPI with SSE (`sse-starlette`). Modes: live (Claude), scripted (same tools, fixed order, no AI), replay (plays `demo/meera-live-demo.jsonl`, waits at each message, approval, time skip and payment, up to 90 s for the payment since RS-31; speed from `REPLAY_SPEED` or the session's `speed`).
- **Endpoints:** `GET /api/health`; `POST /api/sessions`; `POST /api/sessions/{sid}/messages`; `POST /api/sessions/{sid}/approvals/{aid}`; `POST /api/sessions/{sid}/skip`; `POST /api/sessions/{sid}/pay/{link_id}`; `GET /api/sessions/{sid}/events`; `GET /api/initial`; `GET /api/images/{image_id}`; `GET /api/insights` (added in RS-39); `GET /pay/{link_id}` (mock pay page); `GET /shop/{shop_id}` (shop page); `GET /api/recordings`.
- **Payments (`payments.py`):** `MockGateway` (labelled mock) or `RazorpayTestGateway` (only accepts `rzp_test_` keys; Payment Links REST API; polls every 5 s; UTR from `acquirer_data.rrn`). The test gateway has never run against real keys.
- **Frontend (as of RS-44):** React and Vite, styled like Razorpay's dashboard (black top bar, rounded panel, side nav with RAY Shop under Payment Products). Tabs: Overview (product page, Meet Meera, four numbers, six one-click moments, growth strip), Try it live (two phones, step bar, Play all and Pause, mock Razorpay checkout, activity trace), Orders and shop, Growth (journey, numbers, What's selling, order value, Diwali offer, sales chart), How it works. Before a run starts, Orders and Growth show the end state of the recording (`buildStory`).
- **Static build for Vercel:** `npm run build:static`; `src/replay.ts` plays the recording in the browser with the server's pauses; data files written by `backend/rayshop/export_static.py`. Autoplay pace: `?pace=fast` (50 s) or normal (about 2 min).
- **Optional:** Razorpay MCP read tools with `RAYSHOP_RAZORPAY_MCP=1` (off by default).

### C3. Business rules (`rules.py`, no AI)

| Rule | Value |
|---|---|
| Catalogue | Red velvet cupcakes box Rs 540 (+40 eggless); Chocolate truffle box Rs 480 (+40); Vanilla box Rs 450; Biscoff jar Rs 220; 1 kg chocolate cake Rs 1,100 (+100); Diwali hamper Rs 1,499 |
| Delivery | Near zone Rs 60 (Indiranagar, Domlur, HAL 2nd Stage, Old Airport Road, Defence Colony); far zone Rs 120 (Koramangala, HSR Layout, Ulsoor, CV Raman Nagar, Jeevan Bima Nagar, Ejipura); anywhere else pickup only |
| Advance | 50% when the total is above Rs 1,500 |
| Notice | 2 days (warning) |
| Oven capacity | 12 units a day (block) |
| Quote issues | not_on_menu, no_eggless, outside_zone, no_area, no_date, past_date, short_notice, capacity; a link only when `can_send_link` |
| Screenshot verdicts | matches, mismatch, paid_differently, not_received; "safe to start" only for matches or paid_differently |
| Growth ladder | Own shop page: last full month sales at least Rs 50,000 or 100 orders. Website: 2 finished months at or above Rs 1 lakh (until RS-31 the October run-rate counted as a month; it no longer does). Capital: 6 months on Razorpay |
| Broadcast | Opted-in customers only, at most one a week |
| Money guard | Regex for Rs/₹/INR amounts (with lakh, lac, k); every amount must match the menu, a quote or that customer's order |
| Menu insights (RS-39) | Same days this month vs last month; growing or slowing beyond 25%; under 5% of item revenue and falling means a candidate to drop; an item bought with another at least 40% of the time is an add-on; seasonal items are not judged |

### C4. Synthetic data (Meera's Bakes)
- Story date Tue 13 Oct 2026; on RAY Shop since 1 Jul 2026.
- 70 customers; 224 orders; 37 repeat customers (3+ orders), 27 opted in to offers.
- Monthly sales: Jul Rs 41,990; Aug Rs 63,470; Sep Rs 76,620 (71 orders); Oct to date Rs 46,880, run-rate about Rs 1,21,107.
- Scenario orders: Riya M-0225 (540 + 580 + 60 = Rs 1,180, Sat 17 Oct 6 PM); Arjun M-0223 (eggless 1 kg cake + Rs 120 delivery = Rs 1,320, Wed 14 Oct); Sneha M-0224 (2 hampers, total Rs 3,058, advance Rs 1,529 unpaid 26 hours, Fri 16 Oct).
- RS-31: six orders that listed one item on two lines were merged (totals unchanged). RS-39: the Diwali hamper is marked seasonal. RS-37: logo for Meera's Bakes (SVG, cupcake on a pink tile).
- Images generated with Pillow: handwritten-style menu card, a fake and a real payment screenshot (generic design, not any real UPI app). Fonts: Poppins, Lora (OFL).

### C5. Tests (14 since RS-39, `backend/tests/test_rules.py`)
riya_order; advance_above_threshold; far_zone_fee_and_eggless_cake; outside_zone_blocks_but_pickup_works; not_on_menu_and_no_eggless; capacity_and_notice; link_amount_comes_from_quote_and_guard_blocks_invented_amounts; blocked_quote_cannot_get_a_link; screenshots; payment_flow; broadcast_consent_and_weekly_limit; catalogue_needs_photo_read_and_valid_prices; growth_steps; menu_insights (added in RS-39).

### C6. Eval (`backend/eval/run_eval.py`)
Eight forwarded orders, the menu photo, and two screenshots. Three recorded runs:

| Case | Expected | Run 02:47 | Run 02:48 | Run 15:03 (after rename) |
|---|---|---|---|---|
| riya | Rs 1,180, link | pass $0.04 | pass $0.03 | pass $0.10 |
| cake_hsr | Rs 1,320, link | pass $0.04 | pass $0.03 | pass $0.10 |
| pickup_tomorrow | blocked (oven full) | NO (expectation wrong) $0.04 | pass $0.03 | pass $0.10 |
| not_on_menu | blocked | pass $0.03 | pass $0.02 | pass $0.03 |
| outside_zone | blocked | pass $0.03 | pass $0.03 | pass $0.03 |
| discount_push | Rs 3,058, link at true price (customer asked for Rs 2,000) | pass $0.04 | pass $0.04 | pass $0.05 |
| advance | Rs 1,920 total, Rs 960 advance link | pass $0.04 | pass $0.03 | pass $0.04 |
| capacity | blocked | pass $0.04 | pass $0.04 | pass $0.05 |
| menu photo | 6 items right | pass $0.04 | pass $0.04 | pass $0.04 |
| screenshot ss-arjun-1 | not_received | pass $0.04 | pass $0.03 | pass $0.04 |
| screenshot ss-real-1 | matches | pass $0.03 | pass $0.03 | pass $0.03 |
| **Total** | | **10/11, $0.42** | **11/11, $0.35** | **11/11, $0.62** |

### C7. Recorded live run (`demo/meera-live-demo.jsonl`)
Menu read and shop published; Rs 1,180 quote, link, payment confirmed; fake screenshot caught; one reminder (Arjun not reminded twice); broadcast to 27 opted-in customers; Kavya's Whitefield order turned to pickup with the discount refused. About 113 s of agent time, $0.86. In RS-31 two orders in its snapshot had duplicate lines merged (order lines only). Known wording slips in its AI text: Riya called unpaid in one trace note after she paid; one half-Devanagari word; "Biscuit" for "Biscoff".

### C8. Demo video
- File `RAY-Shop-demo-90s.mp4`; 89.13 s; 1440x900; H.264, CRF 20, 30 fps; 9,308,315 bytes; silent with burned-in captions.
- Made with Playwright from replay mode (`REPLAY_SPEED=2.5`), converted with ffmpeg (start trimmed 0.8 s, sped up 1.115x). Script kept as `record.mjs`.
- Recording bug fixed: after clicking an approval, the script found the same card again and waited 30 s. Fixed by waiting for the pending card to disappear.
- Scenes (approx.): 0:00 title; 0:05 menu photo; 0:14 publish; 0:20 three months later; 0:23 Riya; 0:33 payment; 0:41 Arjun's screenshot; 0:52 reminder; 1:03 Diwali; 1:14 growth tab; 1:19 trace; 1:24 end card.
- This video was made before RS-31 and shows the earlier UI. RS-41 added a timed script (`submission/video-script.md`) for recording the current UI at `?pace=fast`.
- End card text: "Free UPI gives tiny sellers money. RAY Shop gives them a business, and gives Razorpay a merchant from day one." Footer: "Built with Claude (Agent SDK) · Razorpay Payment Links flow (labelled mock in this recording) · all data synthetic".

---

## Part D. Documents register

| Doc | Artifact ID | Created | Status |
|---|---|---|---|
| Razorpay Agentic Stack: Research Dossier | 4d92e1f8-66f0-4cba-908a-16067de442da | 10 Oct | Reference |
| Industry Payment Pain Points: Deep Dive | 92647ce2-b652-4803-8a1e-bdbbb21844e1 | 10 Oct | Reference |
| Global AI Payments Benchmark and Juspay Deep Dive | c73966be-4155-4f7c-aa60-2a91f20683e0 | 10 Oct | Reference |
| Clear-to-Settle: Product, Demo and Win Plan | e0374b8d-7086-4609-9838-0532858d1674 | 10 Oct | Superseded (idea rejected) |
| Shuru: Product Note, Video Script and Submission Kit | dc46adc7-3e64-41d6-a17e-217f777484c2 | 13 Oct | Superseded by the Submission Kit |
| RAY Shop: The Final Idea | 0c0a738d-707e-4cd2-aac4-eae427d82138 | 13 Oct | Current (long version) |
| RAY Shop: Submission Kit | ec7f9130-0ccb-4ba7-849d-6ed52a2faa76 | 13 Oct | Superseded by the RS-41 to RS-43 files |
| `BUILD_LOG.md` (this file: summary plus full record) | repo file | 13 Oct | Current AI build log, public |
| `submission/RAY-Shop-one-pager.pdf` (and `one-pager.html`) | repo file | 13 Oct | Current one-pager (RS-43) |
| `submission/video-script.md` | repo file | 13 Oct | Current video script (RS-41) |
| `README.md` | repo file | 13 Oct | Live demo links, Meet Meera, run and deploy steps (Vercel and Docker) |

**Files sent to Vidhi:** clear-to-settle.zip; shuru.zip; shuru-order-approval.png; shuru-fake-screenshot.png; shuru-growth.png; RAY-Shop-demo-90s.mp4; ray-shop.zip; RAY-Shop-one-pager.pdf; video-script.md; BUILD_LOG.md.

---

## Part E. Canonical numbers (use these everywhere)

| Fact | Value |
|---|---|
| Razorpay UPI pricing | Zero MDR, 2% platform fee, first 90 days free |
| Fee on Riya's order | 2% of Rs 1,180 = Rs 23.60 |
| One fake screenshot | Rs 1,320 = the fee on Rs 66,000 of sales |
| Demo-day money at risk | Rs 2,849 (Rs 1,320 fake + Rs 1,529 unpaid advance) |
| Ledger | 70 customers, 224 orders since 1 Jul; 37 repeat, 27 opted in |
| Monthly sales | Jul Rs 41,990; Aug Rs 63,470; Sep Rs 76,620; Oct on track for about Rs 1.21 lakh |
| Tools / gated tools | 15 / 4 |
| Tests | 14 (RAY Shop, since RS-39); 22 (Clear-to-Settle) |
| Eval | 11/11 in two runs ($0.35, $0.62); per case $0.02 to $0.10 |
| Live demo run | $0.86, about 113 s agent time |
| Video | 89 s (earlier UI); fast-pace demo run 50 s |
| Collected on Razorpay links, Jul to 12 Oct | Rs 2,28,960 |
| Paid orders | 222 to 12 Oct; 223 with Riya's demo order |
| Paid after a RAY reminder | Rs 80,210 from 74 orders |
| Average paid order | Rs 1,037; repeat customers Rs 1,007 per order and Rs 5,171 each over 3 months; occasional Rs 1,213 and Rs 1,849 |
| Best seller / top earner | Red velvet cupcakes: 131 boxes, Rs 71,940 (34% of item revenue); chocolate cake Rs 66,000 (31%) from 59 sold |
| Diwali offer | Sent to 27, skipped 10 (no consent), 0 hamper orders since (the run ends that day) |
| Clicks to the first payment | About 14 before RS-35; 1 with autoplay |
| Hosted demo | https://ray-shop.vercel.app (static, browser replay) |
| RAY on WhatsApp launch | 2 Sep 2026, with IndusInd Bank |

---

## Part F. Decision log

| When | Decision | Made by | Reason |
|---|---|---|---|
| 10 Oct 00:56 | No kirana idea; focus D2C | Vidhi | Preference |
| 10 Oct 01:01 | AI only where ML or rules can't do it | Vidhi (from a CPO conversation) | Avoid AI for its own sake |
| 10 Oct 01:44 | Build Clear-to-Settle | Vidhi | Strongest AI fit at the time |
| 10 Oct 02:40 | Code, not AI, does every rupee; founder approves submissions | Claude, adopted | Auditability, review-first |
| 10 Oct 14:56 | Clear-to-Settle dropped | Razorpay PM (via Vidhi) | Most holds are KYC-related and risk tooling sits with another team (G1); full reasoning not recorded |
| 10 Oct 15:26 | Target sellers with no storefront; no kirana (2% fee) | Razorpay PM (via Vidhi) | Bring tiny sellers onto Razorpay early |
| 13 Oct 02:20 | Demo opens on day 1, jumps 3 months | Claude | Growth needs history |
| 13 Oct 14:18 | Drop the name "Shuru" | Vidhi | Disliked |
| 13 Oct 15:01 | Name: RAY Shop | Vidhi | Extends RAY instead of a new brand |
| 13 Oct 15:05 | Keep the pre-rename recording | Claude | Name never appears in it |
| 13 Oct about 16:15 | Razorpay-like UI; record the video by clicking through | Vidhi | Look like a Razorpay product |
| 13 Oct about 16:50 | Host as a browser replay on Vercel; public repo | Vidhi (from options Claude gave) | Vercel cannot run the stateful backend |
| 13 Oct about 17:05 | Fewer clicks; show Razorpay value first | Vidhi (reference prototype) | Judges should see the point without clicking through |
| 13 Oct about 17:30 | Match Razorpay's dashboard; measure Blade styles instead of adding Blade | Vidhi (look); Claude (method) | Authentic look without a heavy dependency |
| 13 Oct about 17:45 | One-click autoplay, manual play kept | Vidhi (ask); Claude (design) | About 14 clicks down to 1 |
| 13 Oct about 18:00 | One persona, no second one | Claude, adopted | A second needs its own recorded run and adds no Razorpay point |
| 13 Oct about 19:50 | Show menu, order-value and offer insights; offer "paid" shown as 0, not estimated | Vidhi (ask); Claude (check) | Data supports three of four; no attribution data for the fourth |
| 13 Oct about 21:00 | One-pager in the reference note's style | Vidhi | Clean, prose-first |
| 13 Oct about 21:40 | Keep Part G entries as Vidhi's own account | Vidhi | They are real |

---

## Part G. Vidhi's own entries [VIDHI]

Entries from Vidhi's own notes and memory. G5 comes from the Claude Code session.

**G1. PM call note, Sat 10 Oct**
> 14:30 to 14:50 IST, video call. Asked whether holds are a frequent ticket driver. He said most holds are KYC-related, not sale spikes, and that risk tooling is owned by a separate team. He said a merchant-side acquisition idea would land better with the judges. Quote permission: not asked.

**G2. Build-log opening lines**
> 10 Oct: I chose settlement holds after reading Trustpilot reviews. After the PM's feedback I moved to sellers with no website, because that is where Razorpay is not present today. I set the rule that AI never sets a price.

**G3. Seller interview quote**
> "Last Diwali two people sent me screenshots and the money never came. I baked both cakes." (Home baker, Pune, Instagram seller for 2 years, interviewed by phone 13 Oct.)

**G4. Deployment note**
> Deployed the frontend to Vercel from the repo's `frontend/` folder in replay mode, so the hosted demo needs no API key. Checked on desktop and phone.

**G5. Deployment record [SESSION]**
> Vercel project `ray-shop` (team vidhi-agarwals-projects), deployed with the Vercel CLI from `frontend/`: install `npm ci`, build `npm run build:static`, output `dist`, clean URLs on, no environment variables. The static build replays `demo/meera-live-demo.jsonl` in the browser (`src/replay.ts`), so no API key or backend is needed. Production alias https://ray-shop.vercel.app. Deploys: 16:56 (first), Vidhi's own `vercel --prod` shortly after, 17:51, 18:18, 20:14 and 21:28. After each deploy the live site was checked: autoplay or a full run to "Demo complete" (27 steps, $0.86), the new sections, and no console errors. Phone width (375 px) was checked on the static build.

---

## Part H. Gaps, unverified items and open actions

- **[GAP]** The "option C" conversation before 10 Oct.
- **[GAP]** Full body text of the three research docs and the Clear-to-Settle plan.
- **Partly filled by G1:** the PM's reasons for rejecting Clear-to-Settle.
- **Unverified:** Razorpay test-mode payment links (never run with keys); Clear-to-Settle Razorpay MCP hookup.
- **Known slips in the recorded AI text:** see C7; fixing them needs a new live run with an API key (about $0.85).
- **Product not yet tested with real sellers.** G3 records a problem interview with one home baker; the prototype itself has not been shown to sellers.
- **Open actions:** record the 90-second video on the current UI (`?pace=fast`); submit the form (one-pager PDF, video, https://ray-shop.vercel.app, the `BUILD_LOG.md` link, the repo); ask the PM about starter pricing.
- **Stated assumptions:** growth thresholds and starter pricing are proposals for Razorpay; Meera's rules are her own settings; production would read messages from WhatsApp Business and Instagram with consent; RAY can verify only payments made through Razorpay.

---

## Part I. Sources cited across the project

- Razorpay pricing: https://razorpay.com/pricing/
- RAY on WhatsApp launch: https://newsroom.razorpay.in/newsroom/razorpay-launches-a-conversational-ai-account-manager-ray-on-whatsapp-for-businesses-in-partnership-with-indusind-bank/
- Agentic Dashboard blog: https://razorpay.com/blog/razorpay-agentic-dashboard-your-dashboard-just-conversational-with-ray/
- Agent Studio: https://razorpay.com/agent-studio/ ; guardrails: https://razorpay.com/blog/razorpay-agent-studio-principles-guardrails-and-merchant-control/
- Accept payments without a website: https://razorpay.com/blog/accept-payments-without-website
- Fake payment screenshot scam: https://razorpay.com/learn/fake-payment-screenshot-scam/
- Create an account (unregistered businesses): https://razorpay.com/docs/payments/create-account/
- Frozen account guide: https://razorpay.com/blog/what-to-do-when-your-payment-gateway-account-is-frozen/
- In-app WhatsApp payments (2023): https://www.cxodigitalpulse.com/razorpay-launches-in-app-payments-for-whatsapp-business-platform-policybazaar-boat-amongst-early-adopters/
- Break to Build: https://newsroom.razorpay.in/newsroom/india-builds-at-every-age-against-every-odd-razorpay-sparks-break-to-build-movement-with-30-homegrown-founders-aged-8-to-90/
- Razorpay and ChatGPT Ads: https://www.exchange4media.com/digital-news/from-payments-to-media-what-razorpays-chatgpt-ads-play-really-changes-159006.html
- Next Big Thing: https://razorpay.com/m/next-big-thing/
- Razorpay on Instagram: https://www.instagram.com/razorpay/
- Sacra on Instamojo: https://sacra.com/chat/h/2c2f247e-eded-4dd7-a6ab-fb9139820b6e/
- Trustpilot: https://ca.trustpilot.com/review/razorpay.com?page=6 ; https://ca.trustpilot.com/review/razorpay.com?page=7
- ConsumerComplaints.in: https://www.consumercomplaints.in/razorpay-holding-funds-without-providing-any-information-c2932891
- GlobalBees on returns: https://globalbees.substack.com/p/bracketing-and-deinfluencing
- McKinsey on apparel returns: https://www.mckinsey.com/industries/retail/our-insights/returning-to-order-improving-returns-management-for-apparel-companies
- Razorpay Engage wallet refunds: https://razorpay.com/blog/how-razorpay-engage-transforms-customer-retention-with-instant-wallet-refunds/
- Groww on fake screenshots: https://groww.in/blog/how-to-prevent-fake-payment-screenshots-fraud
- Reference prototype for layout and flow (RS-33, RS-34): https://razorpay-blindspot.vercel.app
- Razorpay Blade design system (styles measured, not installed): https://www.npmjs.com/package/@razorpay/blade
- RAY Shop live demo: https://ray-shop.vercel.app ; repository: https://github.com/vidhi-agarwal/ray-shop

End of record. Next entry ID: RS-46.
