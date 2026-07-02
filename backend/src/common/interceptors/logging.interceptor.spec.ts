/**
 * Test del interceptor de logging (T027). Rojo antes de la implementación.
 * Verifica que se emite un log estructurado con request_id, route, status y
 * duration_ms, sin volcar el cuerpo (evita PII — FR-027).
 */
import { of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { LoggingInterceptor, logger } from './logging.interceptor';

/** Contexto con response mockeado; si `conOn`, expone .on() (camino finish). */
function contexto(conOn: boolean): { ctx: ExecutionContext; dispararFinish: () => void } {
  const handlers: Record<string, () => void> = {};
  const res: Record<string, unknown> = { statusCode: 200 };
  if (conOn) {
    res.on = (evento: string, cb: () => void) => {
      handlers[evento] = cb;
    };
  }
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', url: '/api/v1/slots', headers: {}, route: { path: '/slots' } }),
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
  return { ctx, dispararFinish: () => handlers.finish?.() };
}

describe('LoggingInterceptor', () => {
  const next: CallHandler = { handle: () => of('ok') };

  it('emite un log con los campos estructurados requeridos (fallback tap)', async () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => undefined as never);
    const { ctx } = contexto(false);

    await new Promise<void>((resolve) => {
      new LoggingInterceptor().intercept(ctx, next).subscribe({ complete: () => resolve() });
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const campos = spy.mock.calls[0]?.[0];
    expect(campos).toEqual(
      expect.objectContaining({
        request_id: expect.any(String),
        route: '/slots',
        status: 200,
        duration_ms: expect.any(Number),
      }),
    );
    spy.mockRestore();
  });

  it('emite el log en res.on("finish") cuando el response lo soporta', async () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => undefined as never);
    const { ctx, dispararFinish } = contexto(true);

    await new Promise<void>((resolve) => {
      new LoggingInterceptor().intercept(ctx, next).subscribe({ complete: () => resolve() });
    });

    // Aún no se ha emitido: espera al evento finish del response.
    expect(spy).not.toHaveBeenCalled();
    dispararFinish();
    expect(spy).toHaveBeenCalledTimes(1);
    // Un segundo finish/close no duplica el log (guard `emitido`).
    dispararFinish();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
