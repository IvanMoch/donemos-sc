/**
 * AdminSystemStateController (T130) — kill switch desde el panel (FR-023).
 * Protegido por AdminGuard; el toggle se audita en SystemStateService.
 */
import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard, type AdminUserContext } from '../../../common/guards/admin.guard';
import { SystemStateService, type SystemStateFull } from '../../system-state/system-state.service';
import { ToggleKillSwitchDto } from '../dto/admin.dto';

type ReqAdmin = Request & { adminUser?: AdminUserContext };

@Controller('admin/system-state')
@UseGuards(AdminGuard)
export class AdminSystemStateController {
  constructor(private readonly systemState: SystemStateService) {}

  @Get()
  getState(): Promise<SystemStateFull> {
    return this.systemState.getFullState();
  }

  @Post('kill-switch')
  @HttpCode(200)
  toggle(@Body() dto: ToggleKillSwitchDto, @Req() req: ReqAdmin): Promise<SystemStateFull> {
    return this.systemState.toggle(req.adminUser!.id, dto.enabled, dto.reason ?? null);
  }
}
