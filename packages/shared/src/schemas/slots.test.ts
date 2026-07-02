/**
 * Tests del esquema público de franja horaria (PublicSlot del contrato).
 * Escritos antes de la implementación (Principio V — TDD).
 */
import { describe, expect, it } from 'vitest';
import { publicSlotSchema } from './slots';

const SLOT = {
  id: '11111111-1111-4111-8111-111111111111',
  date: '2026-07-02',
  startTime: '07:00',
  endTime: '07:35',
  remainingCapacity: 3,
};

describe('publicSlotSchema', () => {
  it('acepta una franja pública válida', () => {
    expect(publicSlotSchema.parse(SLOT)).toEqual(SLOT);
  });

  it('rechaza remainingCapacity negativo', () => {
    expect(() => publicSlotSchema.parse({ ...SLOT, remainingCapacity: -1 })).toThrow();
  });

  it('rechaza horas con formato distinto de HH:MM', () => {
    expect(() => publicSlotSchema.parse({ ...SLOT, startTime: '7:00' })).toThrow();
  });

  it('rechaza fecha con formato inválido', () => {
    expect(() => publicSlotSchema.parse({ ...SLOT, date: '02-07-2026' })).toThrow();
  });

  it('rechaza id que no es UUID', () => {
    expect(() => publicSlotSchema.parse({ ...SLOT, id: 'x' })).toThrow();
  });
});
