/**
 * Adaptador de pino al contrato LoggerService de NestJS, para que los logs
 * internos del framework salgan por el mismo pino JSON que el resto de la app
 * (research §13: un solo formato estructurado, "pino como logger global").
 */
import type { LoggerService } from '@nestjs/common';
import { logger } from './logger';

export class NestPinoLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    logger.info({ context }, String(message));
  }

  error(message: unknown, trace?: string, context?: string): void {
    logger.error({ context, trace }, String(message));
  }

  warn(message: unknown, context?: string): void {
    logger.warn({ context }, String(message));
  }

  debug(message: unknown, context?: string): void {
    logger.debug({ context }, String(message));
  }

  verbose(message: unknown, context?: string): void {
    logger.trace({ context }, String(message));
  }
}
