/**
 * Esquema público de franja horaria (PublicSlot del contrato).
 *
 * Solo expone lo que el donante necesita ver: identidad, fecha, horas y cupo
 * restante. La capacidad total y los campos de administración no salen por acá.
 */
import { z } from 'zod';

/**
 * Hora local en formato HH:MM de 24h (America/Caracas la resuelve el frontend).
 * Restringe a 00–23 horas y 00–59 minutos para rechazar valores imposibles
 * (p. ej. "99:99") antes de que lleguen a la lógica de dominio o a la BD.
 */
export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:MM, entre 00:00 y 23:59).');

export const publicSlotSchema = z.object({
  id: z.string().uuid(),
  date: z.string().date(),
  startTime: timeOfDaySchema,
  endTime: timeOfDaySchema,
  remainingCapacity: z.number().int().nonnegative(),
});

export type PublicSlot = z.infer<typeof publicSlotSchema>;
