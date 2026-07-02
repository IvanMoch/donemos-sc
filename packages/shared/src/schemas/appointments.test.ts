/**
 * Tests de los esquemas de citas: creación, consulta, cancelación y reagendamiento.
 * Contrato en contracts/public-api.openapi.yaml. Escritos antes de la
 * implementación (Principio V — TDD).
 */
import { describe, expect, it } from 'vitest';
import {
  cancelSchema,
  createAppointmentSchema,
  lookupSchema,
  rescheduleSchema,
} from './appointments';

const SLOT_ID = '11111111-1111-4111-8111-111111111111';

describe('createAppointmentSchema', () => {
  const valido = {
    firstName: 'Ana',
    lastName: 'Pérez',
    idNumber: 'V12345678',
    slotId: SLOT_ID,
    eligibilityDeclared: true as const,
  };

  it('acepta una creación válida con elegibilidad declarada', () => {
    expect(createAppointmentSchema.parse(valido)).toMatchObject({
      firstName: 'Ana',
      idNumber: 'V12345678',
      slotId: SLOT_ID,
      eligibilityDeclared: true,
    });
  });

  it('normaliza la cédula al parsear (minúsculas y guion)', () => {
    const parsed = createAppointmentSchema.parse({ ...valido, idNumber: 'v-12345678' });
    expect(parsed.idNumber).toBe('V12345678');
  });

  it('rechaza eligibilityDeclared: false (FR-012)', () => {
    expect(() => createAppointmentSchema.parse({ ...valido, eligibilityDeclared: false })).toThrow();
  });

  it('rechaza nombre vacío', () => {
    expect(() => createAppointmentSchema.parse({ ...valido, firstName: '' })).toThrow();
  });

  it('rechaza nombre de más de 60 caracteres', () => {
    expect(() => createAppointmentSchema.parse({ ...valido, firstName: 'a'.repeat(61) })).toThrow();
  });

  it('rechaza un slotId que no es UUID', () => {
    expect(() => createAppointmentSchema.parse({ ...valido, slotId: 'no-uuid' })).toThrow();
  });
});

describe('lookupSchema', () => {
  it('exige code y idNumber, normalizando la cédula', () => {
    const parsed = lookupSchema.parse({ code: 'K7P3M9XQ2R', idNumber: 'v12345678' });
    expect(parsed).toEqual({ code: 'K7P3M9XQ2R', idNumber: 'V12345678' });
  });

  it('rechaza un código con formato inválido', () => {
    expect(() => lookupSchema.parse({ code: 'malo', idNumber: 'V12345678' })).toThrow();
  });
});

describe('cancelSchema', () => {
  it('exige solo la cédula (el código va en la URL)', () => {
    expect(cancelSchema.parse({ idNumber: 'V12345678' })).toEqual({ idNumber: 'V12345678' });
  });

  it('rechaza cédula inválida', () => {
    expect(() => cancelSchema.parse({ idNumber: 'X1' })).toThrow();
  });
});

describe('rescheduleSchema', () => {
  it('exige cédula y newSlotId (UUID)', () => {
    expect(rescheduleSchema.parse({ idNumber: 'V12345678', newSlotId: SLOT_ID })).toEqual({
      idNumber: 'V12345678',
      newSlotId: SLOT_ID,
    });
  });

  it('rechaza newSlotId no-UUID', () => {
    expect(() => rescheduleSchema.parse({ idNumber: 'V12345678', newSlotId: 'x' })).toThrow();
  });
});
