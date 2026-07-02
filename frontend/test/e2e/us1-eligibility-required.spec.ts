/**
 * E2E US1 — checkbox de auto-declaración obligatorio (T055).
 *
 * FR-011: sin marcar el checkbox del paso 1, el botón "Siguiente" no puede
 * avanzar al paso 2. Es el gate legal/clínico del sistema.
 */
import { test, expect } from '@playwright/test';

test('el botón Siguiente queda deshabilitado en paso 1 si no se marca el checkbox', async ({
  page,
}) => {
  await page.goto('/agendar');
  await expect(page.getByRole('heading', { name: /antes de continuar/i })).toBeVisible();

  const siguiente = page.getByRole('button', { name: /siguiente/i });
  await expect(siguiente).toBeDisabled();

  // Al marcar el checkbox, se habilita.
  await page.getByRole('checkbox', { name: /declaro que cumplo/i }).check();
  await expect(siguiente).toBeEnabled();

  // Al desmarcarlo, se vuelve a deshabilitar.
  await page.getByRole('checkbox', { name: /declaro que cumplo/i }).uncheck();
  await expect(siguiente).toBeDisabled();
});
