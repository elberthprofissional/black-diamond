import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const AUTH_FILE = 'e2e/.auth/admin.json';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  snapshotDir: './e2e/__snapshots__',
  // Timeout maior que o padrão (5s): WebKit (Windows) demora pra carregar
  // Google Fonts e o screenshot estoura de forma intermitente.
  expect: {
    timeout: 15000,
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
  // Todos os projetos de browser dependem do auth-setup: assim o storageState
  // é SEMPRE gerado antes de qualquer teste rodar (e o arquivo é sempre
  // materializado pelo setup, mesmo quando ele é pulado em localhost — ver
  // e2e/auth.setup.ts). Antes, `hasAuth` era calculado no load da config e, em
  // checkout fresco (e2e/.auth é gitignored), os testes de sessão rodavam sem
  // a sessão e falhavam no primeiro run.
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
        storageState: AUTH_FILE,
      },
      dependencies: ['auth-setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: AUTH_FILE,
      },
      dependencies: ['auth-setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: AUTH_FILE,
      },
      dependencies: ['auth-setup'],
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: AUTH_FILE,
      },
      dependencies: ['auth-setup'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
        storageState: AUTH_FILE,
      },
      dependencies: ['auth-setup'],
    },
  ],
  webServer: {
    command: process.env.CI ? 'npm run preview -- --port 4173' : 'npm run dev',
    url: process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
