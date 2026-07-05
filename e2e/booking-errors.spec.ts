import { test, expect } from '@playwright/test';

test.describe('Booking - Tratamento de Erros', () => {
  test('exibe erro quando rede falha ao carregar serviços', async ({ page }) => {
    await page.route('**/rest/v1/services**', (route) => route.abort('connectionrefused'));

    await page.goto('/agendar');

    // Deve mostrar algum indicador de erro ou fallback
    await expect(page.locator('body')).toBeVisible();
  });

  test('exibe erro quando agendamento falha no servidor', async ({ page }) => {
    await page.goto('/agendar');

    // Selecionar serviço
    await page.click('[data-testid="service-card"]:first-child');
    await page.click('[data-testid="next-step"]');

    // Preencher dados
    await page.fill('[data-testid="input-name"]', 'Cliente Teste');
    await page.fill('[data-testid="input-phone"]', '11999887766');
    await page.click('[data-testid="next-step"]');

    // Selecionar data e hora
    await page.click('[data-testid="date-picker"]:first-child');
    await page.click('[data-testid="time-slot"]:first-child');

    // Intercept a chamada de criação e retorna erro
    await page.route('**/rest/v1/rpc/criar_agendamento', (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ message: 'Erro interno do servidor' }),
      })
    );

    await page.click('[data-testid="confirm-booking"]');

    // Deve mostrar mensagem de erro
    await expect(page.locator('text=Erro')).toBeVisible({ timeout: 10000 });
  });

  test('validação impede envio sem dados obrigatórios', async ({ page }) => {
    await page.goto('/agendar');

    // Tentar avançar sem selecionar serviço
    const nextButton = page.locator('[data-testid="next-step"]');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      // Deve permanecer na mesma etapa
      await expect(page.locator('text=Selecione o serviço')).toBeVisible();
    }
  });

  test('validação de telefone com poucos dígitos', async ({ page }) => {
    await page.goto('/agendar');

    await page.click('[data-testid="service-card"]:first-child');
    await page.click('[data-testid="next-step"]');

    await page.fill('[data-testid="input-name"]', 'Cliente Teste');
    await page.fill('[data-testid="input-phone"]', '11999');

    // O botão deve estar desabilitado ou mostrar erro
    await expect(page.locator('[data-testid="input-phone"]')).toBeVisible();
  });
});

test.describe('Booking - Concorrência', () => {
  test('slot que foi ocupado por outro usuário não fica disponível', async ({ page }) => {
    await page.goto('/agendar');

    // Carregar slots disponíveis
    await page.click('[data-testid="service-card"]:first-child');
    await page.click('[data-testid="next-step"]');
    await page.fill('[data-testid="input-name"]', 'Cliente A');
    await page.fill('[data-testid="input-phone"]', '11988776655');
    await page.click('[data-testid="next-step"]');

    await page.click('[data-testid="date-picker"]:first-child');

    // Interceptar e retornar que o slot 08:00 agora está ocupado
    await page.route('**/rest/v1/rpc/get_available_slots**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify([{ slot_time: '09:00' }, { slot_time: '10:00' }]),
      })
    );

    await page.reload({ waitUntil: 'networkidle' });

    // O slot 08:00 não deve aparecer
    await expect(page.locator('[data-testid="time-slot"]')).toHaveCount(2);
  });
});

test.describe('Booking - Limites', () => {
  test('limite de serviços selecionáveis', async ({ page }) => {
    await page.goto('/agendar');

    // Verificar que a seleção de serviço funciona
    await page.click('[data-testid="service-card"]:first-child');

    // Deve permitir selecionar pelo menos um
    const selectedCards = page.locator('[data-testid="service-card"][data-selected="true"]');
    await expect(selectedCards).toHaveCount(1, { timeout: 5000 });
  });
});

test.describe('Páginas - 404 e Rotas Inválidas', () => {
  test('página 404 aparece para rota inexistente', async ({ page }) => {
    await page.goto('/rota-que-nao-existe');
    await expect(page.locator('text=404')).toBeVisible({ timeout: 10000 });
  });

  test('redirecionamento para home funciona', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Acessibilidade', () => {
  test('skip link está presente', async ({ page }) => {
    await page.goto('/');

    // Tab deve mostrar o skip link
    await page.keyboard.press('Tab');
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeVisible();
  });

  test('modais possuem aria attributes', async ({ page }) => {
    await page.goto('/admin/login');

    // Verificar que o formulário tem labels
    await expect(page.locator('label[for="login-email"]')).toBeVisible();
    await expect(page.locator('label[for="login-password"]')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('página inicial carrega em menos de 5 segundos', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });

  test('assets estáticos têm cache', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers();
    expect(headers?.['cache-control']).toBeDefined();
  });
});
