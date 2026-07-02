/**
 * Contract tests de citas admin + PDF (T114, T115). Rojo antes de impl.
 * Listado por rango/estado y exportación PDF (magic bytes %PDF-, cabecera del
 * hospital y columnas).
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

const HOY = new Date().toISOString().slice(0, 10);
const MANANA = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

describe('Admin appointments + PDF', () => {
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

  it('T114: lista citas por rango y filtra por status', async () => {
    const slotId = await seedSlot(prisma, { date: MANANA, capacity: 3 });
    await seedActiveAppointment(prisma, slotId, { code: 'AAAAAAAAAA', idNumber: 'V11111111' });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/appointments?from=${HOY}&to=${MANANA}&status=active`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toEqual(
      expect.objectContaining({ code: 'AAAAAAAAAA', idNumber: 'V11111111', status: 'active' }),
    );

    const vacio = await request(app.getHttpServer())
      .get(`/api/v1/admin/appointments?from=${HOY}&to=${MANANA}&status=no_show`)
      .set('Cookie', cookie);
    expect(vacio.body).toHaveLength(0);
  });

  it('T115: exporta un PDF con los bytes y el contenido esperados', async () => {
    const slotId = await seedSlot(prisma, { date: MANANA, capacity: 3 });
    await seedActiveAppointment(prisma, slotId, { code: 'AAAAAAAAAA', idNumber: 'V11111111' });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/admin/appointments/export.pdf?from=${HOY}&to=${MANANA}`)
      .set('Cookie', cookie)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    const buf = res.body as Buffer;
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    // El nombre del hospital va en el título (Info dict), que se escribe literal
    // y sin comprimir: buscable en ASCII sin depender del kerning del cuerpo.
    const texto = buf.toString('latin1');
    expect(texto).toContain('Hospital Central de San Cristobal');
  });

  it('401 sin cookie', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/admin/appointments?from=${HOY}&to=${MANANA}`);
    expect(res.status).toBe(401);
  });
});
