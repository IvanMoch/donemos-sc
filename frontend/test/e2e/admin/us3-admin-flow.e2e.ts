/**
 * E2E US3 — flujo admin completo (T119).
 *
 * Cubre desde login → panel → crear franja → listar citas → descargar PDF →
 * activar/desactivar kill switch. Corre en el proyecto `desktop` de Playwright
 * (el panel administrativo puede asumir viewport grande).
 */
import { test, expect } from '@playwright/test';
import { ADMIN_USERNAME, ADMIN_PASSWORD, loginAdmin, setKillSwitch } from '../helpers';

test.describe('US3 — flujo administrativo completo', () => {
  test.beforeAll(async () => {
    const auth = await loginAdmin();
    await setKillSwitch(auth, false);
  });

  test('login → crear franja → listar citas → PDF → kill switch on/off', async ({ page }) => {
    // 1. Login
    await page.goto('/admin/login');
    await page.getByLabel(/usuario/i).fill(ADMIN_USERNAME);
    await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Redirect a /admin/panel
    await expect(page).toHaveURL(/\/admin\/panel/);
    await expect(page.getByRole('heading', { name: /estado del sistema/i })).toBeVisible();

    // 2. Navegar a Franjas
    await page.getByRole('link', { name: /franjas horarias/i }).click();
    await expect(page.getByRole('heading', { name: /^franjas horarias$/i })).toBeVisible();

    // Crear una franja para pasado mañana
    const pasado = new Date();
    pasado.setDate(pasado.getDate() + 2);
    const fecha = pasado.toISOString().slice(0, 10);
    const dow = pasado.getDay();
    const excep = dow === 0 || dow === 6;

    await page.getByLabel(/^fecha$/i).fill(fecha);
    await page.getByLabel(/^inicio$/i).fill('09:00');
    await page.getByLabel(/^fin$/i).fill('09:35');
    await page.getByLabel(/capacidad/i).fill('5');
    if (excep) {
      await page.getByRole('checkbox', { name: /fuera de l–v 7–12/i }).check();
    }
    await page.getByRole('button', { name: /^crear franja$/i }).click();

    // La tabla debe reflejarla
    await expect(page.getByRole('cell', { name: /09:00.*09:35/ })).toBeVisible({ timeout: 5_000 });

    // 3. Navegar a Citas y verificar que el botón PDF exista
    await page.getByRole('link', { name: /^citas$/i }).click();
    await expect(page.getByRole('heading', { name: /^citas$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /descargar pdf/i })).toBeVisible();

    // 4. Volver al panel y activar kill switch
    await page.getByRole('link', { name: /estado del sistema/i }).click();
    await page.getByRole('button', { name: /cerrar agendamiento/i }).click();
    await page.getByRole('button', { name: /sí, cerrar/i }).click();
    await expect(page.getByRole('heading', { name: /agendamiento cerrado/i })).toBeVisible();

    // Reabrir
    await page.getByRole('button', { name: /reabrir agendamiento/i }).click();
    await page.getByRole('button', { name: /sí, reabrir/i }).click();
    await expect(page.getByRole('heading', { name: /agendamiento abierto/i })).toBeVisible();
  });
});
