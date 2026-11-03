// Generates responsive AVIF / WebP / PNG variants of the product photo
// plus the Open Graph image. Output is committed, so this only needs to
// run again when the source photo changes:  npm run images
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'bindex-reference/assets/bindex-colors.png';
const OUT = 'public/assets/img';
const NAME = 'bindex-colors';
const WIDTHS = [640, 1024, 1440, 1774];

await mkdir(OUT, { recursive: true });
const meta = await sharp(SRC).metadata();

for (const w of WIDTHS) {
  const width = Math.min(w, meta.width);
  const base = sharp(SRC).resize({ width, withoutEnlargement: true });
  await base.clone().avif({ quality: 52, effort: 6 }).toFile(`${OUT}/${NAME}-${width}.avif`);
  await base.clone().webp({ quality: 78, effort: 6 }).toFile(`${OUT}/${NAME}-${width}.webp`);
}

// PNG fallback (only used by browsers without AVIF/WebP support)
await sharp(SRC).resize({ width: 1440 }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(`${OUT}/${NAME}.png`);

// Open Graph / Twitter card image (1200x630)
await sharp(SRC)
  .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' })
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile(`${OUT}/og-image.jpg`);

console.log('Images written to', OUT);
