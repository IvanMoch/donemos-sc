/**
 * E2E US3 — accesibilidad AAA en las páginas del panel admin (T120).
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { ADMIN_USERNAME, ADMIN_PASSWORD, loginAdmin, setKillSwitch } from '../helpers';

const AAA_TAGS = ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag21aaa'];

async function loginUI(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel(/usuario/i).fill(ADMIN_USERNAME);
  await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await page.waitForURL(/\/admin\/panel/);
}

test.describe('US3 — a11y AAA del panel admin', () => {
  test.beforeAll(async () => {
    const auth = await loginAdmin();
    await setKillSwitch(auth, false);
  });

  test('/admin/login pasa axe AAA', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByRole('heading', { name: /iniciar sesión/i }).waitFor();
    const results = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('/admin/panel pasa axe AAA', async ({ page }) => {
    await loginUI(page);
    await page.getByRole('heading', { name: /estado del sistema/i }).waitFor();
    const results = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('/admin/franjas pasa axe AAA', async ({ page }) => {
    await loginUI(page);
    await page.goto('/admin/franjas');
    await page.getByRole('heading', { name: /^franjas horarias$/i }).waitFor();
    const results = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test('/admin/citas pasa axe AAA', async ({ page }) => {
    await loginUI(page);
    await page.goto('/admin/citas');
    await page.getByRole('heading', { name: /^citas$/i }).waitFor();
    const results = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
});
