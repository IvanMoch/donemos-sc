/**
 * DTO de creación de cita — deriva del esquema Zod compartido
 * (`createAppointmentSchema`). El ZodValidationPipe global lo valida usando la
 * propiedad estática `zodSchema` y el controlador obtiene los tipos derivados.
 */
import { createAppointmentSchema } from '@donemos/shared';
import { createZodDto } from '../../../common/pipes/create-zod-dto';

export class CreateAppointmentDto extends createZodDto(createAppointmentSchema) {}
