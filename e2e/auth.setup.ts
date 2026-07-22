import { test as setup } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const authFile = 'e2e/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'ADMIN_EMAIL and ADMIN_PASSWORD env vars required');
  test.skip(BASE_URL.includes('localhost'), 'Auth setup requires live Supabase connection');

  await page.goto('/admin/login');
  await page.fill('[data-testid="input-email"]', ADMIN_EMAIL);
  await page.fill('[data-testid="input-password"]', ADMIN_PASSWORD);
  await page.click('[data-testid="btn-login"]');
  await page.waitForURL('/admin', { timeout: 15000 });

  await page.context().storageState({ path: authFile });
});
