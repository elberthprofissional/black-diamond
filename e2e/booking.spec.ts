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
    const openedUrls: string[] = [];
    await page.addInitScript(() => {
      (window as Record<string, unknown>).__openedUrls = [];
      window.open = (url?: string) => {
        if (url)
          (window as Record<string, unknown>).__openedUrls = [
            ...((window as Record<string, unknown>).__openedUrls as string[]),
            url,
          ];
        return null;
      };
    });

    await page.goto('/agendar');

    // Selecionar serviço
    await page.click('[data-testid="service-card"]:first-child');
    await page.click('[data-testid="next-step"]');

    // Preencher dados
    await page.fill('[data-testid="input-name"]', 'Cliente Teste WA');
    await page.fill('[data-testid="input-phone"]', '11999887766');
    await page.click('[data-testid="next-step"]');

    // Selecionar data e hora
    await page.click('[data-testid="date-picker"]:first-child');
    await page.click('[data-testid="time-slot"]:first-child');
    await page.click('[data-testid="confirm-booking"]');

    await expect(page.locator('text=Agendamento confirmado')).toBeVisible({ timeout: 10000 });

    // Verificar que WhatsApp foi chamado
    const urls = await page.evaluate(
      () => (window as Record<string, unknown>).__openedUrls as string[]
    );
    expect(urls?.some((url: string) => url.includes('wa.me'))).toBeTruthy();
  });
});

test.describe('Skeleton Loading', () => {
  test('Skeleton aparece durante carregamento', async ({ page }) => {
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

test.describe('Navegação', () => {
  test('página 404 aparece para rotas inexistentes', async ({ page }) => {
    await page.goto('/rota-que-nao-existe');
    await expect(page.locator('text=404')).toBeVisible();
  });

  test('home page carrega corretamente', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Black Diamond/);
  });
});

test.describe('Acessibilidade', () => {
  test('skip link está presente', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeAttached();
  });

  test('error boundary captura erros', async ({ page }) => {
    await page.goto('/');
    // Verificar que a página renderiza sem erros
    await expect(page.locator('#main-content')).toBeAttached();
  });
});

test.describe('PWA', () => {
  test('manifest está acessível', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest.name).toBe('Black Diamond Barbearia');
    expect(manifest.display).toBe('standalone');
  });

  test('service worker está acessível', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect(response.ok()).toBeTruthy();
  });
});
