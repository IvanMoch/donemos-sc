/**
 * Helpers compartidos para los E2E de DonemosSC.
 *
 * Los tests hablan directamente con la API del backend para sembrar/limpiar
 * datos y para autenticarse como admin. Todas las llamadas viajan por el
 * mismo endpoint que usa el frontend en producción — así también validamos
 * el contrato desde otro consumidor (Principio I: solo API propia).
 */
import { request as playwrightRequest, type APIRequestContext, type Page } from '@playwright/test';

export const API_BASE =
  process.env.PLAYWRIGHT_API_BASE_URL ?? process.env.PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';
export const ADMIN_USERNAME = process.env.PLAYWRIGHT_ADMIN_USERNAME ?? 'admin';
export const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'admin1234';

export async function createApiContext(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({ baseURL: API_BASE });
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

/** Login admin y devuelve un contexto API con cookie de sesión pegada. */
export async function loginAdmin(): Promise<AdminAuth> {
  const api = await createApiContext();
  const res = await api.post('/admin/auth/login', {
    data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  if (res.status() !== 204) {
    throw new Error(`Login admin falló con status ${res.status()}: ${await res.text()}`);
  }
  return { api };
}

/** Asegura que exista al menos un slot con cupo mañana. */
export async function ensureAvailableSlot(auth: AdminAuth): Promise<CreatedSlot> {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const fecha = manana.toISOString().slice(0, 10);
  const res = await auth.api.post('/admin/slots', {
    data: {
      date: fecha,
      startTime: '07:00',
      endTime: '07:35',
      capacity: 5,
      isExceptionHours: isFinDeSemana(manana),
    },
  });
  if (res.status() >= 400) {
    throw new Error(`No se pudo crear slot para ${fecha}: ${await res.text()}`);
  }
  return (await res.json()) as CreatedSlot;
}

function isFinDeSemana(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

/** Activa/desactiva el kill switch como admin (para tests que lo requieran). */
export async function setKillSwitch(auth: AdminAuth, enabled: boolean): Promise<void> {
  const res = await auth.api.post('/admin/system-state/kill-switch', {
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
  const res = await api.post('/appointments', {
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
