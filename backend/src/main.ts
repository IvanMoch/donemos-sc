/**
 * Bootstrap del backend DonemosSC (T033).
 *
 * Wire de hardening HTTP y logging:
 *  - helmet: CSP restrictivo + HSTS solo en prod (T143, helmetOptions).
 *  - cookie-parser: necesario para leer la cookie `session` del AdminGuard.
 *  - pino como logger global vía NestPinoLogger.
 *  - prefijo global /api/v1 (contrato REST versionado, Principio I).
 *
 * Los pipes/filtros/interceptores globales y el ThrottlerModule se registran en
 * AppModule para participar de la inyección de dependencias.
 */
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestPinoLogger } from './common/logger/nest-pino.logger';
import { helmetOptions } from './common/security/helmet-options';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(new NestPinoLogger());

  app.use(helmet(helmetOptions()));
  app.use(cookieParser());

  // CORS: en producción el frontend se sirve por el mismo origen (proxy nginx),
  // pero en dev y CI el frontend vive en localhost:4321 y el backend en 3001.
  // `credentials: true` es obligatorio para que la cookie `session` del admin
  // viaje en fetch cross-origin (research §6). Restringimos a origins conocidos
  // vía `CORS_ORIGINS` (lista separada por comas) y aceptamos cualquier
  // localhost por defecto para no romper el flujo local.
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
    : [/^http:\/\/localhost:\d+$/];
  app.enableCors({ origin: corsOrigins, credentials: true });

  // Todas las rutas públicas y admin viven bajo /api/v1 (Principio I).
  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
