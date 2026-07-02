/**
 * Contract test PATCH /api/v1/appointments/{code}/reschedule — happy (T089,
 * FR-015). Rojo antes de impl. Conserva el código; libera el cupo viejo y
 * consume el nuevo.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedActiveAppointment, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('PATCH /api/v1/appointments/:code/reschedule', () => {
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

  it('reagenda conservando el código, libera el cupo viejo y consume el nuevo', async () => {
    const viejo = await seedSlot(prisma, { startTime: '07:00', endTime: '07:35', capacity: 1 });
    const nuevo = await seedSlot(prisma, { startTime: '08:00', endTime: '08:35', capacity: 1 });
    await seedActiveAppointment(prisma, viejo, { code: 'K7P3M9XQ2R', idNumber: 'V12345678' });

    const res = await request(app.getHttpServer())
      .patch('/api/v1/appointments/K7P3M9XQ2R/reschedule')
      .send({ idNumber: 'V12345678', newSlotId: nuevo });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe('K7P3M9XQ2R');
    expect(res.body.slot.id).toBe(nuevo);

    // Cupo viejo libre (aparece en el listado), cupo nuevo consumido (desaparece).
    const slots = await request(app.getHttpServer()).get('/api/v1/slots');
    const ids = slots.body.map((s: { id: string }) => s.id);
    expect(ids).toContain(viejo);
    expect(ids).not.toContain(nuevo);
  });
});
