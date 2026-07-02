/**
 * Test del normalizador de cédula (T032). Rojo antes de la implementación.
 */
import { normalizeIdNumber } from './id-number';

describe('normalizeIdNumber', () => {
  it('pasa a mayúsculas', () => {
    expect(normalizeIdNumber('v12345678')).toBe('V12345678');
  });

  it('elimina guiones', () => {
    expect(normalizeIdNumber('V-12345678')).toBe('V12345678');
  });

  it('recorta espacios en los extremos', () => {
    expect(normalizeIdNumber('  e1234567  ')).toBe('E1234567');
  });

  it('combina las tres normalizaciones', () => {
    expect(normalizeIdNumber(' v-12345678 ')).toBe('V12345678');
  });
});
