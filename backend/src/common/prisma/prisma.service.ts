/**
 * PrismaService — cliente Prisma como proveedor inyectable de NestJS.
 *
 * Abre la conexión al iniciar el módulo y la cierra al destruirlo, de modo que
 * el pool de conexiones siga el ciclo de vida de la app. Es la única puerta de
 * acceso a PostgreSQL desde los servicios de dominio.
 */
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
