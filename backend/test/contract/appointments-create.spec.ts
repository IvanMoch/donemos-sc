/**
 * Contract test POST /api/v1/appointments — happy path (T046). Rojo antes de impl.
 * 201 con `code` de 10 chars (alfabeto research §14), decremento de cupo y
 * `eligibility_declared_at` persistido (FR-005, FR-008, FR-012).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/;

describe('POST /api/v1/appointments (happy path)', () => {
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

  it('crea la cita, devuelve 201 con código válido y decrementa el cupo', async () => {
    const slotId = await seedSlot(prisma, { capacity: 3 });

    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({ firstName: 'Ana', lastName: 'Pérez', idNumber: 'V12345678', slotId, eligibilityDeclared: true });

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(CODE_RE);
    expect(res.body.slot).toEqual(expect.objectContaining({ id: slotId, remainingCapacity: 2 }));

    const guardada = await prisma.appointment.findUnique({ where: { code: res.body.code } });
    expect(guardada?.eligibilityDeclaredAt).toBeInstanceOf(Date);
    expect(guardada?.idNumber).toBe('V12345678');
    expect(guardada?.status).toBe('active');
  });

  it('normaliza la cédula (minúsculas y guion) al persistir', async () => {
    const slotId = await seedSlot(prisma, { capacity: 2 });
    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({ firstName: 'Ana', lastName: 'Pérez', idNumber: 'v-12345678', slotId, eligibilityDeclared: true });
    expect(res.status).toBe(201);
    const guardada = await prisma.appointment.findUnique({ where: { code: res.body.code } });
    expect(guardada?.idNumber).toBe('V12345678');
  });
});
