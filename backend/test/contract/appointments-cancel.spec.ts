/**
 * Contract test POST /api/v1/appointments/{code}/cancel (T087, FR-014). Rojo
 * antes de impl. Cancela (cancelled_by_donor) y libera el cupo del slot.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedActiveAppointment, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('POST /api/v1/appointments/:code/cancel', () => {
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

  it('cancela la cita, deja estado cancelled_by_donor y libera el cupo', async () => {
    const slotId = await seedSlot(prisma, { capacity: 1 });
    await seedActiveAppointment(prisma, slotId, { code: 'K7P3M9XQ2R', idNumber: 'V12345678' });

    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments/K7P3M9XQ2R/cancel')
      .send({ idNumber: 'V12345678' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled_by_donor');

    // El cupo vuelve a estar disponible en el listado público.
    const slots = await request(app.getHttpServer()).get('/api/v1/slots');
    expect(slots.body.find((s: { id: string }) => s.id === slotId)?.remainingCapacity).toBe(1);
  });

  it('responde 404 genérico si la cédula no coincide', async () => {
    const slotId = await seedSlot(prisma, { capacity: 2 });
    await seedActiveAppointment(prisma, slotId, { code: 'K7P3M9XQ2R', idNumber: 'V12345678' });
    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments/K7P3M9XQ2R/cancel')
      .send({ idNumber: 'V00000000' });
    expect(res.status).toBe(404);
  });
});
