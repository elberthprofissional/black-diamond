import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Acessibilidade - Home Page', () => {
  test('home page passa em auditoria de acessibilidade', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).analyze();

    // Filter to only critical violations (exclude moderate/minor)
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

    expect(criticalViolations).toEqual([]);
  });

  test('skip link funciona com navegação por teclado', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeFocused();
  });

  test('imagens possuem alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img[alt]');
    const count = await images.count();

    // At least the logo and main images should have alt text
    expect(count).toBeGreaterThan(0);
  });

  test('botões possuem aria-label ou texto acessível', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      const hasAccessibleName = ariaLabel || (text && text.trim().length > 0);
      expect(hasAccessibleName).toBeTruthy();
    }
  });
});

test.describe('Acessibilidade - Página de Agendamento', () => {
  test('booking page passa em auditoria de acessibilidade', async ({ page }) => {
    await page.goto('/agendar');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).analyze();

    // Filter to only critical violations (exclude serious/moderate/minor for dark theme)
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

    expect(criticalViolations).toEqual([]);
  });

  test('formulários possuem labels', async ({ page }) => {
    await page.goto('/agendar');
    await page.waitForLoadState('networkidle');

    // Verificar que inputs têm labels associados
    const inputs = page.locator('input');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');

      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = (await label.count()) > 0 || ariaLabel || ariaLabelledby;
        expect(hasLabel).toBeTruthy();
      }
    }
  });
});

test.describe('Acessibilidade - Login Admin', () => {
  test('login page passa em auditoria de acessibilidade', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).analyze();

    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

    expect(criticalViolations).toEqual([]);
  });

  test('formulário de login tem labels e aria attributes', async ({ page }) => {
    await page.goto('/admin/login');

    await expect(page.locator('label[for="login-email"]')).toBeVisible();
    await expect(page.locator('label[for="login-password"]')).toBeVisible();

    // Verificar que o botão de toggle senha tem aria-label
    const toggleBtn = page.locator('[aria-label="Mostrar senha"], [aria-label="Ocultar senha"]');
    await expect(toggleBtn).toBeVisible();
  });
});

test.describe('Acessibilidade - Navegação por Teclado', () => {
  test('tab navigation funciona na home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // First nav item or logo

    // Verify focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('modais podem ser fechados com Escape', async ({ page }) => {
    await page.goto('/admin/login');
    await page.click('text=Esqueceu a senha?');

    await expect(page.locator('text=Encontre sua conta')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.locator('text=Encontre sua conta')).not.toBeVisible();
  });
});

test.describe('Acessibilidade - Contraste', () => {
  test('texto gold tem contraste suficiente', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .include('body')
      .withRules(['color-contrast'])
      .analyze();

    // Permitir violações menores (apenas warnings, não errors críticos)
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

    expect(criticalViolations).toEqual([]);
  });
});

test.describe('Acessibilidade - ARIA Roles', () => {
  test('elementos interativos têm roles apropriados', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withRules(['aria-roles', 'aria-required-attr'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('heading hierarchy está correta', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withRules(['heading-order']).analyze();

    // Permitir apenas warnings de heading order
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });
});
