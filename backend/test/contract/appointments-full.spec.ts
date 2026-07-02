/**
 * Contract test POST /api/v1/appointments — 409 slot_full (T048). Rojo antes de
 * impl. Una franja sin cupo restante no acepta más citas (FR-008).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('POST /api/v1/appointments (sin cupo)', () => {
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

  it('responde 409 slot_full cuando la franja está llena', async () => {
    const slotId = await seedSlot(prisma, { capacity: 1 });
    await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({ firstName: 'Ana', lastName: 'Uno', idNumber: 'V11111111', slotId, eligibilityDeclared: true })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({ firstName: 'Beto', lastName: 'Dos', idNumber: 'V22222222', slotId, eligibilityDeclared: true });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('slot_full');
  });
});
