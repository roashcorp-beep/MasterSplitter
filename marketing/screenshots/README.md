# Screenshots

These are generated automatically — **no manual editing, no placeholders**. They are
captured from the app running against the **demo database** (fictional data), so they
look like a product used for months without exposing any real user data.

## Generate them
```bash
# 1. Build the production-safe demo DB (fictional friends/trips/expenses)
python ../seed_demo_data.py

# 2. Serve the app against the demo DB (NOT your real master_splitter.db)
cd demo_env && python ../../Server.py        # http://127.0.0.1:5000
#   (run this in a second terminal; leave it running)

# 3. From the repo root, run the capture automation
npm i -D playwright && npx playwright install chromium
npx ts-node marketing/record_demo.ts
```

## Files produced
| File | Screen |
|------|--------|
| `01_login.png` | Login (Google + email, starfield) |
| `02_home.png` | Home — personal summary (owed/owing, my-vs-group, latest expense) |
| `03_dashboard.png` / `03b_dashboard_group.png` | Dashboard — category bars, member balances |
| `03_add_expense.png` / `03b_add_shared_payment.png` | Add Expense + multi-payer |
| `04_receipt_scan.png` | AI receipt scanning |
| `05_group_details.png` | Group details / permissions |
| `06_balances_by_currency.png` | Balances — *By currency* |
| `06b_balances_group_currency.png` | Balances — *Group currency* |
| `06c_balances_my_currency.png` | Balances — *My currency* |
| `07_profile.png` | Profile |
| `08_settings_notifications.png` | Notification settings |

## Store-listing tip
For App Store / Google Play, drop each PNG into a captioned device-frame template
(headline above the frame). See `../startup_review.md` → "App Store / Google Play
screenshot guidance". Lead with `06_*` (the payoff), not `03_add_expense`.
