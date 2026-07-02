/**
 * Esquemas de citas del contrato público (contracts/public-api.openapi.yaml).
 *
 * Un solo lugar define la forma de las peticiones de crear, consultar, cancelar
 * y reagendar; frontend (React Hook Form + zodResolver) y backend (DTO) validan
 * con lo mismo (Principio II).
 */
import { z } from 'zod';
import { appointmentCodeSchema } from './appointment-code';
import { idNumberSchema } from './id-number';

/** POST /appointments — la única elegibilidad válida es la declarada (FR-012). */
export const createAppointmentSchema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  idNumber: idNumberSchema,
  slotId: z.string().uuid(),
  eligibilityDeclared: z.literal(true, {
    errorMap: () => ({ message: 'Debes declarar tu elegibilidad para continuar.' }),
  }),
});

/** POST /appointments/lookup — cédula + código como pareja de autorización (FR-016). */
export const lookupSchema = z.object({
  code: appointmentCodeSchema,
  idNumber: idNumberSchema,
});

/** POST /appointments/{code}/cancel — el código va en la URL, solo la cédula autoriza. */
export const cancelSchema = z.object({
  idNumber: idNumberSchema,
});

/** PATCH /appointments/{code}/reschedule — conserva el código; elige nuevo slot. */
export const rescheduleSchema = z.object({
  idNumber: idNumberSchema,
  newSlotId: z.string().uuid(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type LookupInput = z.infer<typeof lookupSchema>;
export type CancelInput = z.infer<typeof cancelSchema>;
export type RescheduleInput = z.infer<typeof rescheduleSchema>;
