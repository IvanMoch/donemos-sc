/**
 * E2E US2 — accesibilidad AAA en /consultar (T095).
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { createAppointment, ensureAvailableSlot, loginAdmin, setKillSwitch } from './helpers';

const AAA_TAGS = ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag21aaa'];

test.describe('US2 — a11y AAA', () => {
  test('/consultar (formulario) pasa axe AAA', async ({ page }) => {
    await page.goto('/consultar');
    await page.getByRole('heading', { name: /consultar mi cita/i }).waitFor();
    const results = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('/consultar (detalle de cita) pasa axe AAA', async ({ page }) => {
    const auth = await loginAdmin();
    await setKillSwitch(auth, false);
    const slot = await ensureAvailableSlot(auth);
    const { code, idNumber } = await createAppointment(slot.id);

    await page.goto('/consultar');
    await page.getByLabel(/cédula/i).fill(idNumber);
    await page.getByLabel(/código de cita/i).fill(code);
    await page.getByRole('button', { name: /consultar cita/i }).click();
    await page.getByRole('heading', { name: /tu cita/i }).waitFor();

    const results = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
});
