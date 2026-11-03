// Visual + console check across breakpoints. Requires the dev server:
//   npm run dev          (in one terminal)
//   npm run shots        (in another)  → screenshots/
// BASE_URL env var overrides the target (e.g. the live Pages URL).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8788/';
const OUT = 'screenshots';
const WIDTHS = (process.env.WIDTHS || '360,390,768,1024,1440,1920,3840').split(',').map(Number);
const DETAIL = [390, 1440]; // widths that get the scroll-by-scroll 3D check

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const problems = [];

for (const width of WIDTHS) {
  const mobile = width < 768;
  const height = mobile ? 844 : width >= 3000 ? 2160 : width >= 1900 ? 1080 : width >= 1400 ? 900 : 1024;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000);
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${width}] console.${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${width}] pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[${width}] requestfailed: ${r.url()}`));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200); // intro animations

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) problems.push(`[${width}] horizontal overflow: ${overflow}px`);

  await page.screenshot({ path: `${OUT}/${width}-01-hero.png` });

  if (DETAIL.includes(width)) {
    // walk through the 3D showroom
    const exp = await page.evaluate(() => {
      const el = document.querySelector('#experience');
      return { top: el.getBoundingClientRect().top + scrollY, height: el.offsetHeight };
    });
    const span = exp.height - height;
    for (const p of [0, 0.15, 0.4, 0.75, 1]) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(exp.top + span * p));
      await page.waitForTimeout(p === 0 ? 2500 : 1300);
      await page.screenshot({ path: `${OUT}/${width}-3d-p${String(p * 100).padStart(3, '0')}.png` });
    }
    // configurator: pick Bordo + black pull with the keyboard
    await page.focus('[data-swatches="colors"] button');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.focus('[data-swatches="pulls"] button[data-id="black"]');
    await page.keyboard.press('Space');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${width}-3d-config.png` });
    const pressed = await page.$$eval('.bx3-swatch[aria-pressed="true"]', (b) => b.map((x) => x.dataset.id));
    if (pressed.join() !== 'red,black') problems.push(`[${width}] configurator state wrong: ${pressed}`);
    const fb = await page.$eval('.bx3-fallback', (el) => !el.hidden);
    if (fb) problems.push(`[${width}] WebGL fallback is showing`);
  }

  // full scroll through the rest of the page, section by section
  const sections = ['#features', '.bx-material', '.bx-feat--protect', '.bx-details', '#colors', '.bx-closing', '#contact'];
  for (const [i, sel] of sections.entries()) {
    await page.evaluate((s) => {
      const el = document.querySelector(s);
      const y = el.getBoundingClientRect().top + scrollY + (el.classList.contains('bx-material') ? el.offsetHeight * 0.45 : 0);
      window.scrollTo(0, y);
    }, sel);
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `${OUT}/${width}-${String(i + 2).padStart(2, '0')}-${sel.replace(/[#.]/g, '')}.png` });
  }
  const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow2 > 0) problems.push(`[${width}] horizontal overflow after scroll: ${overflow2}px`);
  await ctx.close();
}

await browser.close();
console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'No console errors, no horizontal overflow.');
