/**
 * Esquema del código de cita (research §14, V3 de data-model.md).
 *
 * Nano ID de 10 caracteres en un alfabeto sin ambigüedades visuales
 * (sin I, O, 0, 1) para que el donante pueda dictarlo por teléfono sin error.
 */
import { z } from 'zod';

/** Alfabeto compartido con el generador del backend (common/utils/appointment-code.ts). */
export const APPOINTMENT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const APPOINTMENT_CODE_LENGTH = 10;

export const appointmentCodeSchema = z
  .string()
  .length(APPOINTMENT_CODE_LENGTH)
  .regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/, 'Código de cita inválido.');

export type AppointmentCode = z.infer<typeof appointmentCodeSchema>;
