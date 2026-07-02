/**
 * Ambient type augmentation para el matcher `toHaveNoViolations` de vitest-axe.
 *
 * vitest-axe exporta los matchers pero no los declara sobre la interfaz
 * `Assertion` de Vitest, así que `expect(results).toHaveNoViolations()` no
 * tipa sin este archivo. En runtime el matcher está registrado en test/setup.ts.
 */
import type { AxeResults } from 'axe-core';
import 'vitest';

declare module 'vitest' {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T extends AxeResults ? void : never;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
