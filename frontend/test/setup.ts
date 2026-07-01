// Setup global para tests de Vitest (componentes React del frontend).
// Añade los matchers de @testing-library/jest-dom a expect y limpia el DOM
// entre tests para evitar acoplamiento oculto entre casos.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
