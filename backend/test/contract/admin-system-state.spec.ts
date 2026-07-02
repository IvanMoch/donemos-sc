/**
 * Contract tests del kill switch admin (T116, T117). Rojo antes de impl.
 * GET /admin/system-state y POST /admin/system-state/kill-switch (activar/desactivar).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, loginAndGetCookie, resetDb, seedAdmin } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('Admin system-state (kill switch)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;

  beforeAll(async () => {
    ({ app, prisma } = await createContractApp());
    await resetDb(prisma);
    await prisma.adminUser.deleteMany();
    await seedAdmin(prisma);
    cookie = await loginAndGetCookie(app);
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('T116: GET /admin/system-state devuelve el estado', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/admin/system-state').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.appointmentsDisabled).toBe(false);
  });

  it('T117: activa y desactiva el kill switch', async () => {
    const on = await request(app.getHttpServer())
      .post('/api/v1/admin/system-state/kill-switch')
      .set('Cookie', cookie)
      .send({ enabled: true, reason: 'Mantenimiento' });
    expect(on.status).toBe(200);
    expect(on.body.appointmentsDisabled).toBe(true);

    const enBD = await prisma.systemState.findUnique({ where: { id: 1 } });
    expect(enBD?.appointmentsDisabled).toBe(true);

    const off = await request(app.getHttpServer())
      .post('/api/v1/admin/system-state/kill-switch')
      .set('Cookie', cookie)
      .send({ enabled: false });
    expect(off.status).toBe(200);
    expect(off.body.appointmentsDisabled).toBe(false);
  });

  it('401 sin cookie', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/admin/system-state');
    expect(res.status).toBe(401);
  });
});
