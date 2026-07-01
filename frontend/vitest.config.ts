/**
 * Configuración Vitest para el frontend de DonemosSC.
 *
 * Alcance: componentes React de las islas (wizard US1, consulta US2, panel US3)
 * y utilidades TS del frontend. Los E2E van por Playwright (playwright.config.ts).
 *
 * jsdom para simular DOM sin cargar Chromium; @testing-library/jest-dom añade
 * los matchers accesibles (toBeInTheDocument, toHaveAccessibleName, etc.) que
 * apoyan las verificaciones AAA del Principio III.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@donemos/shared': fileURLToPath(new URL('../packages/shared/src/index.ts', import.meta.url)),
      '@/': fileURLToPath(new URL('./src/', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.astro', 'test/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/*.config.{ts,js,mjs}', 'dist/**', '.astro/**'],
    },
  },
});
