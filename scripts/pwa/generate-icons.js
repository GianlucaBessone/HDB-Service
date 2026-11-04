/**
 * Regenera los íconos de la PWA, el apple-touch-icon y el favicon a partir del
 * isotipo de components/ui/BrandMark.tsx. El favicon SVG es public/logo.svg.
 *
 *   node scripts/pwa/generate-icons.js
 *
 * Si cambia el isotipo: actualizá las constantes de abajo, corré el script y
 * subí la versión de la carpeta (ICONS_DIR) y de las rutas en public/manifest.json
 * y app/layout.tsx. Sin una URL nueva, las PWA ya instaladas no detectan el cambio.
 *
 * Usa `sharp`, que ya viene con Next.js.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PRIMARY = '#0F6A7B'; // --primary (petróleo)
const ACCENT = '#4CC0D2'; // --sidebar-active
const ICONS_DIR = 'icons/v2';

const ROOT = path.join(__dirname, '../..');
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(PUBLIC, ICONS_DIR);

/** Monograma "H" del isotipo, en coordenadas de 32×32. */
const GLYPH = `
  <path d="M10 8.5v15M22 8.5v15M10 16h12" stroke="#ffffff" stroke-width="3" stroke-linecap="square" fill="none"/>
  <rect x="20.5" y="8.5" width="3" height="3" fill="${ACCENT}"/>`;

/**
 * @param size   lado en px
 * @param rounded  esquinas redondeadas (rx 7/32, como en la app) o cuadrado a sangre
 * @param scale  escala del monograma respecto del isotipo original
 */
function markSvg(size, { rounded = true, scale = 1 } = {}) {
  const offset = 16 * (1 - scale);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="${rounded ? 7 : 0}" fill="${PRIMARY}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${GLYPH}
  </g>
</svg>`;
}

const png = (svg) => sharp(Buffer.from(svg)).png().toBuffer();

/** ICO con imágenes PNG embebidas (formato aceptado por todos los navegadores actuales). */
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  console.log('  ' + path.relative(ROOT, file));
}

async function main() {
  // "any": el isotipo tal como se ve en la app, con esquinas transparentes.
  for (const size of [192, 512]) {
    await write(path.join(OUT, `icon-${size}.png`), await png(markSvg(size)));
  }

  // "maskable": a sangre; el monograma (≈42 % del lado) queda dentro de la zona segura del 80 %.
  for (const size of [192, 512]) {
    await write(path.join(OUT, `maskable-${size}.png`), await png(markSvg(size, { rounded: false })));
  }

  // iOS aplica sus propias esquinas: cuadrado opaco.
  await write(path.join(OUT, 'apple-touch-icon.png'), await png(markSvg(180, { rounded: false })));

  // Favicon: ICO multi-tamaño (app/favicon.ico lo publica Next en /favicon.ico).
  const ico = buildIco(
    await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(markSvg(size)) })))
  );
  await write(path.join(ROOT, 'app', 'favicon.ico'), ico);
  await write(path.join(PUBLIC, 'favicon.ico'), ico);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
