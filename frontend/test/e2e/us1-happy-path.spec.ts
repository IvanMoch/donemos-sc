/**
 * E2E US1 — happy path completo de agendamiento (T054).
 *
 * Regla dura: el flujo entero, desde landing hasta pantalla de confirmación,
 * debe cerrarse en <90 segundos con emulación Pixel 5 (SC-007). Ese es el
 * criterio de éxito comercial del MVP. El test lo mide con performance.now().
 *
 * Setup: crea un slot con cupo mediante la API admin antes del test.
 * Teardown: nada — la cita queda persistida; el job de retención la limpia.
 */
import { test, expect } from '@playwright/test';
import { ensureAvailableSlot, loginAdmin, setKillSwitch, uniqueIdNumber } from './helpers';

test.describe('US1 — happy path <90s', () => {
  test.beforeAll(async () => {
    const auth = await loginAdmin();
    await setKillSwitch(auth, false);
    await ensureAvailableSlot(auth);
  });

  test('agendar cita desde landing hasta success en menos de 90 s', async ({ page }) => {
    const idNumber = uniqueIdNumber();

    const t0 = Date.now();

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /agenda tu cita/i })).toBeVisible();

    await page.getByRole('link', { name: /agendar cita ahora/i }).click();
    await expect(page.getByRole('heading', { name: /antes de continuar/i })).toBeVisible();

    // Paso 1: intro + checkbox de auto-declaración (FR-011).
    await page.getByRole('checkbox', { name: /declaro que cumplo/i }).check();
    await page.getByRole('button', { name: /siguiente/i }).click();

    // Paso 2: elegir slot (el primero disponible).
    await expect(page.getByRole('heading', { name: /elige tu horario/i })).toBeVisible();
    const radios = page.getByRole('radio');
    await expect(radios.first()).toBeVisible();
    await radios.first().check();
    await page.getByRole('button', { name: /siguiente/i }).click();

    // Paso 3: datos personales.
    await expect(page.getByRole('heading', { name: /tus datos/i })).toBeVisible();
    await page.getByLabel(/nombre/i).first().fill('Ana');
    await page.getByLabel(/apellido/i).fill('Barreras');
    await page.getByLabel(/cédula/i).fill(idNumber);
    await page.getByLabel(/cédula/i).blur();
    await page.getByRole('button', { name: /siguiente/i }).click();

    // Paso 4: confirmar.
    await expect(page.getByRole('heading', { name: /revisar y confirmar/i })).toBeVisible();
    await page.getByRole('button', { name: /confirmar cita/i }).click();

    // Éxito: código visible.
    await expect(page.getByRole('heading', { name: /gracias/i })).toBeVisible({ timeout: 10_000 });
    const codigo = await page.locator('.font-mono').first().textContent();
    expect(codigo?.trim().length).toBe(10);

    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(90_000);
  });
});
