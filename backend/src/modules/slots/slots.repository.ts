/**
 * SlotsRepository (T064) — acceso a franjas para el flujo público.
 *
 * `findPublic` devuelve solo franjas visibles al donante: no deshabilitadas,
 * dentro del rango de fechas, y con cupo restante > 0 (FR-004, FR-013). El
 * `remainingCapacity` se computa en SQL como capacity − citas activas, con
 * FILTER para contar únicamente las `active`. Se ordena por fecha/hora.
 */
import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreateSlotInput, PublicSlot } from '@donemos/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AdminSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  usedCapacity: number;
  isDisabled: boolean;
  isExceptionHours: boolean;
  disabledReason: string | null;
  disabledAt: string | null;
}

type FilaSlotPrisma = {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  capacity: number;
  isDisabled: boolean;
  isExceptionHours: boolean;
  disabledReason: string | null;
  disabledAt: Date | null;
};

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function horaISO(d: Date): string {
  return d.toISOString().slice(11, 16);
}
function aFechaHora(fecha: string, hora: string): Date {
  return new Date(`${fecha === '' ? '1970-01-01' : fecha}T${hora}:00Z`);
}

@Injectable()
export class SlotsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic({ from, to }: { from: string; to: string }): Promise<PublicSlot[]> {
    // ::int evita devolver bigint (COUNT) que JSON no serializa.
    return this.prisma.$queryRawUnsafe<PublicSlot[]>(
      `SELECT s.id,
              to_char(s.date, 'YYYY-MM-DD')            AS "date",
              to_char(s.start_time, 'HH24:MI')         AS "startTime",
              to_char(s.end_time, 'HH24:MI')           AS "endTime",
              (s.capacity - COUNT(a.id) FILTER (WHERE a.status = 'active'))::int AS "remainingCapacity"
         FROM slot s
         LEFT JOIN appointment a ON a.slot_id = s.id
        WHERE s.is_disabled = false
          AND s.date BETWEEN $1::date AND $2::date
        GROUP BY s.id
       HAVING (s.capacity - COUNT(a.id) FILTER (WHERE a.status = 'active')) > 0
        ORDER BY s.date ASC, s.start_time ASC`,
      from,
      to,
    );
  }

  // ─── Métodos admin (T124) ────────────────────────────────────────────────

  /** Lista franjas para el panel; incluye deshabilitadas solo si se pide. */
  async findForAdmin(opts: { from?: string | undefined; to?: string | undefined; includeDisabled: boolean }): Promise<AdminSlot[]> {
    const where: Prisma.SlotWhereInput = {};
    if (!opts.includeDisabled) where.isDisabled = false;
    if (opts.from || opts.to) {
      where.date = {};
      if (opts.from) where.date.gte = aFechaHora(opts.from, '00:00');
      if (opts.to) where.date.lte = aFechaHora(opts.to, '00:00');
    }
    const slots = await this.prisma.slot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: { _count: { select: { appointments: { where: { status: 'active' } } } } },
    });
    return slots.map((s) => this.aAdminSlot(s, s._count.appointments));
  }

  /** Crea una franja. Traduce el duplicado (misma fecha+horas) a 409. */
  async createAdmin(input: CreateSlotInput): Promise<AdminSlot> {
    try {
      const slot = await this.prisma.slot.create({
        data: {
          date: aFechaHora(input.date, '00:00'),
          startTime: aFechaHora('', input.startTime),
          endTime: aFechaHora('', input.endTime),
          capacity: input.capacity,
          isExceptionHours: input.isExceptionHours,
        },
      });
      return this.aAdminSlot(slot, 0);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({ error: 'duplicate_slot', code: 'duplicate_slot', message: 'Ya existe una franja igual.' });
      }
      throw error;
    }
  }

  /** Edita horas/capacidad. Rechaza capacity < citas activas (409). */
  async updateAdmin(
    id: string,
    input: { startTime?: string | undefined; endTime?: string | undefined; capacity?: number | undefined },
  ): Promise<AdminSlot> {
    const usadas = await this.prisma.appointment.count({ where: { slotId: id, status: 'active' } });
    if (input.capacity !== undefined && input.capacity < usadas) {
      throw new ConflictException({
        error: 'capacity_below_used',
        code: 'capacity_below_used',
        message: `La capacidad no puede ser menor que las ${usadas} citas activas.`,
      });
    }
    const data: Prisma.SlotUpdateInput = {};
    if (input.startTime !== undefined) data.startTime = aFechaHora('', input.startTime);
    if (input.endTime !== undefined) data.endTime = aFechaHora('', input.endTime);
    if (input.capacity !== undefined) data.capacity = input.capacity;
    const slot = await this.prisma.slot.update({ where: { id }, data });
    return this.aAdminSlot(slot, usadas);
  }

  /**
   * Deshabilita la franja y cancela sus citas activas como cancelled_by_bank
   * (FR-020), en una transacción SERIALIZABLE. Devuelve cuántas se cancelaron.
   */
  async disableAdmin(id: string, reason: string | null, adminId: string): Promise<{ slot: AdminSlot; cancelledAppointments: number }> {
    return this.prisma.$transaction(
      async (tx) => {
        const canceladas = await tx.appointment.updateMany({
          where: { slotId: id, status: 'active' },
          data: { status: 'cancelled_by_bank', cancelledAt: new Date(), cancelledByAdminId: adminId, cancellationReason: reason },
        });
        const slot = await tx.slot.update({
          where: { id },
          data: { isDisabled: true, disabledAt: new Date(), disabledByAdminId: adminId, disabledReason: reason },
        });
        return { slot: this.aAdminSlot(slot, 0), cancelledAppointments: canceladas.count };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private aAdminSlot(s: FilaSlotPrisma, usedCapacity: number): AdminSlot {
    return {
      id: s.id,
      date: fechaISO(s.date),
      startTime: horaISO(s.startTime),
      endTime: horaISO(s.endTime),
      capacity: s.capacity,
      usedCapacity,
      isDisabled: s.isDisabled,
      isExceptionHours: s.isExceptionHours,
      disabledReason: s.disabledReason,
      disabledAt: s.disabledAt ? s.disabledAt.toISOString() : null,
    };
  }
}
