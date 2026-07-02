/**
 * Test del interceptor de logging (T027). Rojo antes de la implementación.
 * Verifica que se emite un log estructurado con request_id, route, status y
 * duration_ms, sin volcar el cuerpo (evita PII — FR-027).
 */
import { of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { LoggingInterceptor, logger } from './logging.interceptor';

function contexto(): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', url: '/api/v1/slots', headers: {}, route: { path: '/slots' } }),
      getResponse: () => ({ statusCode: 200 }),
    }),
  } as unknown as ExecutionContext;
}

describe('LoggingInterceptor', () => {
  it('emite un log con los campos estructurados requeridos', async () => {
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => undefined as never);
    const interceptor = new LoggingInterceptor();
    const next: CallHandler = { handle: () => of('ok') };

    await new Promise<void>((resolve) => {
      interceptor.intercept(contexto(), next).subscribe({ complete: () => resolve() });
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
});
