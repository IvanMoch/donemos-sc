/**
 * SystemStateModule — expone SystemStateService de forma global.
 *
 * Global porque tanto el KillSwitchGuard (común) como el controlador público de
 * estado (T062) y el flujo admin (T129) necesitan el mismo servicio y su cache
 * compartido. El controlador público se registra en su tarea de US1.
 */
import { Global, Module } from '@nestjs/common';
import { SystemStateService } from './system-state.service';

@Global()
@Module({
  providers: [SystemStateService],
  exports: [SystemStateService],
})
export class SystemStateModule {}
