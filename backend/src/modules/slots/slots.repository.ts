/**
 * SlotsRepository (T064) — acceso a franjas para el flujo público.
 *
 * `findPublic` devuelve solo franjas visibles al donante: no deshabilitadas,
 * dentro del rango de fechas, y con cupo restante > 0 (FR-004, FR-013). El
 * `remainingCapacity` se computa en SQL como capacity − citas activas, con
 * FILTER para contar únicamente las `active`. Se ordena por fecha/hora.
 */
import { Injectable } from '@nestjs/common';
import type { PublicSlot } from '@donemos/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

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
}
