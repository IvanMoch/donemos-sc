/**
 * Test del pipe de validación Zod (T025). Rojo antes de la implementación.
 * El pipe valida solo cuando el metatype es un DTO creado con createZodDto;
 * en cualquier otro caso es no-op (permite registrarlo global sin romper params).
 */
import { BadRequestException } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from './create-zod-dto';
import { ZodValidationPipe } from './zod-validation.pipe';

const Dto = createZodDto(z.object({ nombre: z.string().min(1), edad: z.number().int() }));

function meta(metatype: unknown): ArgumentMetadata {
  return { type: 'body', metatype: metatype as ArgumentMetadata['metatype'], data: undefined };
}

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe();

  it('devuelve los datos parseados cuando son válidos', () => {
    expect(pipe.transform({ nombre: 'Ana', edad: 30 }, meta(Dto))).toEqual({
      nombre: 'Ana',
      edad: 30,
    });
  });

  it('lanza 400 validation_failed con issues cuando son inválidos', () => {
    try {
      pipe.transform({ nombre: '', edad: 1.5 }, meta(Dto));
      throw new Error('no lanzó');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const resp = (e as BadRequestException).getResponse() as {
        error: string;
        issues: Array<{ path: string; message: string }>;
      };
      expect(resp.error).toBe('validation_failed');
      expect(resp.issues.length).toBeGreaterThan(0);
      expect(resp.issues[0]).toHaveProperty('path');
      expect(resp.issues[0]).toHaveProperty('message');
    }
  });

  it('es no-op si el metatype no es un DTO Zod', () => {
    const valor = { cualquiera: true };
    expect(pipe.transform(valor, meta(Object))).toBe(valor);
  });
});
