/**
 * GlobalExceptionFilter (T026) — normaliza toda excepción a la forma estándar
 * `{ error, message, code?, issues? }` (contrato) y registra el fallo con pino
 * enmascarando los datos personales del cuerpo (FR-027).
 *
 * Para excepciones no controladas devuelve un 500 genérico SIN filtrar el
 * mensaje interno al cliente (evita fuga de detalles de implementación).
 */
import {
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { logger } from '../logger/logger';
import { maskSensitive } from '../utils/mask-sensitive';

// Re-exportado para compatibilidad con quienes lo importaban desde el filtro.
export { maskSensitive };

interface CuerpoError {
  error: string;
  message: string;
  code?: string;
  issues?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, body } = this.normalizar(exception);

    // Se loguea la ruta PLANTILLA (p. ej. /api/v1/appointments/:code/cancel),
    // nunca req.url: la URL real lleva el código de cita, que es secreto de
    // autorización (FR-016) y no debe aparecer en logs.
    const ruta = req.route?.path ? `${req.baseUrl ?? ''}${req.route.path}` : 'unmatched';

    logger.error({
      route: ruta,
      method: req.method,
      status,
      error: body.error,
      body: maskSensitive(req.body),
    });

    res.status(status).json(body);
  }

  private normalizar(exception: unknown): { status: number; body: CuerpoError } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const respuesta = exception.getResponse();

      if (typeof respuesta === 'string') {
        return { status, body: { error: this.slug(status), message: respuesta } };
      }

      const obj = respuesta as Record<string, unknown>;
      const mensaje = obj.message;
      return {
        status,
        body: {
          error: typeof obj.error === 'string' ? obj.error : this.slug(status),
          message: Array.isArray(mensaje)
            ? mensaje.join(', ')
            : typeof mensaje === 'string'
              ? mensaje
              : this.slug(status),
          ...(typeof obj.code === 'string' ? { code: obj.code } : {}),
          ...(obj.issues !== undefined ? { issues: obj.issues } : {}),
        },
      };
    }

    // No controlada: 500 genérico, sin exponer el detalle interno.
    return {
      status: 500,
      body: { error: 'internal_error', message: 'Ocurrió un error inesperado.' },
    };
  }

  private slug(status: number): string {
    return `http_${status}`;
  }
}
