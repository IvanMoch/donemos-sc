/**
 * SlotsModule (T066/T071) — franjas horarias públicas. El SlotsRepository se
 * exporta para que AppointmentsModule reutilice el acceso a franjas.
 */
import { Module } from '@nestjs/common';
import { SlotsController } from './slots.controller';
import { SlotsRepository } from './slots.repository';
import { SlotsService } from './slots.service';

@Module({
  controllers: [SlotsController],
  providers: [SlotsService, SlotsRepository],
  exports: [SlotsRepository],
})
export class SlotsModule {}
