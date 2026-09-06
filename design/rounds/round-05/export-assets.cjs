// Mechanical crops and WebP conversion only; imagegen authored the materials.
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const source = path.join(__dirname, 'assets/coins-source.png');
  const { width, height } = await sharp(source).metadata();
  for (const [index, skin] of ['starlight', 'forged', 'astral'].entries()) {
    const left = Math.round(index * width / 3);
    const right = Math.round((index + 1) * width / 3);
    const cell = await sharp(source).extract({ left, top: 0, width: right - left, height }).toBuffer();
    const cropped = await sharp(cell).trim({ threshold: 20 }).toBuffer();
    const out = path.join(__dirname, '../../../src/assets/generated', `coin-${skin}.webp`);
    await sharp(cropped).resize({ width: 256, height: 256, fit: 'contain', background: '#00000000' }).webp({ quality: 90, effort: 6 }).toFile(out);
    console.log(skin, (await fs.stat(out)).size);
  }
  for (const [skin, source] of [['starlight', 'starlight-frame-alpha'], ['forged', 'forged-frame'], ['astral', 'astral-frame']]) {
    const dir = path.join(__dirname, '../../../src/assets/generated');
    const info = await sharp(path.join(dir, `${source}.webp`)).trim({ threshold: 20 }).webp({ quality: 90, effort: 6 }).toFile(path.join(dir, `${skin}-panel-frame.webp`));
    console.log(skin, 'panel', info);
  }
})();
