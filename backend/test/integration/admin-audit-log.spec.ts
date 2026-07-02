/**
 * Integration test del audit log admin (T118). Rojo antes de impl.
 * Cada mutación admin (login, create slot, disable slot, kill switch on/off,
 * export PDF) inserta una fila en admin_audit_log con la acción correspondiente.
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

function fechaEnDia(diaUTC: number): string {
  const base = Date.now() + 86_400_000;
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(base + i * 86_400_000);
    if (d.getUTCDay() === diaUTC) return d.toISOString().slice(0, 10);
  }
  throw new Error('sin fecha');
}
const LUNES = fechaEnDia(1);
const HOY = new Date().toISOString().slice(0, 10);
const MANANA = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

describe('Audit log de acciones admin', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createContractApp());
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await prisma.adminAuditLog.deleteMany();
    await prisma.adminUser.deleteMany();
    await seedAdmin(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function acciones(): Promise<string[]> {
    const filas = await prisma.adminAuditLog.findMany({ select: { action: true } });
    return filas.map((f) => f.action);
  }

  it('registra login, slot_created, slot_disabled, kill_switch_on/off y pdf_exported', async () => {
    const cookie = await loginAndGetCookie(app);
    expect(await acciones()).toContain('login');

    await request(app.getHttpServer())
      .post('/api/v1/admin/slots')
      .set('Cookie', cookie)
      .send({ date: LUNES, startTime: '07:00', endTime: '07:35', capacity: 2 })
      .expect(201);
    expect(await acciones()).toContain('slot_created');

    const slotId = await seedSlot(prisma, { date: LUNES, startTime: '08:00', endTime: '08:35', capacity: 2 });
    await seedActiveAppointment(prisma, slotId, { code: 'AAAAAAAAAA', idNumber: 'V11111111' });
    await request(app.getHttpServer())
      .post(`/api/v1/admin/slots/${slotId}/disable`)
      .set('Cookie', cookie)
      .send({ reason: 'x' })
      .expect(200);
    expect(await acciones()).toContain('slot_disabled');

    await request(app.getHttpServer())
      .post('/api/v1/admin/system-state/kill-switch')
      .set('Cookie', cookie)
      .send({ enabled: true })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/admin/system-state/kill-switch')
      .set('Cookie', cookie)
      .send({ enabled: false })
      .expect(200);
    const acc = await acciones();
    expect(acc).toContain('kill_switch_on');
    expect(acc).toContain('kill_switch_off');

    await request(app.getHttpServer())
      .get(`/api/v1/admin/appointments/export.pdf?from=${HOY}&to=${MANANA}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(await acciones()).toContain('pdf_exported');
  });
});
