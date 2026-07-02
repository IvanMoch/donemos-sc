/**
 * Contract test reschedule con kill switch activo → 409 kill_switch_active
 * (T090, FR-023b, V10). Rojo antes de impl. Reagendar requiere el catálogo
 * público, que está inhabilitado — se rechaza con 409 (no 503).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedActiveAppointment, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('PATCH /api/v1/appointments/:code/reschedule (kill switch activo)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createContractApp());
    await resetDb(prisma);
    await prisma.systemState.update({ where: { id: 1 }, data: { appointmentsDisabled: true } });
    await app.close();
    ({ app, prisma } = await createContractApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 409 kill_switch_active', async () => {
    const viejo = await seedSlot(prisma, { startTime: '07:00', endTime: '07:35', capacity: 1 });
    const nuevo = await seedSlot(prisma, { startTime: '08:00', endTime: '08:35', capacity: 1 });
    await seedActiveAppointment(prisma, viejo, { code: 'K7P3M9XQ2R', idNumber: 'V12345678' });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/appointments/K7P3M9XQ2R/reschedule')
      .send({ idNumber: 'V12345678', newSlotId: nuevo });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('kill_switch_active');
  });
});
