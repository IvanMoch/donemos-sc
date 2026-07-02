/**
 * Contract test rate limit lookup (T086, research §10). Rojo antes de impl.
 * Bucket restrictivo 10/min contra enumeración de cédulas: la 11ª → 429.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('POST /api/v1/appointments/lookup (rate limit)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createContractApp());
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('devuelve 429 en la 11ª consulta dentro del minuto', async () => {
    let ultimo = 0;
    for (let i = 0; i < 11; i += 1) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/appointments/lookup')
        .send({ code: 'ABCDEFGHJK', idNumber: 'V99999999' });
      ultimo = res.status;
    }
    expect(ultimo).toBe(429);
  });
});
