/**
 * Esquema público de franja horaria (PublicSlot del contrato).
 *
 * Solo expone lo que el donante necesita ver: identidad, fecha, horas y cupo
 * restante. La capacidad total y los campos de administración no salen por acá.
 */
import { z } from 'zod';

/** Hora local en formato HH:MM de 24h (America/Caracas la resuelve el frontend). */
export const timeOfDaySchema = z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida (HH:MM).');

export const publicSlotSchema = z.object({
  id: z.string().uuid(),
  date: z.string().date(),
  startTime: timeOfDaySchema,
  endTime: timeOfDaySchema,
  remainingCapacity: z.number().int().nonnegative(),
});

export type PublicSlot = z.infer<typeof publicSlotSchema>;
