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
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { helmetOptions } from '../../src/common/security/helmet-options';

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
  // El JwtModule admin necesita el secreto; en test basta uno determinista.
  process.env.JWT_SECRET ??= 'test-secret-de-32-caracteres-minimo-xxxx';
  await asegurarContenedor();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(helmet(helmetOptions()));
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

/** Deja la BD en estado limpio: sin slots ni citas y con el kill switch apagado. */
export async function resetDb(prisma: PrismaService): Promise<void> {
  // admin_audit_log referencia admin_user (RESTRICT): se limpia aquí para que
  // los tests que reseedan el admin puedan borrarlo sin violar el FK.
  await prisma.$executeRawUnsafe('TRUNCATE "appointment", "slot", "admin_audit_log" RESTART IDENTITY CASCADE');
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

/** Inserta un admin de prueba (bcrypt cost 12) y devuelve su id. */
export async function seedAdmin(
  prisma: PrismaService,
  opts: { username?: string; password?: string; fullName?: string } = {},
): Promise<string> {
  const passwordHash = await bcrypt.hash(opts.password ?? 'secreto-de-prueba', 12);
  const admin = await prisma.adminUser.create({
    data: {
      username: opts.username ?? 'admin',
      passwordHash,
      fullName: opts.fullName ?? 'Admin de Prueba',
    },
  });
  return admin.id;
}

/** Hace login y devuelve el valor de la cookie `session` para reusar como header Cookie. */
export async function loginAndGetCookie(
  app: INestApplication,
  username = 'admin',
  password = 'secreto-de-prueba',
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/admin/auth/login')
    .send({ username, password });
  const setCookie = res.headers['set-cookie'];
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const session = cookies.find((c) => c.startsWith('session='));
  return session ? session.split(';')[0] : '';
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
