// Mechanical atlas extraction / WebP export; generated colors and alpha are preserved.
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const source = path.join(__dirname, 'assets');
const output = path.resolve(__dirname, '../../../src/assets/generated');

async function main() {
  const report = { emblems: {}, digits: {} };
  for (const skin of ['starlight', 'forged', 'astral']) {
    const input = path.join(source, `${skin}-source.png`);
    if (!(await sharp(input).metadata()).hasAlpha) throw new Error(`${skin} needs real alpha`);
    const result = await sharp(input).trim().resize(256, 256, {
      fit: 'contain', background: '#00000000',
    }).webp({ quality: 88, effort: 6 }).toFile(path.join(output, `credit-${skin}.webp`));
    report.emblems[skin] = result;
  }
  const atlas = path.join(source, 'digits-source.png');
  const { width, height, hasAlpha } = await sharp(atlas).metadata();
  if (!hasAlpha) throw new Error('Numeral atlas needs real alpha');
  for (let digit = 0; digit < 10; digit++) {
    const col = digit % 5, row = Math.floor(digit / 5);
    const left = Math.round(col * width / 5), top = Math.round(row * height / 2);
    const cell = { left, top, width: Math.round((col + 1) * width / 5) - left,
      height: Math.round((row + 1) * height / 2) - top };
    const crop = await sharp(atlas).extract(cell).png().toBuffer();
    const result = await sharp(crop).trim().resize({ height: 96 })
      .webp({ quality: 90, effort: 6 }).toFile(path.join(output, `credit-digit-${digit}.webp`));
    report.digits[digit] = { cell, ...result };
  }
  await fs.writeFile(path.join(__dirname, 'asset-metrics.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
