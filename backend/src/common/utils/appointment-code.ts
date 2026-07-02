/**
 * Generador del código de cita (T031, research §14).
 *
 * Nano ID de 10 caracteres sobre el alfabeto sin ambigüedades definido en el
 * contrato compartido (`@donemos/shared`). Se reutiliza la constante para que
 * generador y validador (`appointmentCodeSchema`) nunca diverjan.
 */
import { APPOINTMENT_CODE_ALPHABET, APPOINTMENT_CODE_LENGTH } from '@donemos/shared';
import { customAlphabet } from 'nanoid';

const nano = customAlphabet(APPOINTMENT_CODE_ALPHABET, APPOINTMENT_CODE_LENGTH);

export function generateAppointmentCode(): string {
  return nano();
}
