/**
 * Test del generador del código de cita (T031). Rojo antes de la implementación.
 * Reutiliza el alfabeto/regex del contrato compartido para no divergir.
 */
import { appointmentCodeSchema } from '@donemos/shared';
import { generateAppointmentCode } from './appointment-code';

describe('generateAppointmentCode', () => {
  it('genera un código de 10 caracteres del alfabeto sin ambigüedades', () => {
    const code = generateAppointmentCode();
    expect(code).toHaveLength(10);
    expect(() => appointmentCodeSchema.parse(code)).not.toThrow();
  });

  it('no usa caracteres ambiguos (I, O, 0, 1)', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateAppointmentCode()).not.toMatch(/[IO01]/);
    }
  });

  it('produce códigos distintos en llamadas sucesivas', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateAppointmentCode()));
    expect(codes.size).toBe(100);
  });
});
