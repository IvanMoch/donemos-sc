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

  // Todas las rutas públicas y admin viven bajo /api/v1 (Principio I).
  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
