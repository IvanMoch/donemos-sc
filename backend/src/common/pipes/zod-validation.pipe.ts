/**
 * ZodValidationPipe (T025) — valida el payload contra el esquema Zod del DTO.
 *
 * Diseñado para registrarse GLOBAL: solo actúa cuando el `metatype` del
 * argumento es un DTO creado con `createZodDto` (tiene `zodSchema`); para
 * cualquier otro parámetro (primitivos, tipos sin esquema) es no-op y deja
 * pasar el valor. Ante datos inválidos responde 400 con el shape estándar
 * `{ error: 'validation_failed', issues: [...] }` (contrato ValidationError).
 */
import { BadRequestException, Injectable, type ArgumentMetadata, type PipeTransform } from '@nestjs/common';
import type { ZodTypeAny } from 'zod';

interface PosibleDtoZod {
  zodSchema?: ZodTypeAny;
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const schema = (metadata.metatype as PosibleDtoZod | undefined)?.zodSchema;
    if (!schema) return value;

    const resultado = schema.safeParse(value);
    if (!resultado.success) {
      throw new BadRequestException({
        error: 'validation_failed',
        message: 'Los datos enviados no son válidos.',
        issues: resultado.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return resultado.data;
  }
}
