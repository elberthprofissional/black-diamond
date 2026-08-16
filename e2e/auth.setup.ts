import { test as setup } from '@playwright/test';
import { writeFileSync } from 'fs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const authFile = 'e2e/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  // Os projetos de browser dependem deste setup e referenciam o arquivo de
  // storageState. Por isso o arquivo é SEMPRE materializado — mesmo quando o
  // setup é pulado (localhost/CI), os testes de sessão rodam com storage vazio
  // e fazem skip próprio (test.skip(isLocal)).
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || BASE_URL.includes('localhost')) {
    writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    setup.skip();
    return;
  }

  await page.goto('/admin/login');
  await page.fill('[data-testid="input-email"]', ADMIN_EMAIL);
  await page.fill('[data-testid="input-password"]', ADMIN_PASSWORD);
  await page.click('[data-testid="btn-login"]');
  await page.waitForURL('/admin', { timeout: 15000 });

  await page.context().storageState({ path: authFile });
});
