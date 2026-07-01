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
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4321';
const isCI = !!process.env.CI;

const config: PlaywrightTestConfig = {
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
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
};

// En CI el runner arranca el preview; localmente delegamos a `astro dev`.
if (isCI) {
  config.workers = 1;
} else {
  config.webServer = {
    command: 'pnpm dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  };
}

export default defineConfig(config);
