/**
 * HealthController (T067) — GET /health.
 * Verifica que el proceso responde y que Postgres contesta un ping (research §13).
 * Devuelve { status: 'ok', db: 'ok' | 'down' } (contrato Health).
 */
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check(): Promise<{ status: 'ok'; db: 'ok' | 'down' }> {
    return this.ready();
  }

  /** Liveness (T144): el proceso responde; no depende de la BD. */
  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /** Readiness (T144): incluye ping a Postgres. */
  @Get('ready')
  async ready(): Promise<{ status: 'ok'; db: 'ok' | 'down' }> {
    let db: 'ok' | 'down' = 'ok';
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
    } catch {
      db = 'down';
    }
    return { status: 'ok', db };
  }
}
