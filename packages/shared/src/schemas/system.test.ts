/**
 * Tests del esquema de estado del sistema (SystemStatus del contrato, kill switch).
 * Escritos antes de la implementación (Principio V — TDD).
 */
import { describe, expect, it } from 'vitest';
import { systemStatusSchema } from './system';

describe('systemStatusSchema', () => {
  it('acepta el estado mínimo con solo appointmentsDisabled', () => {
    expect(systemStatusSchema.parse({ appointmentsDisabled: false })).toEqual({
      appointmentsDisabled: false,
    });
  });

  it('acepta un motivo opcional', () => {
    expect(
      systemStatusSchema.parse({ appointmentsDisabled: true, reason: 'Mantenimiento' }),
    ).toMatchObject({ appointmentsDisabled: true, reason: 'Mantenimiento' });
  });

  it('acepta reason nulo', () => {
    expect(systemStatusSchema.parse({ appointmentsDisabled: true, reason: null })).toMatchObject({
      appointmentsDisabled: true,
      reason: null,
    });
  });

  it('rechaza appointmentsDisabled ausente', () => {
    expect(() => systemStatusSchema.parse({ reason: 'x' })).toThrow();
  });
});
