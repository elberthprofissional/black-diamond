/**
 * Script de otimização de imagens para produção
 * Reduz o tamanho das imagens WebP/PNG mantendo qualidade visual
 * Uso: node scripts/optimize-images.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, '../public/assets');

const QUALITY_WEBP = 75; // Qualidade WebP (0-100)
const QUALITY_PNG = 70; // Qualidade PNG (0-100)
const MAX_WIDTH = 1920; // Largura máxima
const MAX_HEIGHT = 1080; // Altura máxima

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const stats = fs.statSync(filePath);
  const originalSize = stats.size;

  if (ext === '.webp' || ext === '.png') {
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      // Redimensionar se necessário
      let pipeline = image;
      if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
        pipeline = pipeline.resize({
          width: Math.min(metadata.width, MAX_WIDTH),
          height: Math.min(metadata.height, MAX_HEIGHT),
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Comprimir
      if (ext === '.webp') {
        pipeline = pipeline.webp({ quality: QUALITY_WEBP, effort: 6 });
      } else {
        pipeline = pipeline.png({ quality: QUALITY_PNG, compressionLevel: 9 });
      }

      // Salvar temporário e substituir (usando copy+unlink para evitar EPERM no Windows)
      const tmpFile = filePath + '.tmp';
      await pipeline.toFile(tmpFile);
      try {
        fs.renameSync(tmpFile, filePath);
      } catch {
        // Fallback para Windows: copiar e deletar
        fs.copyFileSync(tmpFile, filePath);
        fs.unlinkSync(tmpFile);
      }

      const newSize = fs.statSync(filePath).size;
      const saved = ((originalSize - newSize) / originalSize * 100).toFixed(1);
      console.log(`  ✅ ${path.basename(filePath)}: ${formatBytes(originalSize)} → ${formatBytes(newSize)} (${saved}% menor)`);
    } catch (err) {
      console.error(`  ❌ ${path.basename(filePath)}: ${err.message}`);
    }
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function main() {
  console.log('\n🚀 Otimizando imagens em:', assetsDir, '\n');

  if (!fs.existsSync(assetsDir)) {
    console.error('❌ Diretório de assets não encontrado:', assetsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(assetsDir).filter(f =>
    /\.(webp|png)$/i.test(f)
  );

  if (files.length === 0) {
    console.log('  Nenhuma imagem WebP ou PNG encontrada.');
    return;
  }

  let totalOriginal = 0;
  let totalNew = 0;

  for (const file of files) {
    const filePath = path.join(assetsDir, file);
    const stats = fs.statSync(filePath);
    totalOriginal += stats.size;
    await optimizeImage(filePath);
    if (fs.existsSync(filePath)) {
      totalNew += fs.statSync(filePath).size;
    }
  }

  const totalSaved = ((totalOriginal - totalNew) / totalOriginal * 100).toFixed(1);
  console.log(`\n📊 Total: ${formatBytes(totalOriginal)} → ${formatBytes(totalNew)} (${totalSaved}% de economia)`);
}

main().catch(console.error);
