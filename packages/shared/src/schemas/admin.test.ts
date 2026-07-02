/**
 * Tests de los esquemas administrativos (contracts/admin-api.openapi.yaml,
 * FR-018a). Escritos antes de la implementación (Principio V — TDD).
 *
 * El caso central: crear franja fuera de L–V 7:00–12:00 debe rechazarse salvo
 * que el DTO traiga `isExceptionHours: true` con confirmación explícita.
 */
import { describe, expect, it } from 'vitest';
import {
  createSlotSchema,
  disableSlotSchema,
  loginSchema,
  toggleKillSwitchSchema,
  updateSlotSchema,
} from './admin';

/**
 * Devuelve la fecha (YYYY-MM-DD) del primer día que cae en `diaUTC`
 * (0=domingo … 6=sábado) a partir del 1 de julio de 2026. Evita hardcodear
 * un día de la semana: el esquema calcula el weekday con la misma base UTC.
 */
function fechaEnDia(diaUTC: number): string {
  const base = Date.UTC(2026, 6, 1);
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(base + i * 86_400_000);
    if (d.getUTCDay() === diaUTC) return d.toISOString().slice(0, 10);
  }
  throw new Error('no se encontró la fecha de prueba');
}

const UN_LUNES = fechaEnDia(1);
const UN_SABADO = fechaEnDia(6);

describe('loginSchema', () => {
  it('acepta credenciales válidas', () => {
    expect(loginSchema.parse({ username: 'admin', password: 'secreto' })).toEqual({
      username: 'admin',
      password: 'secreto',
    });
  });

  it('rechaza username demasiado corto', () => {
    expect(() => loginSchema.parse({ username: 'ab', password: 'secreto' })).toThrow();
  });

  it('rechaza password vacío', () => {
    expect(() => loginSchema.parse({ username: 'admin', password: '' })).toThrow();
  });
});

describe('createSlotSchema', () => {
  const base = { date: UN_LUNES, startTime: '07:00', endTime: '07:35', capacity: 3 };

  it('acepta una franja en horario hábil (L–V 7:00–12:00)', () => {
    expect(createSlotSchema.parse(base)).toMatchObject({ ...base, isExceptionHours: false });
  });

  it('rechaza sábado sin isExceptionHours', () => {
    expect(() => createSlotSchema.parse({ ...base, date: UN_SABADO })).toThrow();
  });

  it('acepta sábado con isExceptionHours: true', () => {
    expect(
      createSlotSchema.parse({ ...base, date: UN_SABADO, isExceptionHours: true }),
    ).toMatchObject({ isExceptionHours: true });
  });

  it('rechaza hora de inicio antes de las 7:00 sin excepción', () => {
    expect(() => createSlotSchema.parse({ ...base, startTime: '06:30', endTime: '07:00' })).toThrow();
  });

  it('rechaza hora de fin después de las 12:00 sin excepción', () => {
    expect(() => createSlotSchema.parse({ ...base, startTime: '11:45', endTime: '12:30' })).toThrow();
  });

  it('acepta fuera de horario con isExceptionHours: true', () => {
    expect(
      createSlotSchema.parse({ ...base, startTime: '13:00', endTime: '13:35', isExceptionHours: true }),
    ).toMatchObject({ isExceptionHours: true });
  });

  it('rechaza endTime <= startTime', () => {
    expect(() => createSlotSchema.parse({ ...base, startTime: '08:00', endTime: '07:30' })).toThrow();
  });

  it('rechaza capacidad fuera de 1..100', () => {
    expect(() => createSlotSchema.parse({ ...base, capacity: 0 })).toThrow();
    expect(() => createSlotSchema.parse({ ...base, capacity: 101 })).toThrow();
  });
});

describe('updateSlotSchema', () => {
  it('acepta actualización parcial de capacidad', () => {
    expect(updateSlotSchema.parse({ capacity: 5 })).toEqual({ capacity: 5 });
  });

  it('rechaza endTime <= startTime cuando ambos vienen', () => {
    expect(() => updateSlotSchema.parse({ startTime: '09:00', endTime: '08:00' })).toThrow();
  });
});

describe('disableSlotSchema', () => {
  it('acepta motivo opcional', () => {
    expect(disableSlotSchema.parse({ reason: 'Feriado' })).toEqual({ reason: 'Feriado' });
  });

  it('acepta objeto vacío (sin motivo)', () => {
    expect(disableSlotSchema.parse({})).toEqual({});
  });
});

describe('toggleKillSwitchSchema', () => {
  it('acepta enabled con motivo', () => {
    expect(toggleKillSwitchSchema.parse({ enabled: true, reason: 'Emergencia' })).toMatchObject({
      enabled: true,
      reason: 'Emergencia',
    });
  });

  it('rechaza enabled ausente', () => {
    expect(() => toggleKillSwitchSchema.parse({ reason: 'x' })).toThrow();
  });
});
