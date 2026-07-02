/**
 * DTOs de US2 derivados de los esquemas Zod compartidos (validados por el
 * ZodValidationPipe global). El `code` de cancel/reschedule va en la URL; el
 * cuerpo solo lleva lo demás.
 */
import { cancelSchema, lookupSchema, rescheduleSchema } from '@donemos/shared';
import { createZodDto } from '../../../common/pipes/create-zod-dto';

export class LookupDto extends createZodDto(lookupSchema) {}
export class CancelDto extends createZodDto(cancelSchema) {}
export class RescheduleDto extends createZodDto(rescheduleSchema) {}
