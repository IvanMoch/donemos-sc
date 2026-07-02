/**
 * AppointmentsService (T069) — orquesta la creación de una cita:
 * normaliza la cédula (T032), genera el código Nano ID (T031), delega la
 * transacción al repositorio y arma la confirmación (AppointmentConfirmation).
 * Mapea la violación del índice único parcial (P2002) a 409 duplicate.
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreateAppointmentInput } from '@donemos/shared';
import { generateAppointmentCode } from '../../common/utils/appointment-code';
import { normalizeIdNumber } from '../../common/utils/id-number';
import { SystemStateService } from '../system-state/system-state.service';
import { AppointmentsRepository, type AppointmentDetail } from './appointments.repository';

const HOSPITAL = {
  name: 'Hospital Central de San Cristóbal',
  mapUrl: 'https://maps.app.goo.gl/Qu1wBKkyzh4RThGi6',
} as const;

const RECORDATORIOS = [
  'Trae tu cédula de identidad vigente.',
  'Ven bien desayunado; no te presentes en ayunas.',
  'Descansa bien la noche anterior.',
];

export interface AppointmentConfirmation {
  code: string;
  slot: { id: string; date: string; startTime: string; endTime: string; remainingCapacity: number };
  hospital: { name: string; mapUrl: string };
  reminders: string[];
}

export interface AppointmentDetailResponse {
  code: string;
  status: string;
  cancellationReason: string | null;
  slot: { id: string; date: string; startTime: string; endTime: string; remainingCapacity: number };
  hospital: { name: string; mapUrl: string };
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly repo: AppointmentsRepository,
    private readonly systemState: SystemStateService,
  ) {}

  async create(input: CreateAppointmentInput): Promise<AppointmentConfirmation> {
    const data = {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      idNumber: normalizeIdNumber(input.idNumber),
      slotId: input.slotId,
    };

    try {
      const creada = await this.repo.createInTransaction(data, generateAppointmentCode());
      return { ...creada, hospital: { ...HOSPITAL }, reminders: [...RECORDATORIOS] };
    } catch (error) {
      // El índice parcial único (una cita activa por cédula) puede saltar ante
      // una carrera entre franjas distintas: se traduce al mismo 409 de negocio.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          error: 'duplicate_active_appointment',
          code: 'duplicate_active_appointment',
          message: 'Ya existe una cita activa con esa cédula.',
        });
      }
      throw error;
    }
  }

  /** Consulta una cita por código + cédula (US2). 404 genérico si no existe (FR-016). */
  async lookup(code: string, idNumber: string): Promise<AppointmentDetailResponse> {
    const detalle = await this.repo.findByCodeAndIdNumber(code, normalizeIdNumber(idNumber));
    if (!detalle) throw this.noEncontrada();
    return this.aRespuestaDetalle(detalle);
  }

  /** Cancela la cita (cancelled_by_donor). Funciona con kill switch activo (FR-023b). */
  async cancel(code: string, idNumber: string): Promise<AppointmentDetailResponse> {
    const detalle = await this.repo.findByCodeAndIdNumber(code, normalizeIdNumber(idNumber));
    if (!detalle) throw this.noEncontrada();
    if (detalle.status !== 'active') {
      // Ya finalizada: idempotente, se devuelve el estado actual.
      return this.aRespuestaDetalle(detalle);
    }
    const cancelada = await this.repo.cancelByDonor(detalle.appointmentId);
    return this.aRespuestaDetalle(cancelada);
  }

  /** Reagenda a otro slot conservando el código (US2). 409 si el kill switch está activo (V10). */
  async reschedule(code: string, idNumber: string, newSlotId: string): Promise<AppointmentConfirmation> {
    const detalle = await this.repo.findByCodeAndIdNumber(code, normalizeIdNumber(idNumber));
    if (!detalle) throw this.noEncontrada();

    const { appointmentsDisabled } = await this.systemState.getState();
    if (appointmentsDisabled) {
      throw new ConflictException({
        error: 'kill_switch_active',
        code: 'kill_switch_active',
        message: 'El reagendamiento está temporalmente deshabilitado.',
      });
    }

    const reagendada = await this.repo.rescheduleInTransaction(detalle.appointmentId, newSlotId);
    return { code: reagendada.code, slot: reagendada.slot, hospital: { ...HOSPITAL }, reminders: [...RECORDATORIOS] };
  }

  private noEncontrada(): NotFoundException {
    return new NotFoundException({ error: 'not_found', message: 'No encontramos una cita con esos datos.' });
  }

  private aRespuestaDetalle(d: AppointmentDetail): AppointmentDetailResponse {
    return {
      code: d.code,
      status: d.status,
      cancellationReason: d.cancellationReason,
      slot: d.slot,
      hospital: { ...HOSPITAL },
    };
  }
}
