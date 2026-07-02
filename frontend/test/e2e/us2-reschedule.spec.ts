/**
 * E2E US2 — reagendamiento (T094).
 *
 * Precondiciones:
 *  - Kill switch desactivado.
 *  - Dos slots con cupo (uno usado por la cita inicial, el otro destino del reschedule).
 * El test verifica:
 *  - Cambio de horario preserva el código.
 *  - Se muestra pantalla de "Cita reagendada" con el nuevo horario.
 */
import { test, expect } from '@playwright/test';
import {
  createAppointment,
  createSlot,
  ensureAvailableSlot,
  loginAdmin,
  setKillSwitch,
} from './helpers';

test.describe('US2 — reagendamiento', () => {
  test('donante puede reagendar y el código se conserva', async ({ page }) => {
    const auth = await loginAdmin();
    await setKillSwitch(auth, false);

    const slot1 = await ensureAvailableSlot(auth);
    // Crear un segundo slot en un horario distinto (mañana + 1 hora).
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fecha = manana.toISOString().slice(0, 10);
    const dow = manana.getDay();
    const excep = dow === 0 || dow === 6;
    await createSlot(auth, {
      date: fecha,
      startTime: '08:00',
      endTime: '08:35',
      capacity: 5,
      isExceptionHours: excep,
    });

    const { code, idNumber } = await createAppointment(slot1.id);

    await page.goto('/consultar');
    await page.getByLabel(/cédula/i).fill(idNumber);
    await page.getByLabel(/código de cita/i).fill(code);
    await page.getByRole('button', { name: /consultar cita/i }).click();

    await expect(page.getByRole('heading', { name: /tu cita/i })).toBeVisible();
    await page.getByRole('button', { name: /reagendar/i }).click();

    await expect(page.getByRole('heading', { name: /elegir nuevo horario/i })).toBeVisible();
    const radios = page.getByRole('radio');
    await expect(radios.first()).toBeVisible();
    await radios.first().check();
    await page.getByRole('button', { name: /confirmar nuevo horario/i }).click();

    await expect(page.getByRole('heading', { name: /cita reagendada/i })).toBeVisible({
      timeout: 10_000,
    });
    // El código se conserva.
    await expect(page.getByText(code)).toBeVisible();
  });
});
