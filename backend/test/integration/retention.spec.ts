/**
 * Integration test del job de retención (T140, research §12). Rojo antes de impl.
 * Anonimiza las citas en estado final con fecha > umbral (TEST_REDACTION_DAYS),
 * dejando '***' en nombre/apellido y un hash irreversible en la cédula; no toca
 * las citas activas ni las recientes.
 */
import { createContractApp, resetDb, seedSlot } from '../utils/contract-app';
import { RetentionJob } from '../../src/modules/appointments/retention.job';
import type { PrismaService } from '../../src/common/prisma/prisma.service';
import type { INestApplication } from '@nestjs/common';

const AYER = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const MANANA = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

describe('RetentionJob (anonimización a 90 días)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let job: RetentionJob;

  beforeAll(async () => {
    process.env.REDACTION_PEPPER = 'pepper-de-prueba';
    ({ app, prisma } = await createContractApp());
    job = app.get(RetentionJob);
  });

  beforeEach(async () => {
    await resetDb(prisma);
    process.env.TEST_REDACTION_DAYS = '0'; // cualquier cita pasada es candidata
  });

  afterAll(async () => {
    delete process.env.TEST_REDACTION_DAYS;
    await app.close();
  });

  it('anonimiza citas finales pasadas y respeta activas/recientes', async () => {
    const slotViejo = await seedSlot(prisma, { date: AYER, startTime: '07:00', endTime: '07:35', capacity: 5 });
    const slotFuturo = await seedSlot(prisma, { date: MANANA, startTime: '07:00', endTime: '07:35', capacity: 5 });

    // Final + pasada → se anonimiza.
    await prisma.appointment.create({
      data: { code: 'FINALAAAA1', slotId: slotViejo, firstName: 'Ana', lastName: 'Pérez', idNumber: 'V11111111', status: 'no_show', eligibilityDeclaredAt: new Date() },
    });
    // Activa + pasada → NO se toca (no es estado final).
    await prisma.appointment.create({
      data: { code: 'ACTIVEAAA1', slotId: slotViejo, firstName: 'Beto', lastName: 'Díaz', idNumber: 'V22222222', status: 'active', eligibilityDeclaredAt: new Date() },
    });
    // Final + futura → NO se toca (no supera el umbral).
    await prisma.appointment.create({
      data: { code: 'FUTUREAAA1', slotId: slotFuturo, firstName: 'Caro', lastName: 'López', idNumber: 'V33333333', status: 'cancelled_by_donor', eligibilityDeclaredAt: new Date() },
    });

    const anonimizadas = await job.run();
    expect(anonimizadas).toBe(1);

    const final1 = await prisma.appointment.findUnique({ where: { code: 'FINALAAAA1' } });
    expect(final1?.firstName).toBe('***');
    expect(final1?.lastName).toBe('***');
    expect(final1?.idNumber).toMatch(/^H_/);
    expect(final1?.redactedAt).toBeInstanceOf(Date);

    const activa = await prisma.appointment.findUnique({ where: { code: 'ACTIVEAAA1' } });
    expect(activa?.firstName).toBe('Beto');
    expect(activa?.redactedAt).toBeNull();

    const futura = await prisma.appointment.findUnique({ where: { code: 'FUTUREAAA1' } });
    expect(futura?.idNumber).toBe('V33333333');
  });
});
