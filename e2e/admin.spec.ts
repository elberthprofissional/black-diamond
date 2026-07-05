import { test, expect } from '@playwright/test';

test.describe('Admin - Login/Logout', () => {
  test('login com credenciais inválidas', async ({ page }) => {
    await page.goto('/admin/login');

    await page.fill('[data-testid="input-email"]', 'wrong@email.com');
    await page.fill('[data-testid="input-password"]', 'wrongpassword');
    await page.click('[data-testid="btn-login"]');

    await expect(page.locator('text=E-mail ou senha incorretos')).toBeVisible();
  });

  test('logout funciona corretamente', async ({ page }) => {
    // Login primeiro
    await page.goto('/admin/login');
    await page.fill('[data-testid="input-email"]', process.env.VITE_ADMIN_EMAIL || '');
    await page.fill('[data-testid="input-password"]', process.env.VITE_ADMIN_PASSWORD || '');
    await page.click('[data-testid="btn-login"]');

    await page.waitForURL('/admin');

    // Clicar no botão de logout
    await page.click('[data-testid="btn-logout"]');

    // Verificar redirecionamento para login
    await expect(page).toHaveURL('/admin/login');
  });
});

test.describe('Admin - Dashboard', () => {
  test('dashboard carrega com agendamentos', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="input-email"]', process.env.VITE_ADMIN_EMAIL || '');
    await page.fill('[data-testid="input-password"]', process.env.VITE_ADMIN_PASSWORD || '');
    await page.click('[data-testid="btn-login"]');

    await page.waitForURL('/admin');

    // Verificar que o dashboard carregou
    await expect(page.locator('text=Agenda do Dia')).toBeVisible();
  });
});

test.describe('Admin - Clientes', () => {
  test('pode visualizar lista de clientes', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="input-email"]', process.env.VITE_ADMIN_EMAIL || '');
    await page.fill('[data-testid="input-password"]', process.env.VITE_ADMIN_PASSWORD || '');
    await page.click('[data-testid="btn-login"]');

    await page.waitForURL('/admin');

    // Navegar para clientes
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

    // Após 5 tentativas, deve mostrar mensagem de bloqueio
    await expect(page.locator('text=Bloqueado')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin - Navegação', () => {
  test('pode navegar entre todas as páginas admin', async ({ page }) => {
    // Login
    await page.goto('/admin/login');
    await page.fill('[data-testid="input-email"]', process.env.VITE_ADMIN_EMAIL || '');
    await page.fill('[data-testid="input-password"]', process.env.VITE_ADMIN_PASSWORD || '');
    await page.click('[data-testid="btn-login"]');
    await page.waitForURL('/admin');

    // Dashboard
    await expect(page).toHaveURL('/admin');

    // Navegar para Weekly
    await page.click('[data-testid="nav-weekly"]');
    await expect(page).toHaveURL('/admin/weekly');

    // Navegar para Clients
    await page.click('[data-testid="nav-clients"]');
    await expect(page).toHaveURL('/admin/clients');

    // Navegar para Profile
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
    await page.goto('/admin/weekly');
    await expect(page).toHaveURL('/admin/login', { timeout: 10000 });

    await page.goto('/admin/clients');
    await expect(page).toHaveURL('/admin/login', { timeout: 10000 });

    await page.goto('/admin/profile');
    await expect(page).toHaveURL('/admin/login', { timeout: 10000 });
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

    // Fechar
    await page.click('[aria-label="Fechar"]');
    await expect(page.locator('text=Encontre sua conta')).not.toBeVisible();
  });
});
