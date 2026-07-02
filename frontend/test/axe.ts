// Helper compartido para tests de accesibilidad con vitest-axe en jsdom.
//
// jsdom no implementa HTMLCanvasElement.getContext, por lo que la regla
// 'color-contrast' de axe explota al ejecutarla en Vitest. Los contrastes
// AAA (Principio III) se verifican de verdad en los E2E de Playwright con
// @axe-core/playwright, donde el navegador real evalúa los píxeles.
//
// En unit tests validamos el resto de axe: roles, labels, focus order,
// aria-attrs, landmarks — que es donde suelen aparecer bugs de estructura.
import { axe as rawAxe } from 'vitest-axe';

export function axeUnit(container: Element) {
  return rawAxe(container, {
    rules: {
      'color-contrast': { enabled: false },
    },
  });
}
