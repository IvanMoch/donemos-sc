/**
 * Contract test reschedule sin cupo en el nuevo slot → 409 slot_full (T091).
 * Rojo antes de impl.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedActiveAppointment, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('PATCH /api/v1/appointments/:code/reschedule (nuevo slot lleno)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createContractApp());
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 409 slot_full si el nuevo slot no tiene cupo', async () => {
    const viejo = await seedSlot(prisma, { startTime: '07:00', endTime: '07:35', capacity: 1 });
    const nuevo = await seedSlot(prisma, { startTime: '08:00', endTime: '08:35', capacity: 1 });
    await seedActiveAppointment(prisma, viejo, { code: 'K7P3M9XQ2R', idNumber: 'V12345678' });
    // El nuevo slot ya está lleno con otra cita.
    await seedActiveAppointment(prisma, nuevo, { code: 'AAAAAAAAAA', idNumber: 'V22222222' });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/appointments/K7P3M9XQ2R/reschedule')
      .send({ idNumber: 'V12345678', newSlotId: nuevo });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('slot_full');
  });
});
