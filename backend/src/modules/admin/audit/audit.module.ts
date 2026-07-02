/**
 * AuditModule — expone AdminAuditLogService de forma global para que auth,
 * controladores admin y SystemStateService registren acciones sin acoplarse.
 */
import { Global, Module } from '@nestjs/common';
import { AdminAuditLogService } from './admin-audit-log.service';

@Global()
@Module({
  providers: [AdminAuditLogService],
  exports: [AdminAuditLogService],
})
export class AuditModule {}
