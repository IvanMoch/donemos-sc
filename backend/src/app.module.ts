/**
 * Módulo raíz del backend DonemosSC.
 *
 * Compone la infraestructura transversal de la Fase 2 y deja registrados de
 * forma GLOBAL (research §10, §13):
 *  - ThrottlerModule con dos buckets: `public` (30/min) y `lookup` (10/min),
 *    aplicados por ruta con @Throttle en US1/US2; el ThrottlerGuard global
 *    activa el bucket `public` por defecto.
 *  - ZodValidationPipe (valida DTOs creados con createZodDto; no-op en el resto).
 *  - GlobalExceptionFilter (shape de error estándar + enmascarado de PII).
 *  - LoggingInterceptor (una línea pino por request).
 *
 * Los módulos de dominio (content, slots, appointments, admin, health) se
 * importan en sus fases correspondientes.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { PrismaModule } from './common/prisma/prisma.module';
import { SystemStateModule } from './modules/system-state/system-state.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'public', ttl: 60_000, limit: 30 },
      { name: 'lookup', ttl: 60_000, limit: 10 },
    ]),
    PrismaModule,
    SystemStateModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
