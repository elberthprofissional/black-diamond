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
