/**
 * Bootstrap del backend DonemosSC.
 *
 * Levanta NestJS con el prefijo global `/api/v1` (contrato REST versionado,
 * plan.md § Summary). El wire completo de hardening — helmet, cookie-parser,
 * throttler, pino, ZodValidationPipe, filtros e interceptores globales —
 * se añade en T033 (Fase 2); aquí solo lo mínimo para que el proceso arranque.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Todas las rutas públicas y admin viven bajo /api/v1 (Principio I).
  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
