/**
 * Utilidades compartidas para los contract tests de US1.
 *
 * Levanta la app Nest real (AppModule completo) contra un PostgreSQL efímero
 * (testcontainers, research §11 — sin mocks del backend propio). El contenedor
 * se cachea a nivel de módulo: como cada worker de Jest ejecuta los archivos en
 * serie, los tests del mismo worker reutilizan un único Postgres (Ryuk lo
 * recoge al morir el proceso). El aislamiento entre tests lo da `resetDb`.
 */
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';

const RAIZ_BACKEND = join(__dirname, '..', '..');

let contenedor: Promise<StartedPostgreSqlContainer> | undefined;

/** Arranca (una vez por worker) el Postgres efímero, migrado, y fija DATABASE_URL. */
function asegurarContenedor(): Promise<StartedPostgreSqlContainer> {
  if (!contenedor) {
    contenedor = (async () => {
      const c = await new PostgreSqlContainer('postgres:16')
        .withDatabase('donemos')
        .withUsername('donemos')
        .withPassword('donemos')
        .start();
      process.env.DATABASE_URL = c.getConnectionUri();
      execSync('npx prisma migrate deploy', {
        cwd: RAIZ_BACKEND,
        env: { ...process.env },
        stdio: 'ignore',
      });
      return c;
    })();
  }
  return contenedor;
}

/** Crea la app Nest real lista para Supertest, con el prefijo /api/v1. */
export async function createContractApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  await asegurarContenedor();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

/** Deja la BD en estado limpio: sin slots ni citas y con el kill switch apagado. */
export async function resetDb(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE "appointment", "slot" RESTART IDENTITY CASCADE');
  await prisma.systemState.update({
    where: { id: 1 },
    data: { appointmentsDisabled: false, disabledReason: null, disabledAt: null },
  });
}

/** Inserta una franja de prueba y devuelve su id. Fecha por defecto: mañana. */
export async function seedSlot(
  prisma: PrismaService,
  overrides: Partial<{ date: string; startTime: string; endTime: string; capacity: number; isDisabled: boolean }> = {},
): Promise<string> {
  const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const slot = await prisma.slot.create({
    data: {
      date: new Date(`${overrides.date ?? manana}T00:00:00Z`),
      startTime: new Date(`1970-01-01T${overrides.startTime ?? '07:00'}:00Z`),
      endTime: new Date(`1970-01-01T${overrides.endTime ?? '07:35'}:00Z`),
      capacity: overrides.capacity ?? 3,
      isDisabled: overrides.isDisabled ?? false,
    },
  });
  return slot.id;
}

/** Inserta una cita activa de prueba y devuelve su id. */
export async function seedActiveAppointment(
  prisma: PrismaService,
  slotId: string,
  opts: { code: string; idNumber: string; firstName?: string; lastName?: string },
): Promise<string> {
  const cita = await prisma.appointment.create({
    data: {
      code: opts.code,
      slotId,
      firstName: opts.firstName ?? 'Ana',
      lastName: opts.lastName ?? 'Pérez',
      idNumber: opts.idNumber,
      status: 'active',
      eligibilityDeclaredAt: new Date(),
    },
  });
  return cita.id;
}
