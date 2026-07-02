/**
 * Contract test POST /api/v1/appointments — 400 cuando eligibilityDeclared=false
 * (T050). Rojo antes de impl. Sin auto-declaración no se crea la cita (FR-012).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('POST /api/v1/appointments (elegibilidad no declarada)', () => {
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

  it('responde 400 validation_failed si eligibilityDeclared es false', async () => {
    const slotId = await seedSlot(prisma, { capacity: 3 });
    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .send({ firstName: 'Ana', lastName: 'Pérez', idNumber: 'V12345678', slotId, eligibilityDeclared: false });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_failed');
    expect(res.body.issues.some((i: { path: string }) => i.path === 'eligibilityDeclared')).toBe(true);
  });
});
