// Builds the favicon set from the BINDEX header logo (4 squares, bottom-right in gold).
//   npm run icons
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';

const OUT = 'public/assets/icons';
const INK = '#1D1D1F';
const ACCENT = '#8A6B3E';

const squares = (stroke) => `
  <rect x="1.5" y="1.5" width="8" height="8" rx="2" fill="none" stroke="${stroke}" stroke-width="1.6"/>
  <rect x="12.5" y="1.5" width="8" height="8" rx="2" fill="none" stroke="${stroke}" stroke-width="1.6"/>
  <rect x="1.5" y="12.5" width="8" height="8" rx="2" fill="none" stroke="${stroke}" stroke-width="1.6"/>
  <rect x="12.5" y="12.5" width="8" height="8" rx="2" fill="${ACCENT}"/>`;

// Browser tab icon: adapts to light/dark browser chrome
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22">
  <style>.s{stroke:${INK}}@media (prefers-color-scheme:dark){.s{stroke:#F5F5F7}}</style>
  <rect class="s" x="1.5" y="1.5" width="8" height="8" rx="2" fill="none" stroke-width="1.6"/>
  <rect class="s" x="12.5" y="1.5" width="8" height="8" rx="2" fill="none" stroke-width="1.6"/>
  <rect class="s" x="1.5" y="12.5" width="8" height="8" rx="2" fill="none" stroke-width="1.6"/>
  <rect x="12.5" y="12.5" width="8" height="8" rx="2" fill="${ACCENT}"/>
</svg>
`;

// Solid tile for raster icons (home screen etc.)
const tile = (size, pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#FFFFFF"/>
  <g transform="translate(${pad} ${pad}) scale(${(size - pad * 2) / 22})">${squares(INK)}</g>
</svg>`;

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/favicon.svg`, favicon);
await sharp(Buffer.from(tile(180, 38))).png().toFile(`${OUT}/apple-touch-icon.png`);
await sharp(Buffer.from(tile(512, 108))).png().toFile(`${OUT}/icon-512.png`);
await sharp(Buffer.from(tile(192, 40))).png().toFile(`${OUT}/icon-192.png`);
await sharp(Buffer.from(tile(32, 3))).png().toFile(`${OUT}/favicon-32.png`);
console.log('Icons written to', OUT);
