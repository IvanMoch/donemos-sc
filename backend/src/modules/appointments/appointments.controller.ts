/**
 * AppointmentsController (T070) — POST /appointments.
 *
 * Protegido por el kill switch (@ProtectedByKillSwitch → 503 si está activo) y
 * por el bucket público del throttler (30/min, configurado global). El cuerpo
 * se valida con el esquema Zod compartido vía CreateAppointmentDto.
 */
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ProtectedByKillSwitch } from '../../common/decorators/protected-by-kill-switch.decorator';
import { AppointmentsService, type AppointmentConfirmation } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @HttpCode(201)
  @ProtectedByKillSwitch()
  create(@Body() dto: CreateAppointmentDto): Promise<AppointmentConfirmation> {
    return this.appointments.create(dto);
  }
}
