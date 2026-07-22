import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const AUTH_FILE = 'e2e/.auth/admin.json';
const hasAuth = existsSync(AUTH_FILE);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  snapshotDir: './e2e/__snapshots__',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    },
  },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(hasAuth ? { storageState: AUTH_FILE } : {}),
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        ...(hasAuth ? { storageState: AUTH_FILE } : {}),
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        ...(hasAuth ? { storageState: AUTH_FILE } : {}),
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        ...(hasAuth ? { storageState: AUTH_FILE } : {}),
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        ...(hasAuth ? { storageState: AUTH_FILE } : {}),
      },
    },
  ],
  webServer: {
    command: process.env.CI ? 'npm run preview -- --port 4173' : 'npm run dev',
    url: process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
