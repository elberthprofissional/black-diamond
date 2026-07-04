import { test, expect } from '@playwright/test';

test.describe('Fluxo de Agendamento', () => {
  test('usuário consegue agendar do início ao fim', async ({ page }) => {
    await page.goto('/agendar');

    // Step 1: Selecionar serviço
    await expect(page.locator('text=Selecione o serviço')).toBeVisible();
    await page.click('[data-testid="service-card"]:first-child');
    await page.click('[data-testid="next-step"]');

    // Step 2: Preencher dados
    await expect(page.locator('text=Seus dados')).toBeVisible();
    await page.fill('[data-testid="input-name"]', 'Cliente Teste E2E');
    await page.fill('[data-testid="input-phone"]', '11999887766');
    await page.click('[data-testid="next-step"]');

    // Step 3: Selecionar data e hora
    await expect(page.locator('text=Escolha a data')).toBeVisible();
    await page.click('[data-testid="date-picker"]:first-child');
    await page.click('[data-testid="time-slot"]:first-child');
    await page.click('[data-testid="confirm-booking"]');

    // Verificar sucesso
    await expect(page.locator('text=Agendamento confirmado')).toBeVisible({ timeout: 10000 });
  });

  test('WhatsApp abre após agendamento', async ({ page }) => {
    // Mock do window.open para verificar se é chamado
    await page.addInitScript(() => {
      (window as any).openedUrls = [];
      const originalOpen = window.open;
      window.open = (url: string) => {
        (window as any).openedUrls.push(url);
        return null;
      };
    });

    await page.goto('/agendar');
    // ... fluxo completo de agendamento ...

    // Verificar que WhatsApp foi chamado
    const openedUrls = await page.evaluate(() => (window as any).openedUrls);
    expect(openedUrls.some((url: string) => url.includes('wa.me'))).toBeTruthy();
  });
});

test.describe('Skeleton Loading', () => {
  test('Skeleton aparece durante carregamento', async ({ page }) => {
    // Interceptar requests para simular delay
    await page.route('**/rest/v1/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/admin');

    // Verificar que skeleton aparece
    await expect(page.locator('[data-testid="skeleton"]')).toBeVisible();

    // Esperar carregamento completar
    await expect(page.locator('[data-testid="skeleton"]')).not.toBeVisible({ timeout: 10000 });
  });
});
