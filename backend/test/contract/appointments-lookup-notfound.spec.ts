/**
 * Contract test POST /api/v1/appointments/lookup — 404 genérico (T085, FR-016).
 * Rojo antes de impl. No revela si falló la cédula o el código (anti-enumeración).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedActiveAppointment, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('POST /api/v1/appointments/lookup (no encontrada)', () => {
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

  it('responde 404 not_found genérico cuando la pareja no existe', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments/lookup')
      .send({ code: 'ABCDEFGHJK', idNumber: 'V99999999' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('responde 404 genérico si el código existe pero la cédula no coincide', async () => {
    const slotId = await seedSlot(prisma, { capacity: 3 });
    await seedActiveAppointment(prisma, slotId, { code: 'K7P3M9XQ2R', idNumber: 'V12345678' });
    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments/lookup')
      .send({ code: 'K7P3M9XQ2R', idNumber: 'V00000000' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });
});
