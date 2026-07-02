/**
 * Esquemas del panel administrativo (contracts/admin-api.openapi.yaml).
 *
 * Regla de negocio central (FR-018a): las franjas viven en horario hábil
 * L–V 7:00–12:00. Crear una fuera de esa ventana exige el opt-in explícito
 * `isExceptionHours: true` — así el admin confirma que la excepción es
 * intencional y queda registrada. La misma validación aplica en cliente
 * (deshabilita el submit) y en servidor (rechaza con 400).
 */
import { z } from 'zod';
import { timeOfDaySchema } from './slots';

/** Ventana hábil por defecto (hora local America/Caracas). */
export const BUSINESS_HOURS_START = '07:00';
export const BUSINESS_HOURS_END = '12:00';

/** getUTCDay() del día de la fecha YYYY-MM-DD interpretada como medianoche UTC. */
function diaDeLaSemanaUTC(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

/** true si la fecha cae en sábado (6) o domingo (0). */
function esFinDeSemana(fecha: string): boolean {
  const dia = diaDeLaSemanaUTC(fecha);
  return dia === 0 || dia === 6;
}

export const loginSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(1),
});

export const createSlotSchema = z
  .object({
    date: z.string().date(),
    startTime: timeOfDaySchema,
    endTime: timeOfDaySchema,
    capacity: z.number().int().min(1).max(100),
    isExceptionHours: z.boolean().default(false),
  })
  .superRefine((val, ctx) => {
    // Comparación léxica válida porque las horas están zero-padded (HH:MM).
    if (val.endTime <= val.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'La hora de fin debe ser posterior a la de inicio.',
      });
    }
    if (val.isExceptionHours) return; // La excepción explícita salta las reglas de ventana hábil.

    if (esFinDeSemana(val.date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date'],
        message: 'Fuera de L–V. Marca isExceptionHours para confirmar la excepción.',
      });
    }
    // Se reporta cada extremo en su propio path para que el cliente resalte el
    // campo correcto (no siempre startTime).
    if (val.startTime < BUSINESS_HOURS_START) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startTime'],
        message: 'Antes de las 7:00. Marca isExceptionHours para confirmar la excepción.',
      });
    }
    if (val.endTime > BUSINESS_HOURS_END) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'Después de las 12:00. Marca isExceptionHours para confirmar la excepción.',
      });
    }
  });

export const updateSlotSchema = z
  .object({
    startTime: timeOfDaySchema.optional(),
    endTime: timeOfDaySchema.optional(),
    capacity: z.number().int().min(1).max(100).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.startTime !== undefined && val.endTime !== undefined && val.endTime <= val.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'La hora de fin debe ser posterior a la de inicio.',
      });
    }
  });

export const disableSlotSchema = z.object({
  reason: z.string().max(500).nullable().optional(),
});

export const toggleKillSwitchSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().max(500).nullable().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateSlotInput = z.infer<typeof createSlotSchema>;
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;
export type DisableSlotInput = z.infer<typeof disableSlotSchema>;
export type ToggleKillSwitchInput = z.infer<typeof toggleKillSwitchSchema>;
