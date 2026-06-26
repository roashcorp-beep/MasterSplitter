# Master Splitter — Investor / Startup Review

*Written as an early-stage consumer-fintech investor doing a product teardown.*
*Category: shared-expense / "Splitwise-style" apps. Verdict: strong product wedge,
credible execution, clear paths to monetization — needs distribution and trust signals.*

---

## TL;DR
Master Splitter is a polished, genuinely multi-currency expense splitter with two
features most competitors do poorly: **correct mixed-currency settlement** and
**per-expense settle-linking** (settling actually maps to the real expenses). It's a
PWA with push, AI receipt scanning, and a clean RTL-first design. The bones of a
fundable consumer app are here. The gap is go-to-market, social/viral loops, and
trust/scale hardening — not the core product.

## Strengths
1. **Multi-currency done right.** Net debts compute in the group base currency (the
   authoritative ledger) and only display-convert at the end. Settlements clear debts
   even when expenses were entered in different currencies — a real, verifiable
   differentiator (most clones break here).
2. **Settlement integrity.** FIFO allocation links a settle-up to specific expenses;
   paid items drop below a "settled" divider and un-link if the expense is deleted.
   This makes the ledger *feel honest*, which is the entire trust proposition.
3. **Depth without clutter.** Multi-payer ("shared payment"), custom/itemized splits,
   AI receipt scan, budgets, categories, three balance lenses, a dashboard — yet the
   add-expense flow stays approachable.
4. **Mobile-native feel.** Installable PWA, Web Push, glassmorphism, confetti payoff,
   RTL Hebrew + English. Looks premium on a phone.
5. **Low infra cost.** Flask + SQLite + a PWA ships cheaply; good for runway.

## Weaknesses / risks
1. **SQLite single-file DB** caps concurrency and complicates backups/scale. Fine for
   now; a migration path to Postgres should be on the roadmap before real growth.
2. **No social/viral loop yet.** Inviting friends exists, but there's no "settle
   reminder" share, no payment-app handoff (Bit/PayBox/Venmo), no group recap to
   share. These are the growth engine for this category.
3. **Trust signals thin.** No visible privacy policy/security copy, no "your data is
   yours" messaging, no 2FA surfaced. Money-adjacent apps need this front-and-center.
4. **Onboarding cold-start.** A brand-new user sees empty screens until they add data;
   no sample group / guided first-expense.
5. **Single-region FX dependency** (one free FX API) — needs a fallback + caching SLA.
6. **Discoverability:** as a PWA it isn't in app stores by default; needs a wrapper
   (Capacitor/TWA) for App Store/Play presence.

## UX improvements (highest ROI first)
- **Guided first-run:** auto-create a demo group + a sample expense, with a 3-step
  coachmark to the first settle. (Kills cold-start; great for activation metrics.)
- **One-tap "remind to pay":** generate a shareable message ("You owe me ₪50 from
  Albania 🇦🇱 — pay here") with a deep link.
- **Payment handoff:** "Settle with Bit / PayBox / Venmo / PayPal" buttons next to a
  debt (record the settlement after handoff).
- **Empty-state art** everywhere instead of "no data".
- **Settle confirmation haptics + sound** to amplify the dopamine moment.
- **Persist the chosen balance view** per group; default to "My currency" for solo
  travelers.

## Missing features (would round out the product)
- Recurring expenses (rent/utilities) — the seeded "Apartment 4B" group begs for it.
- Export to CSV/PDF trip report (and a beautiful shareable "trip recap").
- In-app comments/notes & receipt thumbnails on each expense.
- Debt simplification *across* groups (one person, many trips).
- Apple/Google Sign-In parity + 2FA.
- Spending insights ("you spent 38% on food this trip").

## Ideas that could make it go viral
1. **Shareable Trip Recap card** ("Albania 2026: 4 friends · €1,240 · most generous:
   Moran 💜") — auto-generated, gorgeous, one-tap to Stories. Built-in acquisition.
2. **"Who's the group's piggy bank?"** playful end-of-trip stat that people screenshot.
3. **Group leaderboard / fairness score** — light gamification of settling fast.
4. **Travel-creator angle:** partner with travel influencers; the multi-currency story
   is tailor-made for "5 countries, 1 bill" content.
5. **WhatsApp-first invites & reminders** (huge in IL/EU markets, where RTL already
   gives an edge).

## Premium features worth charging for (freemium model)
- **Unlimited groups + history** (free tier caps groups/months).
- **AI receipt scanning beyond N/month** (real marginal cost → natural paywall).
- **Trip recap PDF/CSV export & shareable cards.**
- **Cross-group debt simplification & insights/analytics.**
- **Custom categories, group themes, no-ads.**
- **Family/Org plan** for shared apartments & teams.
Pricing intuition: free → ~₪15–20/mo "Pro" (or ₪120/yr); the receipt-scan + recap
combo is the most compelling upgrade trigger.

## App Store / Google Play screenshot guidance
1. **Lead with the payoff, not the form.** Screenshot 1 = Balances with a clear "Avi
   owes you ₪X" + a big "Settle up" — the value, in one glance.
2. **Caption every shot** with a benefit headline above the device frame
   ("Any currency. One clean balance.").
3. **Show the differentiators:** (a) 3 currency views, (b) AI receipt scan, (c)
   multi-payer, (d) dashboard charts, (e) the settled-divider moment.
4. **Use the seeded data** (real numbers, real currencies) — never empty states.
5. **Consistent device frame + dark theme + purple accent**; localized sets for he/en.
6. **First 2 screenshots do 80% of the work** — A/B test "problem-framed" vs
   "payoff-framed" first frame.
7. Add a **15-second App Preview video** (the promo's 9:16 cut).

## Bottom line
Product risk: **low** (it works, and works on the hard parts). Market risk:
**medium** (crowded, but the multi-currency + RTL + AI angle is a real wedge).
Execution next: **activation + virality + trust**, then a thin native wrapper for the
stores. Worth a closer look.
