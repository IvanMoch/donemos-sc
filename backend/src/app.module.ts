/**
 * Módulo raíz del backend DonemosSC.
 *
 * Compone la infraestructura transversal (Fase 2) y los módulos de dominio de
 * US1 (Fase 3). Registrado de forma GLOBAL (research §10, §13):
 *  - ThrottlerModule: bucket por defecto 30/min (research §10). El límite más
 *    estricto de `lookup` (10/min, US2) se aplicará por ruta con @Throttle.
 *  - ThrottlerGuard + KillSwitchGuard (503 en rutas @ProtectedByKillSwitch).
 *  - ZodValidationPipe (valida DTOs createZodDto; no-op en el resto).
 *  - GlobalExceptionFilter (shape de error estándar + enmascarado de PII).
 *  - LoggingInterceptor (una línea pino por request).
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { KillSwitchGuard } from './common/guards/kill-switch.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { PrismaModule } from './common/prisma/prisma.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ContentModule } from './modules/content/content.module';
import { HealthModule } from './modules/health/health.module';
import { SlotsModule } from './modules/slots/slots.module';
import { SystemStateModule } from './modules/system-state/system-state.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
    PrismaModule,
    SystemStateModule,
    ContentModule,
    HealthModule,
    SlotsModule,
    AppointmentsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: KillSwitchGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
