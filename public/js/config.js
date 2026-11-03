// ==========================================================================
// BINDEX — site configuration
// Everything you'd normally want to change lives here. No build step needed:
// edit, save, refresh.
// ==========================================================================

/** Live URL of the site. Used for the footer QR code and the footer link. */
export const SITE_URL = 'https://bindex.pages.dev/';

/** Text shown next to the footer QR link (defaults to the host of SITE_URL). */
export const SITE_LABEL = new URL(SITE_URL).host;

/** Brand accent. Mirrored in css/style.css (--accent); set here to override at runtime. */
export const ACCENT = '#8A6B3E';

/** Texts/links that the page fills in from config ([data-config="..."]). */
export const CONTENT = {
  priceText: "₺3.499'dan başlayan fiyatlarla. Fuara özel ön sipariş fırsatıyla.",
  email: 'hello@bindex.com',
  instagram: '#contact',   // e.g. 'https://instagram.com/bindex'
  linkedin: '#contact',    // e.g. 'https://www.linkedin.com/company/bindex'
  fairLocation: 'Hol 3 · Stand B12',
  fairDates: '14–17 Kasım 2026'
};

/**
 * Leather colours for the 3D configurator.
 *  leather / band: hex used for the 3D materials (sRGB)
 *  swatch:         CSS colour for the button
 *  photoX:         horizontal position (0–100 %) of this colour in the product
 *                  photo — used by the no-WebGL fallback
 */
export const COLORS = [
  { id: 'black', name: 'Gece Siyahı', leather: 0x1E1E20, band: 0x111112, swatch: '#1C1C1E', photoX: 0 },
  { id: 'red', name: 'Bordo', leather: 0x7A1216, band: 0x3E0A0C, swatch: '#8E1B1F', photoX: 50 },
  { id: 'green', name: 'Orman Yeşili', leather: 0x16392A, band: 0x0C2017, swatch: '#1F4A33', photoX: 100 }
];

/** Zipper pull colours for the 3D configurator. */
export const PULLS = [
  { id: 'gold', name: 'Sarı', hex: 0xE9B21B, swatch: '#E9B21B' },
  { id: 'black', name: 'Siyah', hex: 0x1C1C1E, swatch: '#1C1C1E' }
];

/** Initial configurator selection. */
export const DEFAULT_SELECTION = { color: 'black', pull: 'gold' };

/** 3D scene tuning. */
export const SHOWROOM = {
  threeSrc: 'vendor/three.min.js',
  // Optional: path to a real .glb model (see README → "Gerçek 3D model").
  // When null, the procedural leather case is used.
  modelUrl: null,
  maxPixelRatio: 2,
  shadowMapDesktop: 2048,
  shadowMapMobile: 1024
};
