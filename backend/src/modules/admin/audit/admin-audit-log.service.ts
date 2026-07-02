/**
 * AdminAuditLogService (T131) — registro append-only de acciones admin
 * (data-model.md §5). Inyectable y global: lo usan el servicio de auth, los
 * controladores admin y el SystemStateService. Nunca guarda PII de donantes.
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';

export type AdminAction =
  | 'login'
  | 'failed_login'
  | 'slot_created'
  | 'slot_updated'
  | 'slot_disabled'
  | 'kill_switch_on'
  | 'kill_switch_off'
  | 'pdf_exported';

export interface AuditEntry {
  adminId: string;
  action: AdminAction;
  targetType?: 'slot' | 'system_state' | 'report' | 'session' | undefined;
  targetId?: string | undefined;
  payload?: Prisma.InputJsonValue | undefined;
  ipAddress?: string | undefined;
}

@Injectable()
export class AdminAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    const data: Prisma.AdminAuditLogUncheckedCreateInput = {
      adminId: entry.adminId,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      ipAddress: entry.ipAddress ?? null,
    };
    if (entry.payload !== undefined) data.payload = entry.payload;
    await this.prisma.adminAuditLog.create({ data });
  }
}
