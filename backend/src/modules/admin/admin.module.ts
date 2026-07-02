/**
 * AdminModule (T123) — panel administrativo (US3).
 *
 * Agrupa auth, gestión de franjas, reportes/PDF y kill switch admin. Registra
 * JwtModule (secreto y TTL 8h desde env) del que dependen AdminAuthService y el
 * AdminGuard. Reutiliza SlotsRepository y AppointmentsRepository (exportados por
 * sus módulos) y el SystemStateService global.
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppointmentsModule } from '../appointments/appointments.module';
import { SlotsModule } from '../slots/slots.module';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminReportsController } from './reports/admin-reports.controller';
import { AdminSlotsController } from './slots/admin-slots.controller';
import { AdminSystemStateController } from './system-state/admin-system-state.controller';
import { PdfReportService } from './reports/pdf-report.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET no configurado');
        return { secret, signOptions: { expiresIn: '8h' } };
      },
    }),
    SlotsModule,
    AppointmentsModule,
  ],
  controllers: [
    AdminAuthController,
    AdminSlotsController,
    AdminReportsController,
    AdminSystemStateController,
  ],
  providers: [AdminAuthService, PdfReportService],
})
export class AdminModule {}
