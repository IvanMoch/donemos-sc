/**
 * Contract test GET /api/v1/slots (T045). Rojo antes de impl.
 * Lista franjas con cupo dentro de la ventana pública, ordenadas por fecha/hora,
 * solo is_disabled=false y con remainingCapacity > 0 (FR-004, FR-013).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb, seedSlot } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

const MANANA = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

describe('GET /api/v1/slots', () => {
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

  it('devuelve las franjas disponibles con remainingCapacity y ordenadas por fecha/hora', async () => {
    await seedSlot(prisma, { date: MANANA, startTime: '08:00', endTime: '08:35', capacity: 2 });
    await seedSlot(prisma, { date: MANANA, startTime: '07:00', endTime: '07:35', capacity: 3 });

    const res = await request(app.getHttpServer()).get('/api/v1/slots');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    // Orden por fecha/hora ascendente.
    expect(res.body[0].startTime).toBe('07:00');
    expect(res.body[1].startTime).toBe('08:00');
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        date: MANANA,
        startTime: '07:00',
        endTime: '07:35',
        remainingCapacity: 3,
      }),
    );
  });

  it('excluye franjas deshabilitadas', async () => {
    await seedSlot(prisma, { capacity: 2, isDisabled: true });
    const res = await request(app.getHttpServer()).get('/api/v1/slots');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('excluye franjas sin cupo restante', async () => {
    const slotId = await seedSlot(prisma, { capacity: 1 });
    await prisma.appointment.create({
      data: {
        code: 'ABCDEFGHJK',
        slotId,
        firstName: 'Ana',
        lastName: 'Pérez',
        idNumber: 'V12345678',
        status: 'active',
        eligibilityDeclaredAt: new Date(),
      },
    });
    const res = await request(app.getHttpServer()).get('/api/v1/slots');
    expect(res.body).toHaveLength(0);
  });

  it('respeta el filtro from/to', async () => {
    await seedSlot(prisma, { date: MANANA, capacity: 2 });
    const pasado = '2020-01-01';
    const res = await request(app.getHttpServer()).get(`/api/v1/slots?from=${pasado}&to=${pasado}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});
