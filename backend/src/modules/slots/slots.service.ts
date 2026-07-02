/**
 * SlotsService (T065) — orquesta el listado público de franjas.
 *
 * Aplica la ventana por defecto hoy..hoy+30 días cuando el cliente no pasa
 * `from`/`to` (Assumption de ventana temporal de la spec). Las fechas se
 * manejan como YYYY-MM-DD (hora local America/Caracas la resuelve el frontend).
 */
import { Injectable } from '@nestjs/common';
import type { PublicSlot } from '@donemos/shared';
import { SlotsRepository } from './slots.repository';

const DIAS_VENTANA = 30;

function aFecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class SlotsService {
  constructor(private readonly repo: SlotsRepository) {}

  listPublic(from?: string, to?: string): Promise<PublicSlot[]> {
    const hoy = new Date();
    const desde = from ?? aFecha(hoy);
    const hasta = to ?? aFecha(new Date(hoy.getTime() + DIAS_VENTANA * 86_400_000));
    return this.repo.findPublic({ from: desde, to: hasta });
  }
}
