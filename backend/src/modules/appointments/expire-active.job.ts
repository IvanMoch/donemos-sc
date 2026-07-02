/**
 * ExpireActiveJob (T141) — marca como `no_show` las citas `active` cuyo slot ya
 * terminó hace más de 2 horas (por defecto). Cron horario. El timestamp del fin
 * del slot se arma como `date + end_time` y se compara con `now() - 2h`.
 */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ExpireActiveJob {
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    await this.run();
  }

  /** Marca no_show las citas activas vencidas; devuelve cuántas cambiaron. */
  async run(): Promise<number> {
    const afectadas = await this.prisma.$executeRawUnsafe(
      `UPDATE appointment
          SET status = 'no_show', updated_at = now()
        WHERE status = 'active'
          AND id IN (
            SELECT a.id FROM appointment a
              JOIN slot s ON s.id = a.slot_id
             WHERE (s.date + s.end_time) < (now() - interval '2 hours')
          )`,
    );
    return afectadas;
  }
}
