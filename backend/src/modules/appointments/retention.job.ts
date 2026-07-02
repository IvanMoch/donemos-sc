/**
 * RetentionJob (T140) — anonimización de datos personales a los 90 días
 * (research §12). Cron diario: las citas en estado final cuya fecha de slot
 * superó el umbral pierden nombre/apellido ('***') y su cédula se reemplaza por
 * un hash HMAC-SHA256 irreversible con prefijo 'H_'. El umbral es 90 días, o
 * TEST_REDACTION_DAYS si está definido (tests).
 */
import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';

const ESTADOS_FINALES = ['attended', 'no_show', 'cancelled_by_donor', 'cancelled_by_bank'];

@Injectable()
export class RetentionJob {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron(): Promise<void> {
    await this.run();
  }

  /** Ejecuta la anonimización y devuelve cuántas citas se redactaron. */
  async run(): Promise<number> {
    const dias = Number(process.env.TEST_REDACTION_DAYS ?? 90);
    const pepper = process.env.REDACTION_PEPPER ?? '';

    const candidatas = await this.prisma.$queryRawUnsafe<Array<{ id: string; idNumber: string }>>(
      `SELECT a.id, a.id_number AS "idNumber"
         FROM appointment a
         JOIN slot s ON s.id = a.slot_id
        WHERE a.status = ANY($1::text[])
          AND a.redacted_at IS NULL
          AND s.date < (CURRENT_DATE - $2::int)`,
      ESTADOS_FINALES,
      dias,
    );

    const ahora = new Date();
    for (const c of candidatas) {
      const hash = `H_${createHmac('sha256', pepper).update(c.idNumber).digest('hex').slice(0, 20)}`;
      await this.prisma.appointment.update({
        where: { id: c.id },
        data: { firstName: '***', lastName: '***', idNumber: hash, redactedAt: ahora },
      });
    }
    return candidatas.length;
  }
}
