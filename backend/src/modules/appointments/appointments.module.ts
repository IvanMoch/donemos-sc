/**
 * AppointmentsModule (T071) — creación de citas del flujo público (US1).
 */
import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentsService } from './appointments.service';
import { ExpireActiveJob } from './expire-active.job';
import { RetentionJob } from './retention.job';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsRepository, RetentionJob, ExpireActiveJob],
  // Exportado para que los reportes admin (findByDateRange) reutilicen el repo.
  exports: [AppointmentsRepository],
})
export class AppointmentsModule {}
