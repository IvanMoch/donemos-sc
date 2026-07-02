/**
 * SystemStateService (T028) — lectura del kill switch global (research §5).
 *
 * El estado vive en el singleton `system_state`. Se cachea en memoria durante
 * un TTL corto (5 s) para no golpear la BD en cada request público pero
 * propagar los cambios del admin casi de inmediato. `invalidate()` permite al
 * flujo admin (toggle) forzar una relectura tras un cambio.
 */
import { Injectable } from '@nestjs/common';
import type { SystemStatus } from '@donemos/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

const CACHE_TTL_MS = 5_000;

@Injectable()
export class SystemStateService {
  private cache: { valor: SystemStatus; capturadoEn: number } | undefined = undefined;

  constructor(private readonly prisma: PrismaService) {}

  async getState(): Promise<SystemStatus> {
    const ahora = Date.now();
    if (this.cache && ahora - this.cache.capturadoEn < CACHE_TTL_MS) {
      return this.cache.valor;
    }

    const fila = await this.prisma.systemState.findUnique({ where: { id: 1 } });
    const valor: SystemStatus = {
      appointmentsDisabled: fila?.appointmentsDisabled ?? false,
      reason: fila?.disabledReason ?? null,
    };
    this.cache = { valor, capturadoEn: ahora };
    return valor;
  }

  /** Descarta el cache para que la próxima lectura consulte la BD. */
  invalidate(): void {
    this.cache = undefined;
  }
}
