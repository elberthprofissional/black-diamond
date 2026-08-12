import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const isLocal = BASE_URL.includes('localhost');

// Testes de login rodam SEM sessão salva (storage limpo), pois fazem login
// explícito. Testes logados (dashboard, clientes, navegação) usam o
// storageState gerado pelo auth.setup.
//
// ORDEM IMPORTANTE: o teste de logout roda POR ÚLTIMO. O signOut do Supabase
// usa escopo global e revoga TODAS as sessões do usuário no servidor — se
// rodasse em paralelo com os testes de sessão, derrubaria a sessão deles no
// meio (403 session_not_found → redirect para login → falhas aleatórias).
const CLEAN_STORAGE = { cookies: [], origins: [] };

// Serial: o teste de logout revoga TODAS as sessões do usuário (signOut global
// do Supabase). Executando em ordem (sessões → logout → rate-limit), o logout
// não derruba a sessão compartilhada dos testes de sessão que rodam antes dele.
test.describe.configure({ mode: 'serial' });

test.describe('Admin - Login/Logout', () => {
  test.describe('(sem sessão)', () => {
    test.use({ storageState: CLEAN_STORAGE });

    test('login com credenciais inválidas', async ({ page }) => {
      await page.goto('/admin/login');

      await page.fill('[data-testid="input-email"]', 'wrong@email.com');
      await page.fill('[data-testid="input-password"]', 'wrongpassword');
      await page.click('[data-testid="btn-login"]');

      await expect(
        page
          .locator('text=incorretos')
          .or(page.locator('text=Conta bloqueada'))
          .or(page.locator('text=Muitas tentativas'))
          .or(page.locator('text=Erro'))
      ).toBeVisible({ timeout: 15000 });
    });

    test('login com campos vazios mostra erro', async ({ page }) => {
      await page.goto('/admin/login');
      await page.click('[data-testid="btn-login"]');
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  });
});

test.describe('Admin - Dashboard (com sessão)', () => {
  test('dashboard carrega com agendamentos', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'ADMIN_EMAIL and ADMIN_PASSWORD env vars required');
    test.skip(isLocal, 'Login requires live Supabase connection');

    // Já logado via storageState do auth.setup
    await page.goto('/admin');
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    await expect(page.locator('h1:has-text("Agenda do Dia")')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin - Clientes (com sessão)', () => {
  test('pode visualizar lista de clientes', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'ADMIN_EMAIL and ADMIN_PASSWORD env vars required');
    test.skip(isLocal, 'Login requires live Supabase connection');

    await page.goto('/admin/clients');
    await page.waitForURL(/\/admin\/clients/, { timeout: 15000 });
    await expect(page.locator('h1:has-text("Clientes")')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin - Navegação (com sessão)', () => {
  test('pode navegar entre todas as páginas admin', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'ADMIN_EMAIL and ADMIN_PASSWORD env vars required');
    test.skip(isLocal, 'Login requires live Supabase connection');

    await page.goto('/admin');
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin/);

    // O sidebar renderiza 2 variantes (owner e não-owner) mas apenas uma é
    // visível por vez; usamos .last() (a que está por cima) e force para
    // evitar interceptação de overlay do conteúdo principal.
    await page.locator('aside [data-testid="nav-today"]').last().click({ force: true });
    await expect(page).toHaveURL(/\/admin/);

    await page.locator('aside [data-testid="nav-weekly"]').last().click({ force: true });
    await expect(page).toHaveURL(/\/admin\/weekly/);

    await page.locator('aside [data-testid="nav-clients"]').last().click({ force: true });
    await expect(page).toHaveURL(/\/admin\/clients/);

    await page.locator('aside [data-testid="nav-reports"]').last().click({ force: true });
    await expect(page).toHaveURL(/\/admin\/reports/);
  });
});

// LOGOUT — roda DEPOIS dos testes de sessão e ANTES do Rate Limiting (que
// bloqueia o IP por 15 min). O signOut global do Supabase revoga todas as
// sessões do usuário, então usa login explícito próprio (storage limpo).
test.describe('Admin - Logout', () => {
  test.use({ storageState: CLEAN_STORAGE });

  test('logout funciona corretamente', async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'ADMIN_EMAIL and ADMIN_PASSWORD env vars required');
    test.skip(isLocal, 'Login requires live Supabase connection');

    // Login explícito próprio (storage limpo).
    await page.goto('/admin/login');
    await page.fill('[data-testid="input-email"]', ADMIN_EMAIL);
    await page.fill('[data-testid="input-password"]', ADMIN_PASSWORD);
    await page.click('[data-testid="btn-login"]');
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });

    // Abre o menu do perfil no SIDEBAR (desktop). Há 2 botões com aria-haspopup
    // no aside (NotificationBell + perfil); o de perfil é o último. Force evita
    // interceptação de overlay do conteúdo principal.
    const profileBtn = page.locator('aside button[aria-haspopup="true"]').last();
    await profileBtn.click({ force: true });

    // Aguarda a animação do dropdown (150ms) terminar — clicar durante o
    // motion desloca o centro do botão e o force click erra o alvo.
    await page.waitForTimeout(500);
    await page.click('[data-testid="btn-logout"]', { force: true });

    // Confirma a saída no modal de confirmação
    await page.click('[role="dialog"] button:has-text("Sair")');

    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10000 });
  });
});

test.describe('Admin - Rate Limiting', () => {
  // Roda por ÚLTIMO entre os testes que usam login: o bloqueio de 5 tentativas
  // (por IP, 15 min) não pode derrubar o login explícito do teste de logout.
  test.describe('(sem sessão)', () => {
    test.use({ storageState: CLEAN_STORAGE });

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
});

test.describe('Admin - Proteção de Rotas', () => {
  test.describe('(sem sessão)', () => {
    test.use({ storageState: CLEAN_STORAGE });

    test('redireciona para login quando não autenticado', async ({ page }) => {
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10000 });
    });

    test('redireciona para login ao acessar rotas protegidas diretamente', async ({ page }) => {
      const protectedRoutes = ['/admin/weekly', '/admin/clients', '/admin/profile'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10000 });
      }
    });
  });
});

test.describe('Admin - Esqueci a Senha', () => {
  test.describe('(sem sessão)', () => {
    test.use({ storageState: CLEAN_STORAGE });

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
});
