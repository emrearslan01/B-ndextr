// BINDEX — entry point
import { SITE_URL, SITE_LABEL, ACCENT, CONTENT } from './config.js';
import { initScrollFx } from './scroll-fx.js';
import { initShowroom } from './showroom.js';
import qrcode from '../vendor/qrcode.mjs';

// ---- config → page
function applyConfig() {
  document.documentElement.style.setProperty('--accent', ACCENT);

  const set = (key, fn) => document.querySelectorAll(`[data-config="${key}"]`).forEach(fn);
  set('priceText', (el) => { el.textContent = CONTENT.priceText; });
  set('email', (el) => { el.textContent = CONTENT.email; el.href = 'mailto:' + CONTENT.email; });
  set('instagram', (el) => { el.href = CONTENT.instagram; });
  set('linkedin', (el) => { el.href = CONTENT.linkedin; });
  set('fairLocation', (el) => { el.textContent = CONTENT.fairLocation; });
  set('fairDates', (el) => { el.textContent = CONTENT.fairDates; });
  set('siteLink', (el) => { el.href = SITE_URL; el.textContent = SITE_LABEL + ' ›'; });
}

// ---- QR code (SVG, generated locally from SITE_URL)
function renderQR() {
  const host = document.querySelector('[data-qr]');
  if (!host) return;
  try {
    const qr = qrcode(0, 'M');
    qr.addData(SITE_URL);
    qr.make();
    const n = qr.getModuleCount();
    const m = 1; // modules of quiet zone (the white card adds the rest)
    const size = n + m * 2;
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
      }
    }
    host.innerHTML =
      `<svg role="img" aria-label="${SITE_LABEL} adresine giden QR kodu" width="132" height="132" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
      `<rect width="${size}" height="${size}" fill="#FFFFFF"/><path fill="#1D1D1F" d="${d}"/></svg>`;
  } catch (e) {
    console.warn('QR generation failed', e);
  }
}

// ---- offline support for the fair (cache everything after first visit)
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:' && location.hostname !== 'localhost') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline cache is optional */ });
  });
}

applyConfig();
renderQR();
initScrollFx();
initShowroom(document.querySelector('#experience'));
registerServiceWorker();
