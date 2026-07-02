/**
 * Módulo raíz del backend DonemosSC.
 *
 * Responsabilidad: componer los módulos de dominio (appointments, slots,
 * admin, content, health — se registran en sus tareas correspondientes de
 * las fases 2–5) y exponer la configuración global vía @nestjs/config.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // isGlobal evita re-importar ConfigModule en cada módulo de dominio.
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class AppModule {}
