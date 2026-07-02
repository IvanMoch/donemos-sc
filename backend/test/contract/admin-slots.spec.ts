/**
 * Contract tests de franjas admin (T108-T113). Rojo antes de impl.
 * Listar (con includeDisabled), crear en horario hábil, rechazar fuera de
 * horario sin excepción (400), aceptar con isExceptionHours, rechazar
 * capacity<usedCapacity (409) y deshabilitar cancelando citas activas.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createContractApp,
  loginAndGetCookie,
  resetDb,
  seedActiveAppointment,
  seedAdmin,
  seedSlot,
} from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

/** Primera fecha (YYYY-MM-DD) en el día UTC dado, futura, desde hoy+1. */
function fechaEnDia(diaUTC: number): string {
  const base = Date.now() + 86_400_000;
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(base + i * 86_400_000);
    if (d.getUTCDay() === diaUTC) return d.toISOString().slice(0, 10);
  }
  throw new Error('no se encontró la fecha');
}
const LUNES = fechaEnDia(1);
const SABADO = fechaEnDia(6);

describe('Admin slots', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;

  beforeAll(async () => {
    ({ app, prisma } = await createContractApp());
    await resetDb(prisma);
    await prisma.adminUser.deleteMany();
    await seedAdmin(prisma);
    // Un solo login por archivo: el throttle de login es 5/min por app.
    cookie = await loginAndGetCookie(app);
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('T108: lista incluye deshabilitadas solo con includeDisabled=true', async () => {
    await seedSlot(prisma, { date: LUNES, startTime: '07:00', endTime: '07:35', capacity: 2, isDisabled: true });
    const sin = await request(app.getHttpServer()).get('/api/v1/admin/slots').set('Cookie', cookie);
    expect(sin.status).toBe(200);
    expect(sin.body).toHaveLength(0);
    const con = await request(app.getHttpServer())
      .get('/api/v1/admin/slots?includeDisabled=true')
      .set('Cookie', cookie);
    expect(con.body).toHaveLength(1);
  });

  it('T109: crea franja en horario hábil (L–V 7:00–12:00)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/slots')
      .set('Cookie', cookie)
      .send({ date: LUNES, startTime: '07:00', endTime: '07:35', capacity: 3 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({ date: LUNES, capacity: 3, usedCapacity: 0, isDisabled: false, isExceptionHours: false }),
    );
  });

  it('T110: rechaza sábado sin isExceptionHours (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/slots')
      .set('Cookie', cookie)
      .send({ date: SABADO, startTime: '07:00', endTime: '07:35', capacity: 3 });
    expect(res.status).toBe(400);
  });

  it('T111: acepta sábado con isExceptionHours=true y lo registra', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/slots')
      .set('Cookie', cookie)
      .send({ date: SABADO, startTime: '07:00', endTime: '07:35', capacity: 3, isExceptionHours: true });
    expect(res.status).toBe(201);
    expect(res.body.isExceptionHours).toBe(true);
  });

  it('T112: PATCH con capacity < usedCapacity responde 409', async () => {
    const slotId = await seedSlot(prisma, { date: LUNES, startTime: '07:00', endTime: '07:35', capacity: 3 });
    await seedActiveAppointment(prisma, slotId, { code: 'AAAAAAAAAA', idNumber: 'V11111111' });
    await seedActiveAppointment(prisma, slotId, { code: 'BBBBBBBBBB', idNumber: 'V22222222' });
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/slots/${slotId}`)
      .set('Cookie', cookie)
      .send({ capacity: 1 });
    expect(res.status).toBe(409);
  });

  it('T113: deshabilitar cancela las citas activas (cancelled_by_bank)', async () => {
    const slotId = await seedSlot(prisma, { date: LUNES, startTime: '07:00', endTime: '07:35', capacity: 3 });
    await seedActiveAppointment(prisma, slotId, { code: 'AAAAAAAAAA', idNumber: 'V11111111' });
    await seedActiveAppointment(prisma, slotId, { code: 'BBBBBBBBBB', idNumber: 'V22222222' });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/admin/slots/${slotId}/disable`)
      .set('Cookie', cookie)
      .send({ reason: 'Feriado' });
    expect(res.status).toBe(200);
    expect(res.body.cancelledAppointments).toBe(2);

    const activas = await prisma.appointment.count({ where: { slotId, status: 'active' } });
    expect(activas).toBe(0);
    const canceladas = await prisma.appointment.count({ where: { slotId, status: 'cancelled_by_bank' } });
    expect(canceladas).toBe(2);
  });

  it('protege las rutas admin: 401 sin cookie', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/admin/slots');
    expect(res.status).toBe(401);
  });
});
