import { test, expect } from '@playwright/test';

/**
 * Testes de regressao visual.
 *
 * Compara screenshots das paginas principais contra baselines.
 * Pra atualizar baselines: npx playwright test --update-screenshots
 *
 * Rodar: npx playwright test visual.spec.ts
 */

// Desktop viewport (1280x720)
const desktop = { viewport: { width: 1280, height: 720 } };
// Mobile viewport (375x667 - iPhone SE)
const mobile = { viewport: { width: 375, height: 667 } };
// Tablet viewport (768x1024)
const tablet = { viewport: { width: 768, height: 1024 } };

test.describe('Regressao visual — Paginas publicas', () => {
  // O slider de depoimentos tem autoplay (JS setInterval de 4s) que o
  // Playwright não desabilita automaticamente — faz o screenshot nunca
  // "estabilizar" (falha intermitente). Pausa com hover antes do screenshot.
  async function pauseTestimonialsAutoplay(page: import('@playwright/test').Page) {
    const slider = page.locator('[aria-roledescription="carousel"]');
    if (await slider.count()) {
      await slider.first().hover({ force: true });
      await page.waitForTimeout(300);
    }
  }

  test('Home page — desktop', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pauseTestimonialsAutoplay(page);
    await expect(page).toHaveScreenshot('home-desktop.png', { fullPage: true });
  });

  test('Home page — mobile', async ({ page }) => {
    await page.setViewportSize(mobile.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pauseTestimonialsAutoplay(page);
    await expect(page).toHaveScreenshot('home-mobile.png', { fullPage: true });
  });

  test('Home page — tablet', async ({ page }) => {
    await page.setViewportSize(tablet.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pauseTestimonialsAutoplay(page);
    await expect(page).toHaveScreenshot('home-tablet.png', { fullPage: true });
  });

  test('Booking page — desktop', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/agendar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('booking-desktop.png', { fullPage: true });
  });

  test('Booking page — mobile', async ({ page }) => {
    await page.setViewportSize(mobile.viewport);
    await page.goto('/agendar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('booking-mobile.png', { fullPage: true });
  });

  test('Cancel page — desktop', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/cancelar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('cancel-desktop.png', { fullPage: true });
  });

  test('Cancel page — mobile', async ({ page }) => {
    await page.setViewportSize(mobile.viewport);
    await page.goto('/cancelar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('cancel-mobile.png', { fullPage: true });
  });

  test('Manage booking page — desktop', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/gerenciar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('manage-desktop.png', { fullPage: true });
  });

  test('Manage booking page — mobile', async ({ page }) => {
    await page.setViewportSize(mobile.viewport);
    await page.goto('/gerenciar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('manage-mobile.png', { fullPage: true });
  });
});

test.describe('Regressao visual — Admin', () => {
  // Storage limpo: os testes de login precisam ver o formulário, não o
  // dashboard (com a sessão admin ativa o /admin/login redireciona).
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Login page — desktop', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-login-desktop.png', { fullPage: true });
  });

  test('Login page — mobile', async ({ page }) => {
    await page.setViewportSize(mobile.viewport);
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-login-mobile.png', { fullPage: true });
  });

  test('Login page — tablet', async ({ page }) => {
    await page.setViewportSize(tablet.viewport);
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('admin-login-tablet.png', { fullPage: true });
  });

  test('Login page — estado de erro', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.fill('[data-testid="input-email"]', 'erro@test.com');
    await page.fill('[data-testid="input-password"]', 'senha_errada');
    await page.click('[data-testid="btn-login"]');
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('admin-login-erro.png', { fullPage: true });
  });

  test('Login page — forgot password modal', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.click('text=Esqueceu a senha?');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('admin-login-forgot.png', { fullPage: true });
  });

  test('404 page — desktop', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/pagina-inexistente');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('not-found-desktop.png', { fullPage: true });
  });

  test('404 page — mobile', async ({ page }) => {
    await page.setViewportSize(mobile.viewport);
    await page.goto('/pagina-inexistente');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('not-found-mobile.png', { fullPage: true });
  });

  test('Reset password page — desktop', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/admin/reset-password');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('reset-password-desktop.png', { fullPage: true });
  });

  test('Reset password page — mobile', async ({ page }) => {
    await page.setViewportSize(mobile.viewport);
    await page.goto('/admin/reset-password');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('reset-password-mobile.png', { fullPage: true });
  });
});

test.describe('Regressao visual — Componentes', () => {
  test('Hero section — full width', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const hero = page.locator('section').first();
    await expect(hero).toHaveScreenshot('hero-section.png');
  });

  test('Services section', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      document.querySelector('#servicos')?.scrollIntoView();
    });
    await page.waitForTimeout(500);
    const services = page.locator('#servicos');
    await expect(services).toHaveScreenshot('services-section.png');
  });

  test('Services section — mobile', async ({ page }) => {
    await page.setViewportSize(mobile.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      document.querySelector('#servicos')?.scrollIntoView();
    });
    await page.waitForTimeout(500);
    const services = page.locator('#servicos');
    await expect(services).toHaveScreenshot('services-section-mobile.png');
  });

  test('Footer section', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer-section.png');
  });

  test('Footer section — mobile', async ({ page }) => {
    await page.setViewportSize(mobile.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const footer = page.locator('footer');
    await expect(footer).toHaveScreenshot('footer-section-mobile.png');
  });

  test('Navbar — desktop', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const navbar = page.locator('nav').first();
    await expect(navbar).toHaveScreenshot('navbar-desktop.png');
  });

  test('Navbar — mobile', async ({ page }) => {
    await page.setViewportSize(mobile.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const navbar = page.locator('nav').first();
    await expect(navbar).toHaveScreenshot('navbar-mobile.png');
  });

  test('Gallery section', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      document.querySelector('#galeria')?.scrollIntoView();
    });
    await page.waitForTimeout(500);
    const gallery = page.locator('#galeria');
    await expect(gallery).toHaveScreenshot('gallery-section.png');
  });

  test('Location section — mapa', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const location = page.locator('#localizacao');
    await expect(location).toHaveScreenshot('location-section.png');
  });

  test('Testimonials section', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const el = document.querySelector('#depoimentos');
      if (el) el.scrollIntoView();
    });
    await page.waitForTimeout(500);
    const testimonials = page.locator('#depoimentos');
    await expect(testimonials).toHaveScreenshot('testimonials-section.png');
  });

  test('WhatsApp icon — floating', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const waIcon = page.locator('[data-testid=whatsapp-icon]');
    if ((await waIcon.count()) > 0) {
      await expect(waIcon).toHaveScreenshot('whatsapp-icon.png');
    }
  });
});

test.describe('Regressao visual — Skeleton Loading', () => {
  test('Skeleton dashboard', async ({ page }) => {
    await page.setViewportSize(desktop.viewport);
    // Intercept API to force skeleton state
    await page.route('**/rest/v1/bookings**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue();
    });
    await page.goto('/admin');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('skeleton-dashboard.png', { fullPage: true });
  });
});
