/**
 * AdminSlotsController (T125) — gestión de franjas (FR-018..FR-020).
 * Todo protegido por AdminGuard; cada mutación se registra en el audit log.
 */
import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard, type AdminUserContext } from '../../../common/guards/admin.guard';
import { AdminAuditLogService } from '../audit/admin-audit-log.service';
import { SlotsRepository, type AdminSlot } from '../../slots/slots.repository';
import { CreateSlotDto, DisableSlotDto, UpdateSlotDto } from '../dto/admin.dto';

type ReqAdmin = Request & { adminUser?: AdminUserContext };

@Controller('admin/slots')
@UseGuards(AdminGuard)
export class AdminSlotsController {
  constructor(
    private readonly slots: SlotsRepository,
    private readonly audit: AdminAuditLogService,
  ) {}

  @Get()
  list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('includeDisabled') includeDisabled?: string,
  ): Promise<AdminSlot[]> {
    return this.slots.findForAdmin({ from, to, includeDisabled: includeDisabled === 'true' });
  }

  @Post()
  async create(@Body() dto: CreateSlotDto, @Req() req: ReqAdmin): Promise<AdminSlot> {
    const slot = await this.slots.createAdmin(dto);
    await this.audit.record({ adminId: req.adminUser!.id, action: 'slot_created', targetType: 'slot', targetId: slot.id });
    return slot;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSlotDto, @Req() req: ReqAdmin): Promise<AdminSlot> {
    const slot = await this.slots.updateAdmin(id, dto);
    await this.audit.record({ adminId: req.adminUser!.id, action: 'slot_updated', targetType: 'slot', targetId: id });
    return slot;
  }

  @Post(':id/disable')
  @HttpCode(200)
  async disable(
    @Param('id') id: string,
    @Body() dto: DisableSlotDto,
    @Req() req: ReqAdmin,
  ): Promise<{ slot: AdminSlot; cancelledAppointments: number }> {
    const resultado = await this.slots.disableAdmin(id, dto.reason ?? null, req.adminUser!.id);
    await this.audit.record({
      adminId: req.adminUser!.id,
      action: 'slot_disabled',
      targetType: 'slot',
      targetId: id,
      payload: { cancelledAppointments: resultado.cancelledAppointments },
    });
    return resultado;
  }
}
