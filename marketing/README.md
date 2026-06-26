# Master Splitter — Marketing & Onboarding Kit

Everything needed to produce professional marketing and tutorial videos, store
listings, and an investor-grade product review. Built from the live codebase and a
realistic, production-safe demo dataset.

## Contents
| File | Phase | What it is |
|------|-------|------------|
| `feature_review.md` | 1–2 | Full feature map, user journeys, best showcase scenarios |
| `seed_demo_data.py` | 3–4 | Builds a rich, multi-currency **demo DB** (never touches production) |
| `promo_script.md` | 5 | 52s promo: shot list, camera, timing, overlays, VO (he/en), music |
| `tutorial_script.md` | 5 | ~4:10 onboarding walkthrough with chapters |
| `storyboard.md` | 5 | Scene-by-scene visual board + beat sheet |
| `record_demo.ts` | 6–7 | Playwright automation: walkthrough + screenshot capture |
| `screenshots/` | 7 | Auto-generated, premium screenshots (+ how-to) |
| `startup_review.md` | 8 | Investor teardown: strengths, gaps, virality, pricing, ASO |

## Quick start (one trip from zero to a recorded demo)
```bash
# 1) Demo data (fictional; safe — writes to marketing/demo_env/, not production)
python marketing/seed_demo_data.py

# 2) Serve the app against the demo DB
cd marketing/demo_env && python ../../Server.py     # http://127.0.0.1:5000

# 3) Capture screenshots + (optional) video
npm i -D playwright && npx playwright install chromium
RECORD_VIDEO=1 npx ts-node marketing/record_demo.ts
```
Demo login: **nufar@demo.app** / **demo1234**

## Demo dataset (what the seeder creates)
- **6 friends** (Hebrew + English names).
- **4 groups:** אלבניה 2026 🇦🇱 (base ALL, EUR/USD/ALL), טוקיו 2025 🇯🇵 (base JPY),
  דירה 4ב' 🏠 (base ILS, monthly budget), יציאות 🍷 (restaurants).
- **28 expenses** across food/lodging/transport/attractions/general.
- **Multi-payer** dinners, **partial** & full **settlements**, open balances.
- Five currencies so every balance view and chart is populated.

## Honesty notes (so you can trust the kit)
- The seeder uses **deterministic demo FX rates** so amounts are stable across runs.
- Screenshots/video are produced by `record_demo.ts` against the **demo DB** —
  there are no faked images, no Lorem Ipsum, and **production data is never used**.
- This environment has no Node/Playwright runtime, so the video/screenshots are
  produced by **running `record_demo.ts` on your machine** (steps above). The script
  is written against the app's real routes and element IDs and is built to be rerun
  after future updates.

## Re-running after product changes
- Re-run `seed_demo_data.py` to refresh demo data.
- Re-run `record_demo.ts` to regenerate all screenshots/video.
- `record_demo.ts` degrades gracefully if a selector moves (it logs and continues),
  so it keeps working as the UI evolves.
