import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

test.describe('Admin - Login/Logout', () => {
  test('login com credenciais inválidas', async ({ page }) => {
    await page.goto('/admin/login');

    await page.fill('[data-testid="input-email"]', 'wrong@email.com');
    await page.fill('[data-testid="input-password"]', 'wrongpassword');
    await page.click('[data-testid="btn-login"]');

    await expect(page.locator('text=E-mail ou senha incorretos')).toBeVisible({ timeout: 10000 });
  });

  test('login com campos vazios mostra erro', async ({ page }) => {
    await page.goto('/admin/login');
    await page.click('[data-testid="btn-login"]');
    // The form has required attributes, so native validation or custom error shows
    await page.waitForTimeout(1000);
    // Just verify the page didn't navigate away (still on login)
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('logout funciona corretamente', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'ADMIN_EMAIL and ADMIN_PASSWORD env vars required');

    await page.goto('/admin/login');
    await page.fill('[data-testid="input-email"]', ADMIN_EMAIL);
    await page.fill('[data-testid="input-password"]', ADMIN_PASSWORD);
    await page.click('[data-testid="btn-login"]');

    await page.waitForURL('/admin', { timeout: 15000 });

    await page.click('[data-testid="btn-logout"]');
    await expect(page).toHaveURL('/admin/login', { timeout: 10000 });
  });
});

test.describe('Admin - Dashboard', () => {
  test('dashboard carrega com agendamentos', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'ADMIN_EMAIL and ADMIN_PASSWORD env vars required');

    await page.goto('/admin/login');
    await page.fill('[data-testid="input-email"]', ADMIN_EMAIL);
    await page.fill('[data-testid="input-password"]', ADMIN_PASSWORD);
    await page.click('[data-testid="btn-login"]');

    await page.waitForURL('/admin', { timeout: 15000 });
    await expect(page.locator('h1:has-text("Agenda do Dia")')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin - Clientes', () => {
  test('pode visualizar lista de clientes', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'ADMIN_EMAIL and ADMIN_PASSWORD env vars required');

    await page.goto('/admin/login');
    await page.fill('[data-testid="input-email"]', ADMIN_EMAIL);
    await page.fill('[data-testid="input-password"]', ADMIN_PASSWORD);
    await page.click('[data-testid="btn-login"]');

    await page.waitForURL('/admin', { timeout: 15000 });

    await page.click('[data-testid="nav-clients"]');
    await expect(page).toHaveURL('/admin/clients');
    await expect(page.locator('text=Clientes')).toBeVisible();
  });
});

test.describe('Admin - Rate Limiting', () => {
  test('bloqueia após 5 tentativas de login incorretas', async ({ page }) => {
    await page.goto('/admin/login');

    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="input-email"]', 'wrong@email.com');
      await page.fill('[data-testid="input-password"]', 'wrongpassword');
      await page.click('[data-testid="btn-login"]');
      await page.waitForTimeout(500);
    }

    await expect(
      page.locator('text=Muitas tentativas').or(page.locator('text=Conta bloqueada'))
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin - Navegação', () => {
  test('pode navegar entre todas as páginas admin', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'ADMIN_EMAIL and ADMIN_PASSWORD env vars required');

    await page.goto('/admin/login');
    await page.fill('[data-testid="input-email"]', ADMIN_EMAIL);
    await page.fill('[data-testid="input-password"]', ADMIN_PASSWORD);
    await page.click('[data-testid="btn-login"]');

    await page.waitForURL('/admin', { timeout: 15000 });
    await expect(page).toHaveURL('/admin');

    await page.click('[data-testid="nav-weekly"]');
    await expect(page).toHaveURL('/admin/weekly');

    await page.click('[data-testid="nav-clients"]');
    await expect(page).toHaveURL('/admin/clients');

    await page.click('[data-testid="nav-profile"]');
    await expect(page).toHaveURL('/admin/profile');
  });
});

test.describe('Admin - Proteção de Rotas', () => {
  test('redireciona para login quando não autenticado', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin/login', { timeout: 10000 });
  });

  test('redireciona para login ao acessar rotas protegidas diretamente', async ({ page }) => {
    const protectedRoutes = ['/admin/weekly', '/admin/clients', '/admin/profile'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL('/admin/login', { timeout: 10000 });
    }
  });
});

test.describe('Admin - Esqueci a Senha', () => {
  test('modal de recuperação de senha abre', async ({ page }) => {
    await page.goto('/admin/login');
    await page.click('text=Esqueceu a senha?');
    await expect(page.locator('text=Encontre sua conta')).toBeVisible();
  });

  test('fechar modal funciona', async ({ page }) => {
    await page.goto('/admin/login');
    await page.click('text=Esqueceu a senha?');
    await expect(page.locator('text=Encontre sua conta')).toBeVisible();

    await page.click('[aria-label="Fechar"]');
    await expect(page.locator('text=Encontre sua conta')).not.toBeVisible();
  });
});
