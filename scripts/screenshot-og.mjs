import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateOG() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

  const htmlPath = join(__dirname, 'generate-og-image.html');
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`);
  await page.waitForTimeout(500);

  const outputPath = join(__dirname, '..', 'public', 'assets', 'og-image.png');
  await page.screenshot({ path: outputPath, type: 'png' });

  console.log(`OG image saved to: ${outputPath}`);
  await browser.close();
}

generateOG().catch(console.error);
