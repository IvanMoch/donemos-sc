/**
 * Contract test rate limit de login (T105). Rojo antes de impl. Protección
 * anti-fuerza-bruta: tras el bucket permitido, un intento extra → 429.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedAdmin } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('POST /api/v1/admin/auth/login (rate limit)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createContractApp());
    await resetDb(prisma);
    await prisma.adminUser.deleteMany();
    await seedAdmin(prisma, { username: 'admin', password: 'secreto-de-prueba' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('bloquea con 429 tras superar el bucket de login', async () => {
    let ultimo = 0;
    for (let i = 0; i < 6; i += 1) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({ username: 'admin', password: 'incorrecta' });
      ultimo = res.status;
    }
    expect(ultimo).toBe(429);
  });
});
