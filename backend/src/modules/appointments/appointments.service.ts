/**
 * AppointmentsService (T069) — orquesta la creación de una cita:
 * normaliza la cédula (T032), genera el código Nano ID (T031), delega la
 * transacción al repositorio y arma la confirmación (AppointmentConfirmation).
 * Mapea la violación del índice único parcial (P2002) a 409 duplicate.
 */
import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreateAppointmentInput } from '@donemos/shared';
import { generateAppointmentCode } from '../../common/utils/appointment-code';
import { normalizeIdNumber } from '../../common/utils/id-number';
import { AppointmentsRepository } from './appointments.repository';

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

@Injectable()
export class AppointmentsService {
  constructor(private readonly repo: AppointmentsRepository) {}

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
}
