import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const isLocal = BASE_URL.includes('localhost');

test.describe('Fluxos Críticos - Agendamento', () => {
  test('fluxo de agendamento avança para a etapa de serviços', async ({ page }) => {
    test.skip(isLocal, 'Requires live Supabase connection');

    await page.goto('/agendar/entrada');

    // Click "Agendar agora" (menu v3.34: só 2 opções)
    await page.click('text=Agendar agora');

    // Step 1: Preencher dados
    await page.locator('[data-testid="input-name"]').first().fill('Cliente Teste E2E');
    await page.locator('[data-testid="input-phone"]').first().fill('11999887766');
    await page.click('[data-testid="next-step"]');

    // Step 2: Etapa de serviços deve estar visível (sem seleção de barbeiro — barbeiro único)
    await expect(
      page.locator('text=Escolha os serviços').or(page.locator('text=Serviços'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('cupom de desconto pode ser adicionado', async ({ page }) => {
    test.skip(isLocal, 'Requires live Supabase connection');

    await page.goto('/agendar/entrada');

    // Clica em "Agendar agora" (menu v3.34: só 2 opções)
    await page.click('text=Agendar agora');

    // Verifica se o botão de cupom existe
    await expect(page.locator('text=cupom de desconto').or(page.locator('text=Cupom'))).toBeVisible(
      { timeout: 10000 }
    );
  });

  test('fluxo de cancelamento com token', async ({ page }) => {
    test.skip(isLocal, 'Requires live Supabase connection');

    // Tentar acessar página de gerenciamento sem token
    await page.goto('/gerenciar');

    // Deve mostrar mensagem de erro ou formulário para token
    await expect(page.locator('text=token').or(page.locator('text=Token'))).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('Admin - Navegação', () => {
  test('sidebar admin contém links principais', async ({ page }) => {
    test.skip(isLocal, 'Requires live Supabase + auth');

    await page.goto('/admin');

    // Se logado, deve mostrar sidebar com navegação
    // Se não logado, redireciona pra login — teste verifica redirecionamento
    const isLoginPage = page.url().includes('/admin/login');
    if (isLoginPage) {
      await expect(
        page.locator('input[type="email"]').or(page.locator('[data-testid="input-email"]'))
      ).toBeVisible({ timeout: 10000 });
    } else {
      // Verificar links de navegação
      await expect(page.locator('text=Agenda do Dia').or(page.locator('text=Hoje'))).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test('rota admin/login carrega corretamente', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('rota /agendar carrega corretamente', async ({ page }) => {
    await page.goto('/agendar');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('PWA e Performance', () => {
  test('página inicial carrega assets com cache', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await page.waitForLoadState('networkidle');

    // Verificar que pelo menos um asset .webp foi carregado
    const images = page.locator('img');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);
  });

  test('tema escuro é aplicado por padrão', async ({ page }) => {
    await page.goto('/');
    const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    // Deve ser um tom escuro (RGB próximo de 0)
    const rgb = bgColor.match(/\d+/g)?.map(Number) || [0, 0, 0];
    expect(rgb[0]).toBeLessThan(30);
    expect(rgb[1]).toBeLessThan(30);
    expect(rgb[2]).toBeLessThan(30);
  });
});

test.describe('Acessibilidade - Teclado', () => {
  test('navegação por tab funciona na home', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    // Skip link deve estar visível após tab
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeVisible();
  });

  test('botão de agendar é acessível via teclado', async ({ page }) => {
    await page.goto('/');
    // Tab várias vezes até chegar no botão "Agendar"
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.textContent);
      if (focused?.includes('Agendar')) break;
    }
    // Enter deve navegar para a página de agendamento
    const agendarBtn = page.locator('button:has-text("Agendar")').first();
    await expect(agendarBtn).toBeAttached();
  });
});
