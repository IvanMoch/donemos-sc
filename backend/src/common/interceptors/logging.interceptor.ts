/**
 * LoggingInterceptor (T027) — una línea de log estructurada por request.
 *
 * Emite request_id, route, method, status y duration_ms vía pino (research §13).
 * Deliberadamente NO registra el cuerpo ni query params para no filtrar PII
 * (FR-027); el enmascarado de cuerpos en errores lo hace el filtro global.
 * El request_id se toma de `x-request-id` si viene o se genera aquí.
 */
import { randomUUID } from 'node:crypto';
import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { logger } from '../logger/logger';

// Re-exporta el logger para que los tests puedan espiarlo desde este módulo.
export { logger };

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { requestId?: string }>();
    const cabecera = req.headers['x-request-id'];
    const requestId = (Array.isArray(cabecera) ? cabecera[0] : cabecera) ?? randomUUID();
    req.requestId = requestId;

    const inicio = Date.now();
    const emitir = (): void => {
      const res = context.switchToHttp().getResponse<Response>();
      logger.info({
        request_id: requestId,
        route: req.route?.path ?? req.url,
        method: req.method,
        status: res.statusCode,
        duration_ms: Date.now() - inicio,
      });
    };

    return next.handle().pipe(tap({ next: emitir, error: emitir }));
  }
}
