// ABOUTME: Playwright config. Starts a dedicated API (port 4100, test DB) and Vite (port 3100); never touches port 3000/4000.
// ABOUTME: Set E2E_BASE_URL to point at an already-running web app instead; those servers are then reused, not started.
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: 'npx tsx server/index.ts',
          url: 'http://127.0.0.1:4100/api/health',
          reuseExistingServer: false,
          timeout: 60_000,
          env: { NODE_ENV: 'test', PORT: '4100' },
        },
        {
          command: 'npx vite --port 3100 --strictPort --host 127.0.0.1',
          url: baseURL,
          reuseExistingServer: false,
          timeout: 60_000,
          env: { API_PROXY_TARGET: 'http://127.0.0.1:4100' },
        },
      ],
});
