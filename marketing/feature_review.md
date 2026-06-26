# Master Splitter — Feature Map & User Journeys

> Source of truth for the marketing scripts, storyboard and demo automation.
> Compiled from the live codebase (`Server.py`, `Static/js/main.js`, `Templates/`,
> `Static/js/components/GroupsScreen.jsx`).

## 1. What it is
**Master Splitter** is a multi-currency, mobile-first PWA for splitting shared
expenses — trips, shared apartments, nights out. It's installable, works in Hebrew
(RTL) and English (and more), and is built around *pairwise-direct* debts ("who owes
whom" maps 1:1 to the actual expenses), so settling up always feels honest.

- **Stack:** Flask + SQLite backend; vanilla-JS SPA with a React island for the
  groups lobby/profile; Service Worker PWA; Web Push (VAPID).
- **Auth:** email/password + Google OAuth.
- **Live FX:** open.er-api.com with caching; every amount can be entered in its own
  currency and viewed in the group base or your personal currency.

## 2. Core screens
| Screen | Purpose | Showcase value |
|--------|---------|----------------|
| **Login** | Email/password + "Continue with Google" | Clean glassmorphism, animated starfield |
| **Lobby (My Groups)** | Cards for each trip/group, create/edit | Premium cards, avatars, quick entry |
| **Home** | Personal summary: who owes me / I owe, my-vs-group stats, latest expense, dashboard button | The "at a glance" hook |
| **Add Expense** | Amount, currency picker, who paid, shared-payment (multi-payer), for-whom, custom splits / items, receipt scan | The product's depth in one screen |
| **Expenses** | Full feed; settled expenses drop below a permanent "✓ settled" divider | Satisfying state change |
| **Balances / Summaries** | 3 views — *By currency*, *Group currency*, *My currency*; per-debt settle + partial; smart "settle up" (min transactions) | The money shot |
| **Dashboard** | Mine/Group toggle, stat cards, spending-by-category bars, member balances, who-owes-whom | Data-viz wow moment |
| **Group Details** | Edit name/budget/currency/members + permission toggles | Control & trust |
| **Profile** | Avatar, language, currency, notifications, password | Polish |

## 3. Feature inventory (every feature, grouped)

### Expenses
- Multi-currency entry with a searchable currency picker; live conversion to the
  group's base currency.
- **Who paid** selector (any member, not just you).
- **Shared payment (multi-payer / contributions):** record how much *each* person
  actually paid for one expense (e.g. a ₪300 dinner where Avi put in ₪200 and you
  ₪100 → you owe Avi ₪50). Shown per-row as "paid X · owes Y".
- **Custom splits:** equal, exact amounts, or by ratio/items.
- **Receipt scan (AI):** upload a receipt → Gemini parses line items → assign items
  to people → auto-builds the split.
- **Categories:** food / lodging / transport / attractions / general (with emoji).
- Edit & delete with admin/permission gating.

### Settlements (the differentiator)
- Settle a debt in full (confirmation modal) or **partial repayment** (editable amount).
- Settling from the summaries screen **FIFO-allocates** the payment across the
  debtor's oldest expenses with that creditor — so each settled expense links to the
  real expense, drops below the "settled" divider, and is removed if that expense is
  deleted.
- **Smart "Settle Up" (limbo):** computes the minimum set of transfers to clear the
  whole group.
- Correct across mixed currencies: balances net in the group **base currency** (the
  authoritative ledger) and only the final figure is converted for display.

### Balances — three views
- **By currency:** debts broken down by the currency each expense was *paid* in.
- **Group currency:** one net debt in the group's base currency.
- **My currency:** the same net, converted to *your* preferred currency.

### Dashboard
- **Mine / Group** toggle. Stat cards (my share, I paid, my balance / total, count,
  members). Spending-by-category bars. Per-member balances. Who-owes-whom list.

### Groups & permissions
- Create groups with a base currency and optional budget (daily/monthly/yearly).
- Admin/owner roles. Toggles: *show everyone's expenses*, *show everyone's
  settlements* (otherwise each member sees only debts that involve them), *allow
  members to delete expenses*.
- Invite by link/token; guests (unregistered participants).

### Platform
- **PWA:** installable, offline-capable shell, app icon.
- **Web Push notifications** (VAPID) for new expenses, honoring per-user toggles.
- **i18n:** Hebrew (RTL) + English + more; instant language switch.
- **Activity feed** of group events; **budget card** with spend-vs-budget ring and a
  category chart.

## 4. User journeys

### Primary (new user → first settle)
1. Sign up / Continue with Google.
2. Create a group ("Albania 2026"), pick base currency, add friends.
3. Add an expense in a foreign currency; pick who paid; (optional) shared payment.
4. Open **Balances** → see "Avi owes you ₪X". Tap **Settle up** → confirm.
5. Watch the expense drop below the **✓ settled** divider. 🎉 confetti.

### Secondary flows
- Scan a restaurant receipt → assign items → split unevenly.
- Switch Balances between *By currency* / *Group currency* / *My currency*.
- Open the **Dashboard** → flip Mine/Group → category bars.
- Group Details → flip "show everyone's settlements" off → privacy.

### Edge cases worth showing (they impress)
- A **base-ALL trip with ILS + USD + EUR receipts** that still nets to one clean debt.
- **Partial settlement** (pay ₪50 now of a ₪100 debt).
- **Multi-payer** dinner.
- A **fully-settled** group → "🎉 All settled!".

### Best showcase scenario (use for the promo)
The **Albania 2026** trip from the seed data: 4 friends, EUR/USD/ALL expenses, a
multi-payer dinner, one partial settlement — rich balances, a populated dashboard,
and a clean "settle up" payoff.

## 5. Small, safe UI/UX polish already shipped this cycle
- Permanent "✓ settled" divider (open above, settled below).
- Three clearly-labelled balance views.
- Per-user settlement privacy + admin toggle.
- Bottom-nav re-asserted on tab change (was occasionally hidden after back-nav).
- Hamburger "Group details" now reliably opens the edit modal.
