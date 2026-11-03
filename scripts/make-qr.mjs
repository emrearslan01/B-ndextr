// Print-ready QR code for the site (stand banners, flyers, table cards).
// Reads SITE_URL from public/js/config.js → qr/bindex-qr.svg + PNGs.
//   npm run qr
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import qrcode from '../public/vendor/qrcode.mjs';
import { SITE_URL } from '../public/js/config.js';

const OUT = 'qr';
const QUIET = 4; // modules of white border required by the QR spec

// High error correction: still scans when dirty, creased or partly covered
const qr = qrcode(0, 'H');
qr.addData(SITE_URL);
qr.make();
const n = qr.getModuleCount();
const size = n + QUIET * 2;

let d = '';
for (let r = 0; r < n; r++) {
  for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">
  <rect width="${size}" height="${size}" fill="#FFFFFF"/>
  <path fill="#1D1D1F" d="${d}"/>
</svg>
`;

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/bindex-qr.svg`, svg);
for (const px of [1024, 4096]) {
  await sharp(Buffer.from(svg), { density: 72 * px / size })
    .resize(px, px, { kernel: 'nearest' })
    .png()
    .toFile(`${OUT}/bindex-qr-${px}.png`);
}
console.log(`QR for ${SITE_URL} → ${OUT}/ (${n}×${n} modules)`);
