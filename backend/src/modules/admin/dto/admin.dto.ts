/**
 * DTOs del panel admin, derivados de los esquemas Zod compartidos (validados por
 * el ZodValidationPipe global).
 */
import {
  createSlotSchema,
  disableSlotSchema,
  loginSchema,
  toggleKillSwitchSchema,
  updateSlotSchema,
} from '@donemos/shared';
import { createZodDto } from '../../../common/pipes/create-zod-dto';

export class LoginDto extends createZodDto(loginSchema) {}
export class CreateSlotDto extends createZodDto(createSlotSchema) {}
export class UpdateSlotDto extends createZodDto(updateSlotSchema) {}
export class DisableSlotDto extends createZodDto(disableSlotSchema) {}
export class ToggleKillSwitchDto extends createZodDto(toggleKillSwitchSchema) {}
