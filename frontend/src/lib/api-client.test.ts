/**
 * Tests unitarios para `apiClient` — cliente HTTP tipado del frontend.
 * TDD (Principio V): estos tests describen el contrato antes de la implementación.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiError, type ApiClientOptions } from './api-client';

const ORIGINAL_FETCH = global.fetch;
const BASE_URL = 'https://api.donemos.example/v1';

function mockFetch(response: {
  status?: number;
  body?: unknown;
  contentType?: string;
}): ReturnType<typeof vi.fn> {
  const {
    status = 200,
    body = null,
    contentType = 'application/json',
  } = response;
  return vi.fn(async () =>
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': contentType },
    }),
  );
}

describe('apiClient', () => {
  const options: ApiClientOptions = { baseUrl: BASE_URL };

  beforeEach(() => {
    global.fetch = ORIGINAL_FETCH;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = ORIGINAL_FETCH;
  });

  it('resuelve rutas relativas contra el baseUrl y usa GET por defecto', async () => {
    const fetchSpy = mockFetch({ body: { ok: true } });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await apiClient<{ ok: boolean }>('/health', undefined, options);

    expect(result).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [urlArg, initArg] = fetchSpy.mock.calls[0]!;
    expect(String(urlArg)).toBe(`${BASE_URL}/health`);
    expect((initArg as RequestInit).method).toBe('GET');
  });

  it('envía credentials: include para poder usar la cookie de sesión admin', async () => {
    const fetchSpy = mockFetch({ body: {} });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await apiClient('/admin/session', undefined, options);

    const [, initArg] = fetchSpy.mock.calls[0]!;
    expect((initArg as RequestInit).credentials).toBe('include');
  });

  it('serializa el body como JSON y agrega el header Content-Type', async () => {
    const fetchSpy = mockFetch({ status: 201, body: { id: 'abc' } });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const payload = { first_name: 'Ana', id_number: 'V12345678' };
    await apiClient('/appointments', { method: 'POST', body: payload }, options);

    const [, initArg] = fetchSpy.mock.calls[0]!;
    const init = initArg as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify(payload));
    const headers = new Headers(init.headers);
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('accept')).toBe('application/json');
  });

  it('lanza ApiError con status y payload cuando el backend responde 4xx', async () => {
    const errorBody = {
      error: 'validation_failed',
      issues: [{ path: ['id_number'], message: 'inválida' }],
    };
    const fetchSpy = mockFetch({ status: 400, body: errorBody });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await expect(
      apiClient('/appointments', { method: 'POST', body: {} }, options),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      payload: errorBody,
    });
  });

  it('devuelve null cuando la respuesta es 204 No Content', async () => {
    const fetchSpy = mockFetch({ status: 204, body: null, contentType: '' });
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await apiClient('/appointments/xyz', { method: 'DELETE' }, options);
    expect(result).toBeNull();
  });

  it('envuelve errores de red en ApiError con status 0', async () => {
    const fetchSpy = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    try {
      await apiClient('/health', undefined, options);
      throw new Error('debía lanzar');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(0);
      expect((err as ApiError).message).toContain('Failed to fetch');
    }
  });
});
