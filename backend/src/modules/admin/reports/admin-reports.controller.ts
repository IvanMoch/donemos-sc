/**
 * AdminReportsController (T128) — listado de citas y exportación PDF (FR-021,
 * FR-022). Protegido por AdminGuard; la exportación registra `pdf_exported`.
 */
import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminGuard, type AdminUserContext } from '../../../common/guards/admin.guard';
import { AppointmentsRepository, type AdminAppointment } from '../../appointments/appointments.repository';
import { AdminAuditLogService } from '../audit/admin-audit-log.service';
import { PdfReportService } from './pdf-report.service';

type ReqAdmin = Request & { adminUser?: AdminUserContext };

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

@Controller('admin/appointments')
@UseGuards(AdminGuard)
export class AdminReportsController {
  constructor(
    private readonly appointments: AppointmentsRepository,
    private readonly pdf: PdfReportService,
    private readonly audit: AdminAuditLogService,
  ) {}

  @Get()
  list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ): Promise<AdminAppointment[]> {
    return this.appointments.findByDateRange({ from: from ?? hoy(), to: to ?? hoy(), status });
  }

  @Get('export.pdf')
  async exportPdf(
    @Req() req: ReqAdmin,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<void> {
    const rango = { from: from ?? hoy(), to: to ?? hoy() };
    const citas = await this.appointments.findByDateRange(rango);
    const buffer = await this.pdf.generateAppointmentsPdf(citas, rango);

    await this.audit.record({
      adminId: req.adminUser!.id,
      action: 'pdf_exported',
      targetType: 'report',
      payload: { ...rango, count: citas.length },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="citas-${rango.from}_${rango.to}.pdf"`);
    res.send(buffer);
  }
}
