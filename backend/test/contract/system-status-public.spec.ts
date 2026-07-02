/**
 * Contract test GET /api/v1/system/status (T044). Rojo antes de impl.
 * Contrato SystemStatus: { appointmentsDisabled: boolean, reason?: string|null }.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('GET /api/v1/system/status', () => {
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

  it('responde 200 con appointmentsDisabled=false por defecto', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/system/status');
    expect(res.status).toBe(200);
    expect(res.body.appointmentsDisabled).toBe(false);
  });

  it('refleja el kill switch activo con su motivo', async () => {
    await prisma.systemState.update({
      where: { id: 1 },
      data: { appointmentsDisabled: true, disabledReason: 'Mantenimiento' },
    });
    // La caché del SystemStateService es de 5s; una app recién creada la lee fresca.
    const { app: app2 } = await createContractApp();
    const res = await request(app2.getHttpServer()).get('/api/v1/system/status');
    expect(res.status).toBe(200);
    expect(res.body.appointmentsDisabled).toBe(true);
    expect(res.body.reason).toBe('Mantenimiento');
    await app2.close();
  });
});
