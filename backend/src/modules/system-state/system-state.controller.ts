/**
 * SystemStateController (T062) — vista pública del kill switch.
 * GET /system/status → { appointmentsDisabled, reason? }. El frontend lo lee
 * en SSR para decidir si muestra el flujo o el mensaje de pausa.
 */
import { Controller, Get } from '@nestjs/common';
import type { SystemStatus } from '@donemos/shared';
import { SystemStateService } from './system-state.service';

@Controller('system')
export class SystemStateController {
  constructor(private readonly systemState: SystemStateService) {}

  @Get('status')
  getStatus(): Promise<SystemStatus> {
    return this.systemState.getState();
  }
}
