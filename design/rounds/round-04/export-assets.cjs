// Format conversion and cropping only; all artwork and alpha come from imagegen.
// Use an installed Sharp or set SHARP_MODULE to its absolute module path.
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const sources = {
  'starlight-avatar-ring': 'exec-19b54de2-1df5-42e8-ac50-43c5a520e08e.png',
  'forged-avatar-ring': 'exec-4623ada7-103d-4224-a935-5d3e522e6660.png',
  'astral-avatar-ring': 'exec-1fd58624-42c2-4b19-8146-4d69f1a86a9b.png',
  'starlight-control-frame': 'exec-4caaa637-7961-4f29-84ed-d8247ea795c1.png',
  'forged-control-frame': 'exec-fbafdc32-e4f2-48d5-b366-7851bce111b0.png',
  'astral-control-frame': 'exec-559596e9-84b3-4d16-9acb-9826fafea435.png',
};
(async () => {
  await fs.mkdir(path.join(__dirname, 'assets'), { recursive: true });
  for (const name of Object.keys(sources)) {
    const src = path.join(__dirname, 'assets', `${name}-source.png`);
    const metadata = await sharp(src).metadata();
    if (!metadata.hasAlpha) throw new Error(`${name} has no alpha`);
    const cropped = await sharp(src).trim({ threshold: 20 }).toBuffer();
    const result = await sharp(cropped).resize(name.includes('avatar')
      ? { width: 256, height: 256, fit: 'contain', background: '#00000000' } : { width: 768 })
      .webp({ quality: 88, effort: 6 }).toBuffer();
    const out = path.join(__dirname, '../../../src/assets/generated', `${name}.webp`);
    await fs.writeFile(out, result);
    const { data, info } = await sharp(result).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const center = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * 4 + 3;
    if (data[3] !== 0 || data[center] !== 0) throw new Error(`${name} center/corner is not clear`);
    console.log(`${name}: ${info.width}x${info.height}, ${result.length} bytes, center/corner alpha 0`);
  }
})();
