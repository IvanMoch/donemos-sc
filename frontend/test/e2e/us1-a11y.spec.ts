/**
 * E2E US1 — accesibilidad AAA con axe-core (T057).
 *
 * Verifica landing, cada paso del wizard, la pantalla de éxito y la de
 * kill switch activo con `@axe-core/playwright` en nivel AAA. Cualquier
 * violación cierra el build (Principio III NO-NEGOCIABLE).
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { ensureAvailableSlot, loginAdmin, setKillSwitch, uniqueIdNumber } from './helpers';

const AAA_TAGS = ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag21aaa'];

test.describe('US1 — a11y AAA', () => {
  test.beforeAll(async () => {
    const auth = await loginAdmin();
    await setKillSwitch(auth, false);
    await ensureAvailableSlot(auth);
  });

  test('landing pasa axe AAA', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('heading', { name: /agenda tu cita/i }).waitFor();
    const results = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('wizard paso 1 (intro) pasa axe AAA', async ({ page }) => {
    await page.goto('/agendar');
    await page.getByRole('heading', { name: /antes de continuar/i }).waitFor();
    const results = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('wizard pasos 2-4 y success pasan axe AAA', async ({ page }) => {
    const idNumber = uniqueIdNumber();
    await page.goto('/agendar');
    await page.getByRole('checkbox', { name: /declaro que cumplo/i }).check();
    await page.getByRole('button', { name: /siguiente/i }).click();

    // Paso 2
    await page.getByRole('heading', { name: /elige tu horario/i }).waitFor();
    let r = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(r.violations).toEqual([]);
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: /siguiente/i }).click();

    // Paso 3
    await page.getByRole('heading', { name: /tus datos/i }).waitFor();
    r = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(r.violations).toEqual([]);
    await page.getByLabel(/nombre/i).first().fill('Ana');
    await page.getByLabel(/apellido/i).fill('Barreras');
    await page.getByLabel(/cédula/i).fill(idNumber);
    await page.getByLabel(/cédula/i).blur();
    await page.getByRole('button', { name: /siguiente/i }).click();

    // Paso 4
    await page.getByRole('heading', { name: /revisar y confirmar/i }).waitFor();
    r = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(r.violations).toEqual([]);
    await page.getByRole('button', { name: /confirmar cita/i }).click();

    // Success
    await page.getByRole('heading', { name: /gracias/i }).waitFor();
    r = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(r.violations).toEqual([]);
  });

  test('página kill-switch-activo pasa axe AAA', async ({ page }) => {
    await page.goto('/kill-switch-activo');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
});
