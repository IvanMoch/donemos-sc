/**
 * Esquema del estado global del sistema (SystemStatus del contrato).
 *
 * Es la vista pública del kill switch (research §5): el frontend lo lee para
 * decidir si muestra el flujo de agendamiento o el mensaje de pausa.
 */
import { z } from 'zod';

export const systemStatusSchema = z.object({
  appointmentsDisabled: z.boolean(),
  reason: z.string().nullable().optional(),
});

export type SystemStatus = z.infer<typeof systemStatusSchema>;
