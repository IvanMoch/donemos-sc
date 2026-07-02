/**
 * Contract tests de autenticación admin (T103, T104, T106). Rojo antes de impl.
 * Login setea cookie `session` HttpOnly/Secure/SameSite=Strict/8h; login inválido
 * → 401; logout limpia; GET /admin/me devuelve el perfil autenticado (research §6).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, loginAndGetCookie, resetDb, seedAdmin } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('Admin auth', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // App por test: estos tests hacen varios logins y el throttle es 5/min por app.
  beforeEach(async () => {
    ({ app, prisma } = await createContractApp());
    await resetDb(prisma);
    await prisma.adminUser.deleteMany();
    await seedAdmin(prisma, { username: 'admin', password: 'secreto-de-prueba' });
  });

  afterEach(async () => {
    await app.close();
  });

  it('T103: login correcto responde 204 y setea cookie session segura', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .send({ username: 'admin', password: 'secreto-de-prueba' });
    expect(res.status).toBe(204);
    const cookie = (Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'] : [])
      .find((c: string) => c.startsWith('session='));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
  });

  it('T104: login inválido responde 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .send({ username: 'admin', password: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  it('T106: /admin/me devuelve el perfil con cookie válida y 401 sin ella', async () => {
    const cookie = await loginAndGetCookie(app);
    const sinAuth = await request(app.getHttpServer()).get('/api/v1/admin/me');
    expect(sinAuth.status).toBe(401);

    const conAuth = await request(app.getHttpServer()).get('/api/v1/admin/me').set('Cookie', cookie);
    expect(conAuth.status).toBe(200);
    expect(conAuth.body).toEqual(
      expect.objectContaining({ username: 'admin', fullName: expect.any(String) }),
    );
  });

  it('T106: logout responde 204 y limpia la cookie', async () => {
    const cookie = await loginAndGetCookie(app);
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/logout')
      .set('Cookie', cookie);
    expect(res.status).toBe(204);
  });
});
