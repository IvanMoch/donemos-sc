/**
 * Wrappers tipados sobre `apiClient` que exponen la API pública y admin
 * de DonemosSC como funciones nombradas. Todos los tipos derivan del
 * contrato compartido en `@donemos/shared` para respetar Principio II
 * (una sola fuente de verdad).
 *
 * Convenciones:
 *  - Las funciones públicas viven en `publicApi.*`; las admin en `adminApi.*`.
 *  - Cada función acepta un `ApiClientOptions` opcional para poder inyectar
 *    baseUrl en SSR (Astro sirve desde el server, el env allí es distinto al
 *    del cliente) y en tests. En cliente, se resuelve desde import.meta.env.
 *  - Errores se propagan como `ApiError`; las capas superiores deciden UX.
 */
import type {
  CreateAppointmentInput,
  CreateSlotInput,
  DisableSlotInput,
  LoginInput,
  LookupInput,
  PublicSlot,
  RescheduleInput,
  ToggleKillSwitchInput,
  UpdateSlotInput,
} from '@donemos/shared';
import { apiClient, type ApiClientOptions } from './api-client';

// -- Tipos de respuesta compartidos ---------------------------------------

export interface SystemStatus {
  appointmentsDisabled: boolean;
}

export interface SystemStateFull extends SystemStatus {
  updatedAt: string | null;
  updatedBy: string | null;
  reason: string | null;
}

export interface DonationInfo {
  hospital: { name: string; mapUrl: string; address?: string };
  schedule: string;
  requirements: string[];
  considerations: string[];
}

export interface AppointmentSlotSummary {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  remainingCapacity: number;
}

export interface AppointmentConfirmation {
  code: string;
  slot: AppointmentSlotSummary;
  hospital: { name: string; mapUrl: string };
  reminders: string[];
}

export interface AppointmentDetail {
  code: string;
  status: 'active' | 'cancelled_by_donor' | 'cancelled_by_bank' | 'attended' | 'no_show';
  cancellationReason: string | null;
  slot: AppointmentSlotSummary;
  hospital: { name: string; mapUrl: string };
}

export interface AdminProfile {
  id: string;
  username: string;
  displayName?: string;
}

export interface AdminSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  usedCapacity: number;
  remainingCapacity: number;
  isDisabled: boolean;
  isExceptionHours: boolean;
  disabledReason: string | null;
}

export interface AdminAppointment {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  status: string;
  slot: { id: string; date: string; startTime: string; endTime: string };
  createdAt: string;
  cancelledAt: string | null;
}

// -- Público --------------------------------------------------------------

export const publicApi = {
  getSystemStatus(options?: ApiClientOptions): Promise<SystemStatus> {
    return apiClient<SystemStatus>('/system/status', undefined, options) as Promise<SystemStatus>;
  },

  getDonationInfo(options?: ApiClientOptions): Promise<DonationInfo> {
    return apiClient<DonationInfo>('/content/donation-info', undefined, options) as Promise<DonationInfo>;
  },

  listSlots(
    query?: { from?: string; to?: string },
    options?: ApiClientOptions,
  ): Promise<PublicSlot[]> {
    const params = new URLSearchParams();
    if (query?.from) params.set('from', query.from);
    if (query?.to) params.set('to', query.to);
    const qs = params.toString();
    return apiClient<PublicSlot[]>(
      qs ? `/slots?${qs}` : '/slots',
      undefined,
      options,
    ) as Promise<PublicSlot[]>;
  },

  createAppointment(
    input: CreateAppointmentInput,
    options?: ApiClientOptions,
  ): Promise<AppointmentConfirmation> {
    return apiClient<AppointmentConfirmation>(
      '/appointments',
      { method: 'POST', body: input },
      options,
    ) as Promise<AppointmentConfirmation>;
  },

  lookupAppointment(input: LookupInput, options?: ApiClientOptions): Promise<AppointmentDetail> {
    return apiClient<AppointmentDetail>(
      '/appointments/lookup',
      { method: 'POST', body: input },
      options,
    ) as Promise<AppointmentDetail>;
  },

  cancelAppointment(
    code: string,
    input: { idNumber: string },
    options?: ApiClientOptions,
  ): Promise<AppointmentDetail> {
    return apiClient<AppointmentDetail>(
      `/appointments/${encodeURIComponent(code)}/cancel`,
      { method: 'POST', body: input },
      options,
    ) as Promise<AppointmentDetail>;
  },

  rescheduleAppointment(
    code: string,
    input: RescheduleInput,
    options?: ApiClientOptions,
  ): Promise<AppointmentConfirmation> {
    return apiClient<AppointmentConfirmation>(
      `/appointments/${encodeURIComponent(code)}/reschedule`,
      { method: 'PATCH', body: input },
      options,
    ) as Promise<AppointmentConfirmation>;
  },
};

// -- Admin ----------------------------------------------------------------

export const adminApi = {
  login(input: LoginInput, options?: ApiClientOptions): Promise<null> {
    return apiClient<null>(
      '/admin/auth/login',
      { method: 'POST', body: input },
      options,
    ) as Promise<null>;
  },

  logout(options?: ApiClientOptions): Promise<null> {
    return apiClient<null>('/admin/auth/logout', { method: 'POST' }, options) as Promise<null>;
  },

  me(options?: ApiClientOptions): Promise<AdminProfile> {
    return apiClient<AdminProfile>('/admin/me', undefined, options) as Promise<AdminProfile>;
  },

  listSlots(
    query?: { from?: string; to?: string; includeDisabled?: boolean },
    options?: ApiClientOptions,
  ): Promise<AdminSlot[]> {
    const params = new URLSearchParams();
    if (query?.from) params.set('from', query.from);
    if (query?.to) params.set('to', query.to);
    if (query?.includeDisabled) params.set('includeDisabled', 'true');
    const qs = params.toString();
    return apiClient<AdminSlot[]>(
      qs ? `/admin/slots?${qs}` : '/admin/slots',
      undefined,
      options,
    ) as Promise<AdminSlot[]>;
  },

  createSlot(input: CreateSlotInput, options?: ApiClientOptions): Promise<AdminSlot> {
    return apiClient<AdminSlot>(
      '/admin/slots',
      { method: 'POST', body: input },
      options,
    ) as Promise<AdminSlot>;
  },

  updateSlot(id: string, input: UpdateSlotInput, options?: ApiClientOptions): Promise<AdminSlot> {
    return apiClient<AdminSlot>(
      `/admin/slots/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: input },
      options,
    ) as Promise<AdminSlot>;
  },

  disableSlot(
    id: string,
    input: DisableSlotInput,
    options?: ApiClientOptions,
  ): Promise<{ slot: AdminSlot; cancelledAppointments: number }> {
    return apiClient<{ slot: AdminSlot; cancelledAppointments: number }>(
      `/admin/slots/${encodeURIComponent(id)}/disable`,
      { method: 'POST', body: input },
      options,
    ) as Promise<{ slot: AdminSlot; cancelledAppointments: number }>;
  },

  listAppointments(
    query?: { from?: string; to?: string; status?: string },
    options?: ApiClientOptions,
  ): Promise<AdminAppointment[]> {
    const params = new URLSearchParams();
    if (query?.from) params.set('from', query.from);
    if (query?.to) params.set('to', query.to);
    if (query?.status) params.set('status', query.status);
    const qs = params.toString();
    return apiClient<AdminAppointment[]>(
      qs ? `/admin/appointments?${qs}` : '/admin/appointments',
      undefined,
      options,
    ) as Promise<AdminAppointment[]>;
  },

  /**
   * Devuelve la URL absoluta del endpoint de export PDF. El navegador la usa
   * como `href` para forzar descarga; no llamamos con apiClient porque el
   * cuerpo es binario y queremos el Content-Disposition del servidor.
   */
  exportPdfUrl(query?: { from?: string; to?: string }): string {
    const params = new URLSearchParams();
    if (query?.from) params.set('from', query.from);
    if (query?.to) params.set('to', query.to);
    const qs = params.toString();
    const base =
      (typeof import.meta.env !== 'undefined'
        ? (import.meta.env.PUBLIC_API_BASE_URL as string | undefined)
        : undefined) ?? '';
    return `${base.replace(/\/$/, '')}/admin/appointments/export.pdf${qs ? `?${qs}` : ''}`;
  },

  getSystemState(options?: ApiClientOptions): Promise<SystemStateFull> {
    return apiClient<SystemStateFull>(
      '/admin/system-state',
      undefined,
      options,
    ) as Promise<SystemStateFull>;
  },

  toggleKillSwitch(
    input: ToggleKillSwitchInput,
    options?: ApiClientOptions,
  ): Promise<SystemStateFull> {
    return apiClient<SystemStateFull>(
      '/admin/system-state/kill-switch',
      { method: 'POST', body: input },
      options,
    ) as Promise<SystemStateFull>;
  },
};
