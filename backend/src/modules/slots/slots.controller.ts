/**
 * SlotsController (T066) — GET /slots?from&to.
 * Lista las franjas con cupo dentro de la ventana pública.
 */
import { Controller, Get, Query } from '@nestjs/common';
import type { PublicSlot } from '@donemos/shared';
import { SlotsService } from './slots.service';

@Controller('slots')
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Get()
  list(@Query('from') from?: string, @Query('to') to?: string): Promise<PublicSlot[]> {
    return this.slots.listPublic(from, to);
  }
}
