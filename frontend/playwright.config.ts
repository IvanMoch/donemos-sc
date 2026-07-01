/**
 * Configuración Playwright para los E2E de DonemosSC.
 *
 * Device por defecto: Pixel 5 (360×800) — obligatorio por Principio VIII (mobile-first)
 * y por el objetivo de Lighthouse mobile ≥ 90 declarado en plan.md § Performance Goals.
 * El proyecto `desktop` cubre el panel administrativo (US3), que sí puede asumir viewport
 * grande.
 *
 * En CI usamos `PLAYWRIGHT_BASE_URL` para poder apuntar al preview build; en local
 * asumimos `astro dev` en el puerto 4321.
 */
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4321';

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-VE',
    timezoneId: 'America/Caracas',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /admin\/.*\.e2e\.ts/,
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
