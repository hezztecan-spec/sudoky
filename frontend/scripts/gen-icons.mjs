// Генерирует PNG-иконки из SVG: 192, 512 (any) и 512 (maskable с отступом).
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public');

const bg = '#0a0a0a';
const fg = '#ffffff';

const svgBase = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${bg}"/>
  <g fill="none" stroke="${fg}" stroke-width="8" stroke-linecap="round">
    <rect x="96" y="96" width="320" height="320" rx="16"/>
    <line x1="202.67" y1="96" x2="202.67" y2="416"/>
    <line x1="309.33" y1="96" x2="309.33" y2="416"/>
    <line x1="96" y1="202.67" x2="416" y2="202.67"/>
    <line x1="96" y1="309.33" x2="416" y2="309.33"/>
  </g>
  <g fill="${fg}" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle">
    <text x="149" y="173" font-size="56">5</text>
    <text x="256" y="173" font-size="56">3</text>
    <text x="362" y="173" font-size="56">7</text>
    <text x="149" y="280" font-size="56">8</text>
    <text x="362" y="280" font-size="56">1</text>
    <text x="256" y="386" font-size="56">9</text>
  </g>
</svg>`;

// Maskable — должен иметь безопасную зону, рисуем меньше и по центру
const svgMaskable = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${bg}"/>
  <g transform="translate(256,256) scale(0.7) translate(-256,-256)">
    <g fill="none" stroke="${fg}" stroke-width="10" stroke-linecap="round">
      <rect x="96" y="96" width="320" height="320" rx="16"/>
      <line x1="202.67" y1="96" x2="202.67" y2="416"/>
      <line x1="309.33" y1="96" x2="309.33" y2="416"/>
      <line x1="96" y1="202.67" x2="416" y2="202.67"/>
      <line x1="96" y1="309.33" x2="416" y2="309.33"/>
    </g>
    <g fill="${fg}" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle">
      <text x="149" y="173" font-size="56">5</text>
      <text x="256" y="173" font-size="56">3</text>
      <text x="362" y="173" font-size="56">7</text>
      <text x="149" y="280" font-size="56">8</text>
      <text x="362" y="280" font-size="56">1</text>
      <text x="256" y="386" font-size="56">9</text>
    </g>
  </g>
</svg>`;

await mkdir(outDir, { recursive: true });

async function render(svg, size, file) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  await writeFile(path.join(outDir, file), buf);
  console.log(`✓ ${file}`);
}

await render(svgBase(512), 192, 'icon-192.png');
await render(svgBase(512), 512, 'icon-512.png');
await render(svgMaskable, 512, 'icon-maskable-512.png');
console.log('done');
