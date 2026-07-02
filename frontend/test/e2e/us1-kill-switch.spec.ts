/**
 * E2E US1 — kill switch redirige a /kill-switch-activo (T056).
 *
 * Cuando el admin activa el kill switch, `GET /system/status` devuelve
 * `appointmentsDisabled=true` y el server-side de /agendar redirige a
 * /kill-switch-activo (SC-005 + FR-023). Este test verifica el ciclo completo:
 *  1. Activar kill switch como admin.
 *  2. Intentar entrar a /agendar y comprobar redirect.
 *  3. Desactivar kill switch y comprobar que /agendar vuelve a servir el wizard.
 */
import { test, expect } from '@playwright/test';
import { loginAdmin, setKillSwitch } from './helpers';

test.describe('US1 — kill switch redirect', () => {
  test('con kill switch activo, /agendar redirige a /kill-switch-activo', async ({ page }) => {
    const auth = await loginAdmin();
    await setKillSwitch(auth, true);
    try {
      await page.goto('/agendar');
      await expect(page).toHaveURL(/kill-switch-activo/);
      await expect(page.getByRole('heading', { name: /agendamiento temporalmente/i })).toBeVisible();
    } finally {
      await setKillSwitch(auth, false);
    }
  });

  test('con kill switch desactivado, /agendar sirve el wizard', async ({ page }) => {
    const auth = await loginAdmin();
    await setKillSwitch(auth, false);
    await page.goto('/agendar');
    await expect(page).toHaveURL(/\/agendar/);
    await expect(page.getByRole('heading', { name: /antes de continuar/i })).toBeVisible();
  });
});
