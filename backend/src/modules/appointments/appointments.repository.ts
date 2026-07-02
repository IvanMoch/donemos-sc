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
}
