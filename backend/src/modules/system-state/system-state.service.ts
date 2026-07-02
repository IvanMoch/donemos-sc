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
import { AdminAuditLogService } from '../admin/audit/admin-audit-log.service';

const CACHE_TTL_MS = 5_000;

export interface SystemStateFull {
  appointmentsDisabled: boolean;
  disabledAt: string | null;
  reason: string | null;
}

@Injectable()
export class SystemStateService {
  private cache: { valor: SystemStatus; capturadoEn: number } | undefined = undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditLogService,
  ) {}

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

  /** Estado completo para el panel admin. */
  async getFullState(): Promise<SystemStateFull> {
    const fila = await this.prisma.systemState.findUnique({ where: { id: 1 } });
    return {
      appointmentsDisabled: fila?.appointmentsDisabled ?? false,
      disabledAt: fila?.disabledAt ? fila.disabledAt.toISOString() : null,
      reason: fila?.disabledReason ?? null,
    };
  }

  /** Activa/desactiva el kill switch (T129), invalida el cache y audita la acción. */
  async toggle(adminId: string, enabled: boolean, reason: string | null): Promise<SystemStateFull> {
    await this.prisma.systemState.update({
      where: { id: 1 },
      data: {
        appointmentsDisabled: enabled,
        disabledAt: enabled ? new Date() : null,
        disabledByAdminId: enabled ? adminId : null,
        disabledReason: enabled ? reason : null,
      },
    });
    this.invalidate();
    await this.audit.record({
      adminId,
      action: enabled ? 'kill_switch_on' : 'kill_switch_off',
      targetType: 'system_state',
      ...(reason ? { payload: { reason } } : {}),
    });
    return this.getFullState();
  }

  /** Descarta el cache para que la próxima lectura consulte la BD. */
  invalidate(): void {
    this.cache = undefined;
  }
}
