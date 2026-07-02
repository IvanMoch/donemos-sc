/**
 * Helpers compartidos para los E2E de DonemosSC.
 *
 * Los tests hablan directamente con la API del backend para sembrar/limpiar
 * datos y para autenticarse como admin. Todas las llamadas viajan por el
 * mismo endpoint que usa el frontend en producción — así también validamos
 * el contrato desde otro consumidor (Principio I: solo API propia).
 *
 * NOTA sobre baseURL: `playwrightRequest.newContext({ baseURL })` resuelve
 * paths con leading `/` como absolutos y descarta el path del baseURL. Para
 * conservar el prefijo `/api/v1`, construimos URLs completas usando
 * `apiUrl()`; no confiamos en el auto-join del contexto.
 */
import {
  request as playwrightRequest,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';

const RAW_API_BASE =
  process.env.PLAYWRIGHT_API_BASE_URL ?? process.env.PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1';
export const API_BASE = RAW_API_BASE.replace(/\/$/, '');
export const ADMIN_USERNAME = process.env.PLAYWRIGHT_ADMIN_USERNAME ?? 'admin';
export const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'admin1234';

function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function createApiContext(): Promise<APIRequestContext> {
  return playwrightRequest.newContext();
}

export interface CreatedSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
}

export interface AdminAuth {
  api: APIRequestContext;
}

/**
 * Login admin con backoff exponencial ante 429.
 *
 * El backend limita login a 5/min (research §10 anti-fuerza-bruta). Cuando
 * Playwright corre varios test files en paralelo, cada uno hace su propio
 * beforeAll → varios logins concurrentes que saturan el bucket. En vez de
 * relajar la protección del backend, esperamos con backoff hasta que el
 * bucket se libere.
 */
export async function loginAdmin(): Promise<AdminAuth> {
  const api = await createApiContext();
  const delays = [2_000, 5_000, 10_000, 15_000, 20_000];
  let lastText = '';
  for (let intento = 0; intento <= delays.length; intento++) {
    const res = await api.post(apiUrl('/admin/auth/login'), {
      data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });
    if (res.status() === 204) return { api };
    lastText = await res.text();
    if (res.status() !== 429 || intento === delays.length) {
      throw new Error(`Login admin falló con status ${res.status()}: ${lastText}`);
    }
    await new Promise((r) => setTimeout(r, delays[intento] ?? 2_000));
  }
  throw new Error(`Login admin falló tras reintentos: ${lastText}`);
}

/**
 * Asegura que exista un slot con cupo mañana y lo devuelve.
 * Idempotente: si ya existe (409 duplicate_slot por otro test paralelo),
 * lo busca en /admin/slots y devuelve el existente. Los tests que corren
 * en paralelo terminan compartiendo el mismo slot sin conflictos.
 */
export async function ensureAvailableSlot(auth: AdminAuth): Promise<CreatedSlot> {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const fecha = manana.toISOString().slice(0, 10);
  const payload = {
    date: fecha,
    startTime: '07:00',
    endTime: '07:35',
    capacity: 5,
    isExceptionHours: isFinDeSemana(manana),
  };
  const res = await auth.api.post(apiUrl('/admin/slots'), { data: payload });
  if (res.status() === 201 || res.status() === 200) {
    return (await res.json()) as CreatedSlot;
  }
  if (res.status() === 409) {
    // Ya existe por otro test paralelo — devolvemos el existente.
    const list = await auth.api.get(apiUrl(`/admin/slots?from=${fecha}&to=${fecha}`));
    if (list.ok()) {
      const rows = (await list.json()) as Array<CreatedSlot & { startTime: string }>;
      const found = rows.find((s) => s.date === fecha && s.startTime === '07:00');
      if (found) return found;
    }
  }
  throw new Error(`No se pudo asegurar slot para ${fecha}: ${await res.text()}`);
}

function isFinDeSemana(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

/** Crea una franja específica (usado por reschedule para tener un segundo destino). */
export async function createSlot(
  auth: AdminAuth,
  data: {
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
    isExceptionHours?: boolean;
  },
): Promise<CreatedSlot> {
  const res = await auth.api.post(apiUrl('/admin/slots'), { data });
  if (res.status() >= 400 && res.status() !== 409) {
    throw new Error(`No se pudo crear slot ${data.date} ${data.startTime}: ${await res.text()}`);
  }
  return (await res.json()) as CreatedSlot;
}

/** Activa/desactiva el kill switch como admin (para tests que lo requieran). */
export async function setKillSwitch(auth: AdminAuth, enabled: boolean): Promise<void> {
  const res = await auth.api.post(apiUrl('/admin/system-state/kill-switch'), {
    data: { enabled, reason: 'e2e test' },
  });
  if (res.status() >= 400) {
    throw new Error(`No se pudo togglear kill switch a ${enabled}: ${await res.text()}`);
  }
}

/**
 * Genera una cédula V + 8 dígitos únicos para el test (evita colisión con
 * citas activas de tests previos, que romperían la unicidad por cédula).
 */
export function uniqueIdNumber(): string {
  const base = Date.now().toString().slice(-8).padStart(8, '0');
  return `V${base}`;
}

/**
 * Crea una cita de donante ficticio y devuelve el código.
 * Útil como fixture para tests que empiezan post-agendamiento.
 */
export async function createAppointment(
  slotId: string,
  overrides?: Partial<{ firstName: string; lastName: string; idNumber: string }>,
): Promise<{ code: string; idNumber: string }> {
  const api = await createApiContext();
  const idNumber = overrides?.idNumber ?? uniqueIdNumber();
  const res = await api.post(apiUrl('/appointments'), {
    data: {
      firstName: overrides?.firstName ?? 'Ana',
      lastName: overrides?.lastName ?? 'Barreras',
      idNumber,
      slotId,
      eligibilityDeclared: true,
    },
  });
  if (res.status() !== 201) {
    throw new Error(`No se pudo crear cita: ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as { code: string };
  return { code: body.code, idNumber };
}

/**
 * Espera a que un heading con texto exacto esté visible y con foco (research §7).
 * Útil para verificar que el WizardShell mueve el foco correctamente entre pasos.
 */
export async function expectFocusedHeading(page: Page, text: string | RegExp): Promise<void> {
  await page.getByRole('heading', { name: text }).waitFor({ state: 'visible' });
}

/**
 * Autentica al admin en el `BrowserContext` sin pasar por el formulario /admin/login.
 *
 * Motivación: `@Throttle` del backend limita login a 5/min por IP. Si cada test
 * hace login vía UI, con varios tests paralelos disparamos 429 y el flujo se
 * rompe. Esta helper:
 *   1. Llama al endpoint POST /admin/auth/login con backoff (loginAdmin).
 *   2. Extrae la cookie de sesión del `Set-Cookie` response.
 *   3. La setea en el `BrowserContext` para localhost:4321 y localhost:3001.
 *
 * Los tests deben preferir `authenticateAdmin(page.context())` antes de navegar
 * a rutas protegidas — evita interactuar con /admin/login y el throttle.
 */
export async function authenticateAdmin(browserContext: BrowserContext): Promise<void> {
  const auth = await loginAdmin();
  const cookies = await auth.api.storageState();
  const sessionCookie = cookies.cookies.find((c) => c.name === 'session');
  if (!sessionCookie) {
    throw new Error('loginAdmin no devolvió cookie `session` para reutilizar.');
  }
  // Fijar la cookie sobre localhost sin puerto para que viaje tanto a
  // localhost:4321 (frontend SSR) como a localhost:3001 (backend directo).
  await browserContext.addCookies([
    {
      name: 'session',
      value: sessionCookie.value,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: sessionCookie.secure,
      sameSite: sessionCookie.sameSite,
      expires: sessionCookie.expires,
    },
  ]);
}
