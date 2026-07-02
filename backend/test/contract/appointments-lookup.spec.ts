/**
 * Contract test POST /api/v1/appointments/lookup — happy path (T084). Rojo antes
 * de impl. Devuelve el detalle de la cita para la pareja cédula+código (FR-013).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedActiveAppointment, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('POST /api/v1/appointments/lookup', () => {
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

  it('devuelve el detalle de la cita con cédula y código correctos', async () => {
    const slotId = await seedSlot(prisma, { capacity: 3 });
    await seedActiveAppointment(prisma, slotId, { code: 'K7P3M9XQ2R', idNumber: 'V12345678' });

    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments/lookup')
      .send({ code: 'K7P3M9XQ2R', idNumber: 'V12345678' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        code: 'K7P3M9XQ2R',
        status: 'active',
        slot: expect.objectContaining({ id: slotId, remainingCapacity: expect.any(Number) }),
        hospital: expect.objectContaining({ name: expect.any(String) }),
      }),
    );
  });

  it('normaliza la cédula al consultar', async () => {
    const slotId = await seedSlot(prisma, { capacity: 3 });
    await seedActiveAppointment(prisma, slotId, { code: 'K7P3M9XQ2R', idNumber: 'V12345678' });
    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments/lookup')
      .send({ code: 'K7P3M9XQ2R', idNumber: 'v-12345678' });
    expect(res.status).toBe(200);
  });
});
