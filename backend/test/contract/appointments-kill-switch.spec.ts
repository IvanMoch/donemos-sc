/**
 * Contract test POST /api/v1/appointments — 503 appointments_disabled (T049).
 * Rojo antes de impl. Con el kill switch activo, crear cita se bloquea (FR-023, V8).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('POST /api/v1/appointments (kill switch activo)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Se activa el kill switch ANTES de crear la app para que el guard lo lea fresco.
    ({ app, prisma } = await createContractApp());
    await resetDb(prisma);
    await prisma.systemState.update({ where: { id: 1 }, data: { appointmentsDisabled: true } });
    await app.close();
    ({ app, prisma } = await createContractApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 503 appointments_disabled', async () => {
    const slotId = await seedSlot(prisma, { capacity: 3 });
    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({ firstName: 'Ana', lastName: 'Pérez', idNumber: 'V12345678', slotId, eligibilityDeclared: true });

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('appointments_disabled');
  });
});
