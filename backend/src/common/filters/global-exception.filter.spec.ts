/**
 * Test del filtro global de excepciones (T026). Rojo antes de la implementación.
 * Verifica el shape estándar { error, message, code? } y el enmascarado de PII.
 */
import { BadRequestException, ConflictException, HttpException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter, maskSensitive } from './global-exception.filter';

function hostConRequest(body: unknown): { host: ArgumentsHost; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'POST', url: '/api/v1/appointments', body }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('maskSensitive', () => {
  it('enmascara nombre, apellido y cédula', () => {
    expect(maskSensitive({ firstName: 'Ana', lastName: 'Pérez', idNumber: 'V12345678', slotId: 'x' })).toEqual({
      firstName: '***',
      lastName: '***',
      idNumber: '***',
      slotId: 'x',
    });
  });

  it('tolera cuerpos no-objeto', () => {
    expect(maskSensitive(undefined)).toBeUndefined();
    expect(maskSensitive('texto')).toBe('texto');
  });
});

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();

  it('mapea una HttpException con cuerpo estructurado (409 + code)', () => {
    const { host, json, status } = hostConRequest({ idNumber: 'V12345678' });
    const exception = new ConflictException({ error: 'slot_full', code: 'slot_full', message: 'Sin cupo.' });
    filter.catch(exception, host);
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'slot_full', code: 'slot_full' }));
  });

  it('propaga issues de validación (400)', () => {
    const { host, json, status } = hostConRequest({});
    const exception = new BadRequestException({ error: 'validation_failed', issues: [{ path: 'nombre', message: 'req' }] });
    filter.catch(exception, host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: 'validation_failed', issues: expect.any(Array) }));
  });

  it('devuelve un error genérico 500 para excepciones no HTTP', () => {
    const { host, json, status } = hostConRequest({ firstName: 'Ana' });
    filter.catch(new Error('boom'), host);
    expect(status).toHaveBeenCalledWith(500);
    const payload = json.mock.calls[0][0];
    expect(payload).toHaveProperty('error');
    expect(payload).toHaveProperty('message');
    // Nunca filtra el mensaje interno crudo al cliente.
    expect(payload.message).not.toContain('boom');
  });

  it('acepta HttpException instanceof (guardas de tipo)', () => {
    const { host } = hostConRequest({});
    expect(() => filter.catch(new HttpException('x', 418), host)).not.toThrow();
  });
});
