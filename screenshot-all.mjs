/**
 * screenshot-all.mjs
 *
 * Captures viewport screenshots of every page in the Jelantahin app
 * using Playwright. Supports public pages, perusahaan dashboard pages,
 * and UMKM dashboard pages via Supabase auth login.
 *
 * Usage:
 *   node screenshot-all.mjs
 *
 * Prerequisites:
 *   - SvelteKit dev server running on http://localhost:5173
 *   - Playwright installed (npm install playwright)
 *   - Chromium browser installed (npx playwright install chromium)
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

const VIEWPORTS = [
  { name: '1920x1080', w: 1920, h: 1080 },
  { name: '375x667',    w: 375,  h: 667 },
];

// ── Route lists ──────────────────────────────────────────────────────

const PUBLIC_PAGES = [
  { path: '/',                 name: 'home' },
  { path: '/login',            name: 'login' },
  { path: '/register',         name: 'register' },
  // /logout is just a confirmation — captured when logged in
];

const PERUSAHAAN_PAGES = [
  { path: '/dashboard',                  name: 'dashboard' },
  { path: '/dashboard/payment',          name: 'dashboard-payment' },
  { path: '/dashboard/perusahaan',       name: 'perusahaan' },
  { path: '/dashboard/perusahaan/banks',  name: 'perusahaan-banks' },
  { path: '/dashboard/perusahaan/browse', name: 'perusahaan-browse' },
  { path: '/dashboard/perusahaan/fee',    name: 'perusahaan-fee' },
  { path: '/dashboard/perusahaan/orders', name: 'perusahaan-orders' },
];

const UMKM_PAGES = [
  { path: '/dashboard',                  name: 'dashboard' },
  { path: '/dashboard/payment',          name: 'dashboard-payment' },
  { path: '/dashboard/umkm',             name: 'umkm' },
  { path: '/dashboard/umkm/bank',        name: 'umkm-bank' },
  { path: '/dashboard/umkm/history',     name: 'umkm-history' },
  { path: '/dashboard/umkm/listing',     name: 'umkm-listing' },
  { path: '/dashboard/umkm/points',      name: 'umkm-points' },
  { path: '/dashboard/umkm/points/history', name: 'umkm-points-history' },
];

// ── Credentials ──────────────────────────────────────────────────────

const CREDENTIALS = {
  perusahaan: { email: 'test1@gmail.com', password: 'impro123' },
  umkm:       { email: 'test2@gmail.com', password: 'impro123' },
};

// ── Helpers ──────────────────────────────────────────────────────────

function fileName(viewName, pageName) {
  return `screenshots/${viewName}-${pageName}.png`;
}

async function screenshotPages(page, pages, viewName, label) {
  console.log(`\n── ${label} ──`);
  for (const { path, name } of pages) {
    const url = `${BASE_URL}${path}`;
    console.log(`  → ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    // Give the SPA a moment to render fully
    await page.waitForTimeout(1000);
    const fname = fileName(viewName, name);
    await page.screenshot({ path: fname, fullPage: false });
    console.log(`    ✓ ${fname}`);
  }
}

async function loginAs(page, email, password) {
  console.log(`  → Logging in as ${email}...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(800);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  // Wait for redirect to /dashboard (auth + navigation)
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log(`    ✓ Logged in, at /dashboard`);
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  Jelantahin — Screenshot All Pages');
  console.log('══════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n═══════ Viewport: ${vp.name} ═══════\n`);

    // ── Public pages (clean context, no auth) ──────────────
    console.log('── Public pages ──');
    const pubCtx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const pubPage = await pubCtx.newPage();
    for (const { path, name } of PUBLIC_PAGES) {
      const url = `${BASE_URL}${path}`;
      console.log(`  → ${url}`);
      await pubPage.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await pubPage.waitForTimeout(1000);
      const fname = fileName(vp.name, name);
      await pubPage.screenshot({ path: fname, fullPage: false });
      console.log(`    ✓ ${fname}`);
    }
    await pubCtx.close();

    // ── Perusahaan dashboard pages ─────────────────────────
    const perCtx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const perPage = await perCtx.newPage();
    await loginAs(perPage, CREDENTIALS.perusahaan.email, CREDENTIALS.perusahaan.password);
    await screenshotPages(perPage, PERUSAHAAN_PAGES, vp.name, 'Perusahaan pages');
    // Also screenshot /logout while authenticated
    await perPage.goto(`${BASE_URL}/logout`, { waitUntil: 'networkidle', timeout: 15000 });
    await perPage.waitForTimeout(800);
    const logoutFname = fileName(vp.name, 'logout');
    await perPage.screenshot({ path: logoutFname, fullPage: false });
    console.log(`  → /logout\n    ✓ ${logoutFname}`);
    await perCtx.close();

    // ── UMKM dashboard pages ───────────────────────────────
    const umkmCtx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const umkmPage = await umkmCtx.newPage();
    await loginAs(umkmPage, CREDENTIALS.umkm.email, CREDENTIALS.umkm.password);
    await screenshotPages(umkmPage, UMKM_PAGES, vp.name, 'UMKM pages');
    await umkmCtx.close();
  }

  await browser.close();
  console.log('\n══════════════════════════════════════════════');
  console.log('  ✅ All screenshots captured!');
  console.log('  Files saved in screenshots/ directory');
  console.log('══════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
