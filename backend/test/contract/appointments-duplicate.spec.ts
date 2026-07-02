/**
 * Contract test POST /api/v1/appointments — 409 duplicate_active_appointment
 * (T047). Rojo antes de impl. Una cédula no puede tener dos citas activas (FR-007).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('POST /api/v1/appointments (cédula duplicada)', () => {
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

  it('responde 409 duplicate_active_appointment en el segundo intento', async () => {
    const slotId = await seedSlot(prisma, { capacity: 5 });
    const cuerpo = { firstName: 'Ana', lastName: 'Pérez', idNumber: 'V12345678', slotId, eligibilityDeclared: true };

    const primera = await request(app.getHttpServer()).post('/api/v1/appointments').send(cuerpo);
    expect(primera.status).toBe(201);

    const segunda = await request(app.getHttpServer()).post('/api/v1/appointments').send(cuerpo);
    expect(segunda.status).toBe(409);
    expect(segunda.body.code).toBe('duplicate_active_appointment');
  });
});
