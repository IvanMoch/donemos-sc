/**
 * Configuración Vitest de @donemos/shared.
 *
 * El paquete compartido define el contrato Zod entre backend y frontend
 * (Principio II). Sus tests corren aislados aquí (no dependen del DOM) y se
 * incluyen en `pnpm -r test`. Node como entorno: son validaciones puras.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
