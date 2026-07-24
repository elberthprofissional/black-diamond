import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const DIR = 'public/assets';

const images = [
  { file: 'login.webp', quality: 70, resize: 800 },
  { file: 'hero-bg.webp', quality: 80, resize: 1280 },
  { file: 'hero-bg-mobile.webp', quality: 80 },
  { file: 'agendamento.webp', quality: 80, resize: 800 },
  { file: 'agendamento-mobile.webp', quality: 80 },
  { file: 'logo.webp', quality: 75, resize: 400 },
  { file: 'resetar_senha.webp', quality: 80, resize: 800 },
  { file: 'og-image.png', quality: 80, resize: 600 },
];

let totalBefore = 0;
let totalAfter = 0;

for (const img of images) {
  const srcPath = path.join(DIR, img.file);

  if (!fs.existsSync(srcPath)) {
    console.log(`⚠️  ${img.file} — não encontrado, ignorando`);
    continue;
  }

  const before = fs.statSync(srcPath).size;
  totalBefore += before;

  // Read entire file into buffer FIRST to release file handle
  const inputBuffer = fs.readFileSync(srcPath);

  // Process in memory
  let pipeline = sharp(inputBuffer);
  const meta = await pipeline.metadata();

  if (img.resize && meta.width && meta.width > img.resize) {
    pipeline = sharp(inputBuffer).resize(img.resize, undefined, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Get output buffer
  const isPng = path.extname(img.file).toLowerCase() === '.png';
  if (isPng) {
    const outputBuffer = await pipeline.png({ quality: img.quality, effort: 9 }).toBuffer();
    fs.writeFileSync(srcPath, outputBuffer);
  } else {
    const outputBuffer = await pipeline.webp({ quality: img.quality, effort: 6 }).toBuffer();
    fs.writeFileSync(srcPath, outputBuffer);
  }

  const after = fs.statSync(srcPath).size;
  totalAfter += after;
  const saved = ((before - after) / before * 100).toFixed(1);

  console.log(
    `✅ ${img.file.padEnd(25)} ${(before/1024).toFixed(1).padStart(7)} KB → ${(after/1024).toFixed(1).padStart(7)} KB (${saved.padStart(5)}% saved)`
  );
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Total: ${(totalBefore/1024/1024).toFixed(2)} MB → ${(totalAfter/1024/1024).toFixed(2)} MB`);
console.log(`💾 Economia: ${((totalBefore - totalAfter)/1024/1024).toFixed(2)} MB (${((totalBefore - totalAfter)/totalBefore*100).toFixed(1)}%)`);
