/**
 * Contract test cancel con kill switch activo (T088, FR-023b). Rojo antes de
 * impl. Cancelar sigue funcionando aunque el flujo público esté pausado.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedActiveAppointment, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('POST /api/v1/appointments/:code/cancel (kill switch activo)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createContractApp());
    await resetDb(prisma);
    await prisma.systemState.update({ where: { id: 1 }, data: { appointmentsDisabled: true } });
    await app.close();
    ({ app, prisma } = await createContractApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('permite cancelar con el kill switch activo', async () => {
    const slotId = await seedSlot(prisma, { capacity: 2 });
    await seedActiveAppointment(prisma, slotId, { code: 'K7P3M9XQ2R', idNumber: 'V12345678' });

    const res = await request(app.getHttpServer())
      .post('/api/v1/appointments/K7P3M9XQ2R/cancel')
      .send({ idNumber: 'V12345678' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled_by_donor');
  });
});
