/**
 * E2E US2 — consulta + cancelación (T093).
 *
 * Precondición: existe una cita activa creada vía API. El test la busca por
 * cédula + código y presiona "Cancelar cita". La respuesta debe mostrar el
 * estado "Cancelada por ti".
 */
import { test, expect } from '@playwright/test';
import { createAppointment, ensureAvailableSlot, loginAdmin, setKillSwitch } from './helpers';

test.describe('US2 — cancelación de cita', () => {
  test('donante puede consultar y cancelar su cita', async ({ page }) => {
    const auth = await loginAdmin();
    await setKillSwitch(auth, false);
    const slot = await ensureAvailableSlot(auth);
    const { code, idNumber } = await createAppointment(slot.id);

    await page.goto('/consultar');
    await expect(page.getByRole('heading', { name: /consultar mi cita/i })).toBeVisible();

    await page.getByLabel(/cédula/i).fill(idNumber);
    await page.getByLabel(/código de cita/i).fill(code);
    await page.getByRole('button', { name: /consultar cita/i }).click();

    await expect(page.getByRole('heading', { name: /tu cita/i })).toBeVisible();
    await expect(page.getByText(/activa/i)).toBeVisible();

    await page.getByRole('button', { name: /cancelar cita/i }).click();

    await expect(page.getByText(/cancelada por ti/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /cancelar cita/i })).toHaveCount(0);
  });
});
