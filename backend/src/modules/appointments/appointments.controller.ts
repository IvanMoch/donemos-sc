/**
 * AppointmentsController — endpoints públicos de citas.
 *
 * US1 (T070): POST /appointments (crear) — kill switch + throttle 30/min.
 * US2 (T098): POST /appointments/lookup (consultar, throttle 10/min contra
 * enumeración), POST /appointments/:code/cancel (cancelar; funciona con kill
 * switch, FR-023b) y PATCH /appointments/:code/reschedule (reagendar; el
 * servicio devuelve 409 kill_switch_active si el switch está activo, V10).
 */
import { Body, Controller, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProtectedByKillSwitch } from '../../common/decorators/protected-by-kill-switch.decorator';
import {
  AppointmentsService,
  type AppointmentConfirmation,
  type AppointmentDetailResponse,
} from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CancelDto, LookupDto, RescheduleDto } from './dto/lookup.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @HttpCode(201)
  @ProtectedByKillSwitch()
  create(@Body() dto: CreateAppointmentDto): Promise<AppointmentConfirmation> {
    return this.appointments.create(dto);
  }

  @Post('lookup')
  @HttpCode(200)
  // Bucket restrictivo 10/min para dificultar la enumeración de cédulas (research §10).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  lookup(@Body() dto: LookupDto): Promise<AppointmentDetailResponse> {
    return this.appointments.lookup(dto.code, dto.idNumber);
  }

  @Post(':code/cancel')
  @HttpCode(200)
  cancel(@Param('code') code: string, @Body() dto: CancelDto): Promise<AppointmentDetailResponse> {
    return this.appointments.cancel(code, dto.idNumber);
  }

  @Patch(':code/reschedule')
  @HttpCode(200)
  reschedule(
    @Param('code') code: string,
    @Body() dto: RescheduleDto,
  ): Promise<AppointmentConfirmation> {
    return this.appointments.reschedule(code, dto.idNumber, dto.newSlotId);
  }
}
