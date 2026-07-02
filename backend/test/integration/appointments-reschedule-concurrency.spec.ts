/**
 * Integration test de concurrencia en reschedule (T092). Rojo antes de impl.
 * Dos reagendamientos simultáneos al mismo slot con 1 cupo: solo uno gana; el
 * otro recibe 409 (SERIALIZABLE + FOR UPDATE + reintento, research §4).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedActiveAppointment, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('Concurrencia al reagendar (SERIALIZABLE)', () => {
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

  it('dos reagendamientos al mismo slot (cap 1) → uno 200 y otro 409', async () => {
    const origenA = await seedSlot(prisma, { startTime: '07:00', endTime: '07:35', capacity: 1 });
    const origenB = await seedSlot(prisma, { startTime: '07:40', endTime: '08:15', capacity: 1 });
    const destino = await seedSlot(prisma, { startTime: '09:00', endTime: '09:35', capacity: 1 });
    await seedActiveAppointment(prisma, origenA, { code: 'AAAAAAAAAA', idNumber: 'V11111111' });
    await seedActiveAppointment(prisma, origenB, { code: 'BBBBBBBBBB', idNumber: 'V22222222' });

    const [a, b] = await Promise.all([
      request(app.getHttpServer())
        .patch('/api/v1/appointments/AAAAAAAAAA/reschedule')
        .send({ idNumber: 'V11111111', newSlotId: destino }),
      request(app.getHttpServer())
        .patch('/api/v1/appointments/BBBBBBBBBB/reschedule')
        .send({ idNumber: 'V22222222', newSlotId: destino }),
    ]);

    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const enDestino = await prisma.appointment.count({ where: { slotId: destino, status: 'active' } });
    expect(enDestino).toBe(1);
  });
});
