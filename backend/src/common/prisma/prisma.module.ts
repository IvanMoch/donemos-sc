/**
 * PrismaModule — expone PrismaService de forma global.
 *
 * Global para que cualquier módulo de dominio inyecte el mismo cliente (y el
 * mismo pool) sin re-importarlo. Es infraestructura transversal de la Fase 2.
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
