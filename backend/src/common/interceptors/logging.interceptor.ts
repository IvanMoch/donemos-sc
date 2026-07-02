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
    const res = context.switchToHttp().getResponse<Response>();

    let emitido = false;
    const emitir = (): void => {
      if (emitido) return;
      emitido = true;
      logger.info({
        request_id: requestId,
        // Ruta plantilla, nunca la URL real (no filtra el código de cita).
        route: req.route?.path ?? 'unmatched',
        method: req.method,
        status: res.statusCode,
        duration_ms: Date.now() - inicio,
      });
    };

    // Preferimos res.on('finish'|'close'): el status ya está finalizado incluso
    // en el camino de error (el filtro global ya escribió la respuesta). En
    // contextos de test que mockean el response sin .on(), caemos a tap().
    if (typeof res.on === 'function') {
      res.on('finish', emitir);
      res.on('close', emitir);
      return next.handle();
    }
    return next.handle().pipe(tap({ next: emitir, error: emitir }));
  }
}
