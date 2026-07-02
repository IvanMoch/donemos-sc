/**
 * Integration test de concurrencia (T052, SC-009). Rojo antes de impl.
 * Con capacidad = 1 y dos POST simultáneos, exactamente uno recibe 201 y el
 * otro 409: la transacción SERIALIZABLE + SELECT ... FOR UPDATE impide la
 * sobreventa de cupos (research §4).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('Concurrencia al crear citas (SERIALIZABLE)', () => {
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

  it('con capacidad 1 y dos solicitudes simultáneas, solo una gana el cupo', async () => {
    const slotId = await seedSlot(prisma, { capacity: 1 });

    const [a, b] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({ firstName: 'Ana', lastName: 'Uno', idNumber: 'V11111111', slotId, eligibilityDeclared: true }),
      request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({ firstName: 'Beto', lastName: 'Dos', idNumber: 'V22222222', slotId, eligibilityDeclared: true }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);

    const activas = await prisma.appointment.count({ where: { slotId, status: 'active' } });
    expect(activas).toBe(1);
  });
});
