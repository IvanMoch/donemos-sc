/**
 * `apiClient` — cliente HTTP tipado del frontend DonemosSC.
 *
 * Responsabilidad: enviar todas las requests al backend NestJS respetando dos
 * invariantes del proyecto:
 *  1. Solo API propia (Principio I): el baseUrl viene de `PUBLIC_API_BASE_URL`
 *     y todas las llamadas cuelgan de él. No se llama a terceros desde aquí.
 *  2. Cookie HttpOnly de sesión admin (research §6): `credentials: 'include'`
 *     va en TODAS las requests para que la cookie se envíe cuando corresponda.
 *     En endpoints públicos es no-op — no hay cookie que enviar.
 *
 * Errores: cualquier respuesta != 2xx o fallo de red se envuelve en `ApiError`
 * con `status` y `payload` para que las capas superiores decidan cómo mostrar
 * el mensaje (respetando FR-027: sin exponer detalles internos al usuario).
 */

export interface ApiClientOptions {
  baseUrl: string;
}

export interface ApiRequestInit {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  public override readonly name = 'ApiError';
  public readonly status: number;
  public readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function resolveDefaultOptions(): ApiClientOptions {
  // En cliente Astro/Vite las vars públicas viven en `import.meta.env`. En
  // Vitest se resuelven a undefined por defecto; los tests pasan opciones
  // explícitas para no depender del env.
  const baseUrl =
    typeof import.meta.env !== 'undefined'
      ? (import.meta.env.PUBLIC_API_BASE_URL as string | undefined)
      : undefined;

  if (!baseUrl) {
    throw new Error(
      'apiClient requiere PUBLIC_API_BASE_URL (env) o un ApiClientOptions.baseUrl explícito.',
    );
  }

  return { baseUrl };
}

function buildUrl(baseUrl: string, path: string): string {
  const trimmedBase = baseUrl.replace(/\/$/, '');
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

export async function apiClient<TResponse = unknown>(
  path: string,
  init?: ApiRequestInit,
  options?: ApiClientOptions,
): Promise<TResponse | null> {
  const opts = options ?? resolveDefaultOptions();
  const url = buildUrl(opts.baseUrl, path);

  const method = init?.method ?? 'GET';
  const headers = new Headers(init?.headers);
  headers.set('accept', 'application/json');

  let body: BodyInit | undefined;
  if (init?.body !== undefined && init.body !== null) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.body);
  }

  const requestInit: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };
  if (body !== undefined) {
    requestInit.body = body;
  }
  if (init?.signal !== undefined) {
    requestInit.signal = init.signal;
  }

  let response: Response;
  try {
    response = await fetch(url, requestInit);
  } catch (err) {
    // Errores de red (DNS, CORS bloqueado por navegador, offline). Envolvemos
    // en ApiError con status 0 para que la capa superior distinga entre
    // "backend rechazó" y "no llegué al backend".
    const message = err instanceof Error ? err.message : 'network error';
    throw new ApiError(message, 0, null);
  }

  // 204 No Content: se resuelve a null. Cubre DELETE de citas / logout.
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `HTTP ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as TResponse;
}
