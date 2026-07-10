import { test, expect } from '@playwright/test';

/**
 * Testes de regressao visual.
 *
 * Compara screenshots das paginas principais contra baselines.
 * Pra atualizar baselines: npx playwright test --update-screenshots
 *
 * Rodar: npx playwright test visual.spec.ts
 */

test.describe('Regressao visual — Paginas publicas', () => {
  test('Home page — desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('home-desktop.png', { fullPage: true });
  });

  test('Home page — mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('home-mobile.png', { fullPage: true });
  });

  test('Booking page — desktop', async ({ page }) => {
    await page.goto('/agendar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('booking-desktop.png', { fullPage: true });
  });

  test('Booking page — mobile', async ({ page }) => {
    await page.goto('/agendar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('booking-mobile.png', { fullPage: true });
  });

  test('Cancel page — desktop', async ({ page }) => {
    await page.goto('/cancelar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('cancel-desktop.png', { fullPage: true });
  });

  test('Manage booking page — desktop', async ({ page }) => {
    await page.goto('/gerenciar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('manage-desktop.png', { fullPage: true });
  });
});

test.describe('Regressao visual — Admin', () => {
  test('Login page — desktop', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-login-desktop.png', { fullPage: true });
  });

  test('Login page — mobile', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-login-mobile.png', { fullPage: true });
  });

  test('404 page — desktop', async ({ page }) => {
    await page.goto('/pagina-inexistente');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('not-found-desktop.png', { fullPage: true });
  });
});

test.describe('Regressao visual — Componentes', () => {
  test('Hero section — full width', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const hero = page.locator('section').first();
    await expect(hero).toHaveScreenshot('hero-section.png');
  });

  test('Services section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      document.querySelector('#servicos')?.scrollIntoView();
    });
    await page.waitForTimeout(500);
    const services = page.locator('#servicos');
    await expect(services).toHaveScreenshot('services-section.png');
  });

  test('Footer section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer-section.png');
  });
});
