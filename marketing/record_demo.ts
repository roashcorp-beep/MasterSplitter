/**
 * Master Splitter — automated demo walkthrough & screenshots   (Phase 6 & 7)
 * ==========================================================================
 * Drives the running app through every important feature with smooth, human-like
 * pacing and captures premium screenshots. Re-runnable after future updates.
 *
 * PREREQUISITES
 *   1) Seed the demo DB (production-safe — see seed_demo_data.py):
 *        python marketing/seed_demo_data.py
 *   2) Serve the app against that demo DB (so production data is never used):
 *        cd marketing/demo_env && python ../../Server.py        # http://127.0.0.1:5000
 *   3) Install Playwright once:
 *        npm i -D playwright @playwright/test ts-node typescript
 *        npx playwright install chromium
 *
 * RUN
 *        npx playwright test marketing/record_demo.ts            # or: npx ts-node marketing/record_demo.ts
 *
 * OUTPUT
 *   - marketing/screenshots/*.png          (Phase 7)
 *   - marketing/screenshots/demo_walkthrough.webm  (full video, if RECORD_VIDEO=1)
 *
 * Demo login (seeded): nufar@demo.app / demo1234
 */
import { chromium, devices, Browser, Page, BrowserContext } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5000';
const SHOTS_DIR = path.join(__dirname, 'screenshots');
const RECORD_VIDEO = process.env.RECORD_VIDEO === '1';
const CREDS = { username: 'nufar@demo.app', password: 'demo1234' };

fs.mkdirSync(SHOTS_DIR, { recursive: true });

// ---- Human-like helpers (avoid robotic, perfectly-timed motion) ----
const rnd = (min: number, max: number) => Math.floor(min + Math.random() * (max - min));
const pause = (min = 600, max = 1100) => new Promise(r => setTimeout(r, rnd(min, max)));

async function smoothScroll(page: Page, dy: number, steps = 14) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await page.waitForTimeout(rnd(28, 60));
  }
}

async function tap(page: Page, selector: string, settle = true) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 8000 });
  await el.scrollIntoViewIfNeeded();
  await pause(450, 800);          // dwell before tapping (reads natural)
  await el.click();
  if (settle) await pause(800, 1300);
}

async function shot(page: Page, name: string) {
  await pause(500, 800);
  await page.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`) });
  console.log('  📸', name);
}

async function login(context: BrowserContext) {
  // Establish the session via the API (robust to UI/login-form changes).
  const res = await context.request.post(`${BASE_URL}/api/login`, { data: CREDS });
  if (!res.ok()) throw new Error(`Login failed (${res.status()}). Did you seed the demo DB and start the app from marketing/demo_env?`);
  console.log('  ✓ logged in as', CREDS.username);
}

/** Click a bottom-nav tab if present; tolerant of label/id changes. */
async function goTab(page: Page, id: string, fallbackText?: string) {
  const byId = page.locator(`#${id}`);
  if (await byId.count()) { await tap(page, `#${id}`); return; }
  if (fallbackText) { await tap(page, `text=${fallbackText}`); }
}

(async () => {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 13 Pro'],          // realistic mobile frame for the captures
    locale: 'he-IL',
    colorScheme: 'dark',
    recordVideo: RECORD_VIDEO ? { dir: SHOTS_DIR, size: { width: 390, height: 844 } } : undefined,
  });
  const page = await context.newPage();

  try {
    // ---- 1) Login screen (logged-out) ----
    console.log('Scene: Login');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await pause(900, 1400);
    await shot(page, '01_login');

    // ---- Authenticate, open the app ----
    await login(context);
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
    await pause(1200, 1800);

    // ---- 2) Home / personal summary ----
    console.log('Scene: Home');
    await goTab(page, 'tab-home', 'בית');
    await pause(1000, 1500);
    await shot(page, '02_home');
    await smoothScroll(page, 250);
    await pause();

    // ---- 3) Dashboard (charts) ----
    console.log('Scene: Dashboard');
    if (await page.locator('.home-dashboard-btn').count()) {
      await tap(page, '.home-dashboard-btn');
    } else {
      await page.goto(`${BASE_URL}/app#dashboard`, { waitUntil: 'networkidle' });
    }
    await pause(1100, 1600);
    await shot(page, '03_dashboard');
    if (await page.locator('#dash-view-group').count()) { await tap(page, '#dash-view-group'); await shot(page, '03b_dashboard_group'); }

    // ---- 4) Balances — the three views ----
    console.log('Scene: Balances');
    await goTab(page, 'tab-balances', 'סיכומים');
    await pause(1000, 1500);
    // expand the first person's accordion for a richer shot
    const firstBal = page.locator('.balance-item').first();
    if (await firstBal.count()) { await firstBal.click(); await pause(700, 1000); }
    await shot(page, '06_balances_by_currency');
    if (await page.locator('#btn-view-group').count())     { await tap(page, '#btn-view-group');     await shot(page, '06b_balances_group_currency'); }
    if (await page.locator('#btn-view-converted').count()) { await tap(page, '#btn-view-converted'); await shot(page, '06c_balances_my_currency'); }

    // ---- 5) Add Expense ----
    console.log('Scene: Add Expense');
    await goTab(page, 'tab-add', '+');
    await pause(1000, 1500);
    // fill a value to avoid an empty form in the capture
    const amount = page.locator('#amount, input[type="number"]').first();
    if (await amount.count()) { await amount.click(); await amount.type('12400', { delay: 90 }); await pause(); }
    await shot(page, '03_add_expense');
    // reveal the shared-payment (multi-payer) toggle
    if (await page.locator('#contribs-mode-toggle').count()) {
      await page.locator('label:has(#contribs-mode-toggle)').first().click().catch(() => {});
      await pause(700, 1000);
      await shot(page, '03b_add_shared_payment');
    }

    // ---- 6) Receipt Scan ----
    console.log('Scene: Receipt scan');
    if (await page.locator('[onclick*="triggerReceiptScan"], #btn-scan-receipt, .receipt-scan-btn').count()) {
      await tap(page, '[onclick*="triggerReceiptScan"], #btn-scan-receipt, .receipt-scan-btn', false);
      await pause(900, 1300);
      await shot(page, '04_receipt_scan');
      await page.keyboard.press('Escape').catch(() => {});
    } else {
      console.log('  (receipt-scan entry not found — capturing add-expense as fallback)');
      await shot(page, '04_receipt_scan');
    }

    // ---- 7) Group Details (hamburger → group details) ----
    console.log('Scene: Group Details');
    if (await page.locator('.hamburger-btn').count()) {
      await tap(page, '.hamburger-btn');
      if (await page.locator('#menu-group-details-btn').count()) {
        await page.locator('#menu-group-details-btn').click({ force: true }).catch(() => {});
        await pause(1200, 1700);
      }
    }
    await shot(page, '05_group_details');

    // ---- 8) Settings & Profile ----
    console.log('Scene: Profile / Settings');
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
    await pause(1200, 1700);
    await shot(page, '07_profile');
    // open the notifications settings card if present
    const notif = page.locator('text=התראות, text=Notifications').first();
    if (await notif.count()) { await notif.click().catch(() => {}); await pause(800, 1200); await shot(page, '08_settings_notifications'); }

    console.log('\n✅ Walkthrough complete. Screenshots in marketing/screenshots/');
  } catch (err) {
    console.error('Demo run error:', err);
    await page.screenshot({ path: path.join(SHOTS_DIR, '_error.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await pause(400, 700);
    await context.close();
    await browser.close();
  }
})();
