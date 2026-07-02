// Setup global para tests de Vitest (componentes React del frontend).
// Añade los matchers de @testing-library/jest-dom + vitest-axe a expect y
// limpia el DOM entre tests para evitar acoplamiento oculto entre casos.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
import * as matchers from 'vitest-axe/matchers';

// vitest-axe expone sus matchers como módulo separado; el auto-registro no
// existe, hay que llamar expect.extend explícitamente. Después de esta línea
// `expect(results).toHaveNoViolations()` funciona en cualquier test.
expect.extend(matchers as never);

afterEach(() => {
  cleanup();
});
