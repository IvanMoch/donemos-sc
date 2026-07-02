/**
 * AppointmentsRepository (T068) — creación de citas con control de concurrencia.
 *
 * `createInTransaction` abre una transacción SERIALIZABLE y bloquea la fila de
 * la franja con SELECT ... FOR UPDATE (research §4): dos solicitudes al mismo
 * cupo se serializan y la segunda ve la capacidad agotada, sin sobreventa
 * (SC-009). Dentro de la transacción valida cupo y unicidad de cita activa por
 * cédula (FR-007, FR-008) antes de insertar.
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CreateAppointmentData {
  firstName: string;
  lastName: string;
  idNumber: string;
  slotId: string;
}

export interface CreatedAppointment {
  code: string;
  slot: { id: string; date: string; startTime: string; endTime: string; remainingCapacity: number };
}

export interface AppointmentDetail {
  appointmentId: string;
  code: string;
  status: string;
  cancellationReason: string | null;
  slot: { id: string; date: string; startTime: string; endTime: string; remainingCapacity: number };
}

interface FilaDetalle {
  appointmentId: string;
  code: string;
  status: string;
  cancellationReason: string | null;
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  remainingCapacity: number;
}

interface FilaSlot {
  id: string;
  capacity: number;
  date: string;
  startTime: string;
  endTime: string;
}

@Injectable()
export class AppointmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createInTransaction(data: CreateAppointmentData, code: string): Promise<CreatedAppointment> {
    // SERIALIZABLE + reintento controlado (research §4): ante dos solicitudes al
    // mismo cupo, Postgres aborta una con fallo de serialización (P2034) porque
    // el COUNT es una lectura afectada por el INSERT de la otra. Al reintentar,
    // la perdedora ya ve el cupo lleno y termina en 409 slot_full (no en 500).
    const MAX_INTENTOS = 3;
    for (let intento = 1; ; intento += 1) {
      try {
        return await this.ejecutarTransaccion(data, code);
      } catch (error) {
        const esConflictoSerializacion =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (esConflictoSerializacion && intento < MAX_INTENTOS) continue;
        throw error;
      }
    }
  }

  private ejecutarTransaccion(data: CreateAppointmentData, code: string): Promise<CreatedAppointment> {
    return this.prisma.$transaction(
      async (tx) => {
        // Bloquea la franja (FOR UPDATE): serializa a los solicitantes del mismo cupo.
        const filas = await tx.$queryRawUnsafe<FilaSlot[]>(
          `SELECT id, capacity,
                  to_char(date, 'YYYY-MM-DD')    AS "date",
                  to_char(start_time, 'HH24:MI') AS "startTime",
                  to_char(end_time, 'HH24:MI')   AS "endTime"
             FROM slot
            WHERE id = $1::uuid AND is_disabled = false
            FOR UPDATE`,
          data.slotId,
        );
        const slot = filas[0];
        if (!slot) {
          throw new NotFoundException({ error: 'slot_not_found', message: 'La franja no existe o no está disponible.' });
        }

        // Una sola cita activa por cédula (FR-007).
        const duplicadas = await tx.appointment.count({
          where: { idNumber: data.idNumber, status: 'active' },
        });
        if (duplicadas > 0) {
          throw new ConflictException({
            error: 'duplicate_active_appointment',
            code: 'duplicate_active_appointment',
            message: 'Ya existe una cita activa con esa cédula.',
          });
        }

        // Cupo disponible (FR-008).
        const activas = await tx.appointment.count({ where: { slotId: data.slotId, status: 'active' } });
        if (activas >= slot.capacity) {
          throw new ConflictException({
            error: 'slot_full',
            code: 'slot_full',
            message: 'La franja seleccionada ya no tiene cupo.',
          });
        }

        await tx.appointment.create({
          data: {
            code,
            slotId: data.slotId,
            firstName: data.firstName,
            lastName: data.lastName,
            idNumber: data.idNumber,
            status: 'active',
            eligibilityDeclaredAt: new Date(),
          },
        });

        return {
          code,
          slot: {
            id: slot.id,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            remainingCapacity: slot.capacity - activas - 1,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /** Busca la cita por la pareja código+cédula (autorización). null si no existe. */
  async findByCodeAndIdNumber(code: string, idNumber: string): Promise<AppointmentDetail | null> {
    const filas = await this.prisma.$queryRawUnsafe<FilaDetalle[]>(
      `SELECT a.id AS "appointmentId", a.code, a.status,
              a.cancellation_reason AS "cancellationReason",
              s.id AS "slotId",
              to_char(s.date, 'YYYY-MM-DD')    AS "date",
              to_char(s.start_time, 'HH24:MI') AS "startTime",
              to_char(s.end_time, 'HH24:MI')   AS "endTime",
              (s.capacity - (SELECT count(*) FROM appointment x WHERE x.slot_id = s.id AND x.status = 'active'))::int AS "remainingCapacity"
         FROM appointment a
         JOIN slot s ON s.id = a.slot_id
        WHERE a.code = $1 AND a.id_number = $2`,
      code,
      idNumber,
    );
    const fila = filas[0];
    return fila ? this.aDetalle(fila) : null;
  }

  /** Cancela por decisión del donante (cancelled_by_donor). Devuelve el detalle actualizado. */
  async cancelByDonor(appointmentId: string): Promise<AppointmentDetail> {
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'cancelled_by_donor', cancelledAt: new Date() },
    });
    return this.detalleObligatorioPorId(appointmentId);
  }

  /**
   * Reagenda moviendo la cita al nuevo slot (mismo código, sigue activa). El cupo
   * del slot viejo se libera solo (se cuenta por citas activas) y el nuevo se
   * consume. SERIALIZABLE + FOR UPDATE + reintento: dos reagendamientos al mismo
   * cupo se serializan y el perdedor recibe slot_full.
   */
  async rescheduleInTransaction(appointmentId: string, newSlotId: string): Promise<AppointmentDetail> {
    const MAX_INTENTOS = 3;
    for (let intento = 1; ; intento += 1) {
      try {
        return await this.ejecutarReschedule(appointmentId, newSlotId);
      } catch (error) {
        const esConflictoSerializacion =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (esConflictoSerializacion && intento < MAX_INTENTOS) continue;
        throw error;
      }
    }
  }

  private async ejecutarReschedule(appointmentId: string, newSlotId: string): Promise<AppointmentDetail> {
    await this.prisma.$transaction(
      async (tx) => {
        const filas = await tx.$queryRawUnsafe<FilaSlot[]>(
          `SELECT id, capacity,
                  to_char(date, 'YYYY-MM-DD')    AS "date",
                  to_char(start_time, 'HH24:MI') AS "startTime",
                  to_char(end_time, 'HH24:MI')   AS "endTime"
             FROM slot
            WHERE id = $1::uuid AND is_disabled = false
            FOR UPDATE`,
          newSlotId,
        );
        const slot = filas[0];
        if (!slot) {
          throw new NotFoundException({ error: 'slot_not_found', message: 'La nueva franja no existe o no está disponible.' });
        }

        // Cupo del nuevo slot (esta cita aún vive en el slot viejo, no se cuenta acá).
        const activas = await tx.appointment.count({
          where: { slotId: newSlotId, status: 'active', id: { not: appointmentId } },
        });
        if (activas >= slot.capacity) {
          throw new ConflictException({
            error: 'slot_full',
            code: 'slot_full',
            message: 'La nueva franja ya no tiene cupo.',
          });
        }

        await tx.appointment.update({ where: { id: appointmentId }, data: { slotId: newSlotId } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.detalleObligatorioPorId(appointmentId);
  }

  private async detalleObligatorioPorId(appointmentId: string): Promise<AppointmentDetail> {
    const filas = await this.prisma.$queryRawUnsafe<FilaDetalle[]>(
      `SELECT a.id AS "appointmentId", a.code, a.status,
              a.cancellation_reason AS "cancellationReason",
              s.id AS "slotId",
              to_char(s.date, 'YYYY-MM-DD')    AS "date",
              to_char(s.start_time, 'HH24:MI') AS "startTime",
              to_char(s.end_time, 'HH24:MI')   AS "endTime",
              (s.capacity - (SELECT count(*) FROM appointment x WHERE x.slot_id = s.id AND x.status = 'active'))::int AS "remainingCapacity"
         FROM appointment a
         JOIN slot s ON s.id = a.slot_id
        WHERE a.id = $1::uuid`,
      appointmentId,
    );
    const fila = filas[0];
    if (!fila) {
      throw new NotFoundException({ error: 'not_found', message: 'No encontramos una cita con esos datos.' });
    }
    return this.aDetalle(fila);
  }

  private aDetalle(fila: FilaDetalle): AppointmentDetail {
    return {
      appointmentId: fila.appointmentId,
      code: fila.code,
      status: fila.status,
      cancellationReason: fila.cancellationReason,
      slot: {
        id: fila.slotId,
        date: fila.date,
        startTime: fila.startTime,
        endTime: fila.endTime,
        remainingCapacity: fila.remainingCapacity,
      },
    };
  }
}
