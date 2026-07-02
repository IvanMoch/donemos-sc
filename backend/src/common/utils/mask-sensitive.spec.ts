/**
 * Test del enmascarado PII (T142).
 */
import { maskSensitive } from './mask-sensitive';

describe('maskSensitive', () => {
  it('enmascara nombre, apellido y cédula, conservando el resto', () => {
    expect(maskSensitive({ firstName: 'Ana', lastName: 'Pérez', idNumber: 'V12345678', slotId: 'x' })).toEqual({
      firstName: '***',
      lastName: '***',
      idNumber: '***',
      slotId: 'x',
    });
  });

  it('tolera cuerpos no-objeto', () => {
    expect(maskSensitive(undefined)).toBeUndefined();
    expect(maskSensitive('texto')).toBe('texto');
    expect(maskSensitive(null)).toBeNull();
  });
});
