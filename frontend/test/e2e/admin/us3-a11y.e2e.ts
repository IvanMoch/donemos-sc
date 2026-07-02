/**
 * E2E US3 — accesibilidad AAA en las páginas del panel admin (T120).
 *
 * Auth compartida vía cookie de sesión inyectada en el BrowserContext
 * (`authenticateAdmin`) — evita golpear el throttle 5/min del login cuando
 * varios tests corren en paralelo.
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { authenticateAdmin, loginAdmin, setKillSwitch } from '../helpers';

const AAA_TAGS = ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag21aaa'];

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

  test('/admin/panel pasa axe AAA', async ({ page, context }) => {
    await authenticateAdmin(context);
    await page.goto('/admin/panel');
    await page.getByRole('heading', { name: /estado del sistema/i }).waitFor();
    const results = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('/admin/franjas pasa axe AAA', async ({ page, context }) => {
    await authenticateAdmin(context);
    await page.goto('/admin/franjas');
    await page.getByRole('heading', { name: /^franjas horarias$/i }).waitFor();
    const results = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test('/admin/citas pasa axe AAA', async ({ page, context }) => {
    await authenticateAdmin(context);
    await page.goto('/admin/citas');
    await page.getByRole('heading', { name: /^citas$/i }).waitFor();
    const results = await new AxeBuilder({ page }).withTags(AAA_TAGS).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
