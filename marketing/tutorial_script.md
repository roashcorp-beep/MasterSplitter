# Master Splitter — Tutorial / Onboarding Video Script (3–5 min)

**Goal:** a calm, confident walkthrough that turns a new user into a power user.
**Runtime target:** 4:10. **Voice:** friendly, unhurried, second-person.
**Music:** low-key lofi / ambient bed at −18dB (Epidemic "Calm corporate / lofi").
**Demo source:** `seed_demo_data.py` (Albania 2026, Tokyo 2025, Apartment 4B, יציאות).
**Format:** 16:9 1080p screen capture with a soft device frame; captions on.

> Convention below: **[SCREEN]** = what's on screen + action; **VO** = narration;
> **TEXT** = on-screen overlay/callout.

---

## 0:00 — Intro (0:00–0:20)
**[SCREEN]** Logo, then the Lobby with several populated group cards.
**VO:** "Welcome to Master Splitter — the easiest way to split expenses with friends,
across any currency. In four minutes you'll go from zero to settling up like a pro."
**TEXT:** *Master Splitter — full walkthrough*

## 1 — Sign in (0:20–0:40)
**[SCREEN]** Login → "Continue with Google" (or email).
**VO:** "Sign in with Google in one tap, or use email. Your groups sync everywhere,
and you can install it to your home screen like a native app."
**TEXT (callout):** *Tip: ⋯ menu → Add to Home Screen*

## 2 — Create a group (0:40–1:05)
**[SCREEN]** Lobby → **+ New group** → name "Barcelona 2026", base currency **EUR**,
add friends (by name/contact), Save.
**VO:** "Create a group for any trip or shared cost. Give it a base currency — say,
euros — and add your friends. Don't worry, you can mix currencies inside it."
**TEXT:** *Base currency = how the group totals are shown*

## 3 — Add an expense (1:05–1:50)
**[SCREEN]** **Add** tab → amount **480**, currency picker → **EUR**, category
*Lodging*, "Who paid" = you, "For whom" = everyone, Save.
**VO:** "Adding an expense is fast. Type the amount, pick the currency, choose a
category, who paid, and who it's split between. Equal by default."
**[SCREEN]** Add a second expense in a *different* currency (USD) to show conversion.
**VO:** "Enter it in dollars and Master Splitter converts it to the group's base
currency automatically, using live rates."

## 4 — Shared payment & custom splits (1:50–2:25)
**[SCREEN]** New expense → toggle **שיתוף תשלום / Shared payment** → enter how much
each person paid (Moran 8,400 / you 4,000). Then show the **Custom amounts** toggle
(equal / exact / by items).
**VO:** "Two people split the bill at the register? Turn on Shared Payment and record
exactly what each person put in — Master Splitter figures out the net. Need an uneven
split? Switch to custom amounts or split by items."

## 5 — Receipt scan (2:25–2:55)
**[SCREEN]** Add → receipt scan → pick a photo → line items parse → tap names per item
→ "Assign".
**VO:** "Got a messy restaurant bill? Snap the receipt. Our AI reads the line items,
you tap who had what, and the split builds itself."
**TEXT:** *AI receipt scanning*

## 6 — Balances & the three views (2:55–3:30)
**[SCREEN]** **Balances** → expand a person → tap through **By currency → Group
currency → My currency**.
**VO:** "Here's the magic. Balances shows exactly who owes whom. View it by the
currency each expense was paid in, netted in the group's currency, or converted to
*your* currency. Same truth, three lenses."

## 7 — Settle up (full, partial, smart) (3:30–3:55)
**[SCREEN]** Tap **Settle up** → confirm full → expense drops below the ✓ divider →
confetti. Then show **Partial** (pay 50 of 100). Then the **Smart settle-up** (limbo)
suggesting minimum transfers.
**VO:** "Settle a debt in full, or pay part of it now. Or let Master Splitter compute
the *fewest* transfers to clear the whole group at once. Paid expenses move neatly
below the settled line."

## 8 — Dashboard, group settings, profile (3:55–4:10)
**[SCREEN]** Dashboard (Mine/Group, category bars) → Group details (privacy toggles)
→ Profile (language, currency, notifications on).
**VO:** "The dashboard breaks down spending by category and member. In group settings
you control who sees what. And in your profile, set your language, currency, and turn
on push notifications so you never miss an expense. That's Master Splitter — split
smarter."
**TEXT:** *Master Splitter — Split smarter.*

---

## Production checklist
- [ ] Run `seed_demo_data.py` first so every screen is populated.
- [ ] Record at 60fps, slow cursor, 600–900ms dwell on each tap.
- [ ] Keep each section under its time budget; trim dead air.
- [ ] Add chapter markers (YouTube): 0:20 Sign in · 0:40 Create group · 1:05 Add
      expense · 1:50 Shared payment · 2:25 Receipt scan · 2:55 Balances · 3:30 Settle
      up · 3:55 Dashboard.
- [ ] Export a 9:16 cut of sections 3, 6, 7 for Shorts/Reels/TikTok.
