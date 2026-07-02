/**
 * Tests del esquema del código de cita (research §14, V3 de data-model.md).
 * Escritos antes de la implementación (Principio V — TDD).
 */
import { describe, expect, it } from 'vitest';
import { appointmentCodeSchema } from './appointment-code';

describe('appointmentCodeSchema', () => {
  it('acepta un código de 10 caracteres del alfabeto sin ambigüedades', () => {
    expect(appointmentCodeSchema.parse('K7P3M9XQ2R')).toBe('K7P3M9XQ2R');
  });

  it('rechaza longitudes distintas de 10', () => {
    expect(() => appointmentCodeSchema.parse('K7P3M9XQ2')).toThrow();
    expect(() => appointmentCodeSchema.parse('K7P3M9XQ2RR')).toThrow();
  });

  it('rechaza caracteres ambiguos excluidos del alfabeto (I, O, 0, 1)', () => {
    expect(() => appointmentCodeSchema.parse('K7P3M9XQ2I')).toThrow();
    expect(() => appointmentCodeSchema.parse('K7P3M9XQ2O')).toThrow();
    expect(() => appointmentCodeSchema.parse('K7P3M9XQ20')).toThrow();
    expect(() => appointmentCodeSchema.parse('K7P3M9XQ21')).toThrow();
  });

  it('rechaza minúsculas', () => {
    expect(() => appointmentCodeSchema.parse('k7p3m9xq2r')).toThrow();
  });
});
