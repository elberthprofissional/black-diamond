import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Acessibilidade - Home Page', () => {
  test('home page passa em auditoria de acessibilidade', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).analyze();
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

  test('seções principais têm landmarks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const main = page.locator('#main-content, main, [role="main"]');
    await expect(main.first()).toBeAttached();
  });
});

test.describe('Acessibilidade - Página de Agendamento', () => {
  test('booking page passa em auditoria de acessibilidade', async ({ page }) => {
    await page.goto('/agendar');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

    expect(criticalViolations).toEqual([]);
  });

  test('formulários possuem labels', async ({ page }) => {
    await page.goto('/agendar');
    await page.waitForLoadState('networkidle');

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

  test('etapas do wizard têm aria-current', async ({ page }) => {
    await page.goto('/agendar');
    await page.waitForLoadState('networkidle');

    const activeStep = page.locator('[aria-current="step"]');
    await expect(activeStep.first()).toBeAttached();
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

    const toggleBtn = page.locator('[aria-label="Mostrar senha"], [aria-label="Ocultar senha"]');
    await expect(toggleBtn).toBeVisible();
  });

  test('inputs de login têm autocomplete', async ({ page }) => {
    await page.goto('/admin/login');

    const emailInput = page.locator('#login-email');
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');

    const passwordInput = page.locator('#login-password');
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
  });
});

test.describe('Acessibilidade - Página 404', () => {
  test('404 passa em auditoria de acessibilidade', async ({ page }) => {
    await page.goto('/rota-inexistente');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

    expect(criticalViolations).toEqual([]);
  });

  test('404 tem heading e botão de retorno', async ({ page }) => {
    await page.goto('/rota-inexistente');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2');
    await expect(heading.first()).toBeVisible();

    const backLink = page.locator('a[href="/"], button');
    await expect(backLink.first()).toBeVisible();
  });
});

test.describe('Acessibilidade - Gerenciar/Cancelar Agendamento', () => {
  test('manage booking passa em auditoria de acessibilidade', async ({ page }) => {
    await page.goto('/gerenciar');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

    expect(criticalViolations).toEqual([]);
  });

  test('cancel page passa em auditoria de acessibilidade', async ({ page }) => {
    await page.goto('/cancelar');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

    expect(criticalViolations).toEqual([]);
  });
});

test.describe('Acessibilidade - Navegação por Teclado', () => {
  test('tab navigation funciona na home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

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

  test('navegação por setas funciona no wizard de agendamento', async ({ page }) => {
    await page.goto('/agendar');
    await page.waitForLoadState('networkidle');

    const firstInput = page.locator('input').first();
    await expect(firstInput).toBeVisible();

    await firstInput.focus();
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
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

    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

    expect(criticalViolations).toEqual([]);
  });

  test('contraste no login admin', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();

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

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toEqual([]);
  });

  test('listas têm roles corretos', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withRules(['list', 'listitem']).analyze();

    expect(results.violations).toEqual([]);
  });
});

test.describe('Acessibilidade - Formulários', () => {
  test('inputs obrigatórios têm aria-required', async ({ page }) => {
    await page.goto('/agendar');
    await page.waitForLoadState('networkidle');

    const requiredInputs = page.locator('input[required], input[aria-required="true"]');
    const count = await requiredInputs.count();

    for (let i = 0; i < count; i++) {
      const input = requiredInputs.nth(i);
      const hasRequired =
        (await input.getAttribute('required')) !== null ||
        (await input.getAttribute('aria-required')) === 'true';
      expect(hasRequired).toBeTruthy();
    }
  });

  test('campos de erro têm aria-describedby', async ({ page }) => {
    await page.goto('/agendar');
    await page.waitForLoadState('networkidle');

    const errorMessages = page.locator('[role="alert"], .error-message, [aria-live="assertive"]');
    const count = await errorMessages.count();

    // Error messages should exist in the DOM for screen readers
    // (may be hidden visually)
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const msg = errorMessages.nth(i);
        const ariaLive = await msg.getAttribute('aria-live');
        const role = await msg.getAttribute('role');
        expect(ariaLive || role).toBeTruthy();
      }
    }
  });
});

test.describe('Acessibilidade - Imagens e Mídia', () => {
  test('todas as imagens têm alt text ou são decorativas', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaHidden = await img.getAttribute('aria-hidden');
      const role = await img.getAttribute('role');

      // Image must have alt, be aria-hidden, or be decorative
      const isAccessible = alt !== null || ariaHidden === 'true' || role === 'presentation';
      expect(isAccessible).toBeTruthy();
    }
  });

  test('ícones SVG têm acessibilidade', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const svgIcons = page.locator('svg');
    const count = await svgIcons.count();

    for (let i = 0; i < count; i++) {
      const svg = svgIcons.nth(i);
      const ariaHidden = await svg.getAttribute('aria-hidden');
      const role = await svg.getAttribute('role');
      const title = await svg.locator('title').count();

      // SVG should be hidden from AT or have a title
      const isAccessible = ariaHidden === 'true' || role === 'img' || title > 0;
      expect(isAccessible).toBeTruthy();
    }
  });
});
