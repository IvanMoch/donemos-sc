/**
 * createZodDto — puente entre un esquema Zod compartido y un DTO de NestJS.
 *
 * Devuelve una clase que lleva el esquema como propiedad estática `zodSchema`
 * y cuyo tipo de instancia es `z.infer<schema>`. El ZodValidationPipe global
 * detecta esa propiedad para saber qué validar; los controladores tipan el
 * `@Body()` con la clase resultante y obtienen los tipos derivados gratis.
 *
 *   class CreateAppointmentDto extends createZodDto(createAppointmentSchema) {}
 */
import type { z, ZodTypeAny } from 'zod';

export interface ZodDtoClass<TSchema extends ZodTypeAny = ZodTypeAny> {
  new (): z.infer<TSchema>;
  zodSchema: TSchema;
}

export function createZodDto<TSchema extends ZodTypeAny>(schema: TSchema): ZodDtoClass<TSchema> {
  class ZodDto {
    static zodSchema = schema;
  }
  return ZodDto as unknown as ZodDtoClass<TSchema>;
}
