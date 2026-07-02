/**
 * Integration test del job de expiración (T141). Rojo antes de impl. Marca como
 * no_show las citas `active` cuyo slot ya terminó hace más de 2h; no toca las
 * futuras ni las ya finalizadas.
 */
import { createContractApp, resetDb, seedSlot } from '../utils/contract-app';
import { ExpireActiveJob } from '../../src/modules/appointments/expire-active.job';
import type { PrismaService } from '../../src/common/prisma/prisma.service';
import type { INestApplication } from '@nestjs/common';

const AYER = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const MANANA = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

describe('ExpireActiveJob (marcar no_show)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let job: ExpireActiveJob;

  beforeAll(async () => {
    ({ app, prisma } = await createContractApp());
    job = app.get(ExpireActiveJob);
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('marca no_show las citas activas de slots pasados y respeta las futuras', async () => {
    const pasado = await seedSlot(prisma, { date: AYER, startTime: '07:00', endTime: '07:35', capacity: 5 });
    const futuro = await seedSlot(prisma, { date: MANANA, startTime: '07:00', endTime: '07:35', capacity: 5 });
    await prisma.appointment.create({
      data: { code: 'PASTAAAAA1', slotId: pasado, firstName: 'Ana', lastName: 'P', idNumber: 'V11111111', status: 'active', eligibilityDeclaredAt: new Date() },
    });
    await prisma.appointment.create({
      data: { code: 'FUTUREAAA1', slotId: futuro, firstName: 'Beto', lastName: 'D', idNumber: 'V22222222', status: 'active', eligibilityDeclaredAt: new Date() },
    });

    const expiradas = await job.run();
    expect(expiradas).toBe(1);

    expect((await prisma.appointment.findUnique({ where: { code: 'PASTAAAAA1' } }))?.status).toBe('no_show');
    expect((await prisma.appointment.findUnique({ where: { code: 'FUTUREAAA1' } }))?.status).toBe('active');
  });
});
