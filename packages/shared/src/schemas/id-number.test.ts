/**
 * Tests del esquema de cédula (V2 de data-model.md, FR-006).
 * Escritos antes de la implementación (Principio V — TDD).
 */
import { describe, expect, it } from 'vitest';
import { idNumberSchema } from './id-number';

describe('idNumberSchema', () => {
  it('acepta una cédula venezolana válida con prefijo V', () => {
    expect(idNumberSchema.parse('V12345678')).toBe('V12345678');
  });

  it('acepta el prefijo E (extranjero)', () => {
    expect(idNumberSchema.parse('E1234567')).toBe('E1234567');
  });

  it('normaliza a mayúsculas y elimina guiones antes de validar', () => {
    expect(idNumberSchema.parse('v-12.345.678'.replace(/\./g, ''))).toBe('V12345678');
    expect(idNumberSchema.parse('v12345678')).toBe('V12345678');
    expect(idNumberSchema.parse('E-1234567')).toBe('E1234567');
  });

  it('acepta el mínimo de 6 dígitos y el máximo de 8', () => {
    expect(idNumberSchema.parse('V123456')).toBe('V123456');
    expect(idNumberSchema.parse('V12345678')).toBe('V12345678');
  });

  it('rechaza menos de 6 dígitos', () => {
    expect(() => idNumberSchema.parse('V12345')).toThrow();
  });

  it('rechaza más de 8 dígitos', () => {
    expect(() => idNumberSchema.parse('V123456789')).toThrow();
  });

  it('rechaza prefijos distintos de V o E', () => {
    expect(() => idNumberSchema.parse('X1234567')).toThrow();
  });

  it('rechaza caracteres no numéricos en el cuerpo', () => {
    expect(() => idNumberSchema.parse('V123A5678')).toThrow();
  });
});
