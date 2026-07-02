/**
 * Test de integración del esquema (T024). Escrito antes de la migración
 * (Principio V — TDD): corre contra un Postgres real (testcontainers) al que
 * el helper aplica las migraciones Prisma. Verifica las invariantes de
 * data-model.md que Prisma NO expresa declarativamente y que, por tanto,
 * viven en SQL crudo dentro de la migración:
 *
 *  - Índice parcial único `UNIQUE (id_number) WHERE status = 'active'` (FR-007).
 *  - Singleton `system_state` (id = 1, fila única sembrada por la migración).
 *  - CHECK del patrón de cédula en `appointment.id_number` (V2).
 */
import { PrismaClient } from '@prisma/client';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { startPostgresContainer } from '../utils/postgres-container';

describe('Esquema de base de datos (migración inicial)', () => {
  let contenedor: StartedPostgreSqlContainer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    contenedor = await startPostgresContainer();
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await contenedor?.stop();
  });

  it('crea el índice parcial único de una cita activa por cédula', async () => {
    const filas = (await prisma.$queryRawUnsafe(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'appointment'`,
    )) as Array<{ indexdef: string }>;
    const parcialUnico = filas.find(
      (f) =>
        /unique/i.test(f.indexdef) &&
        /id_number/i.test(f.indexdef) &&
        /where/i.test(f.indexdef) &&
        /active/i.test(f.indexdef),
    );
    expect(parcialUnico).toBeDefined();
  });

  it('siembra el singleton system_state con id = 1', async () => {
    const filas = (await prisma.$queryRawUnsafe(`SELECT id FROM system_state`)) as Array<{
      id: number;
    }>;
    expect(filas).toHaveLength(1);
    expect(Number(filas[0]?.id)).toBe(1);
  });

  it('impide insertar una segunda fila en system_state (CHECK id = 1)', async () => {
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO system_state (id, appointments_disabled) VALUES (2, false)`,
      ),
    ).rejects.toThrow();
  });

  it('declara el CHECK del patrón de cédula en appointment.id_number', async () => {
    const filas = (await prisma.$queryRawUnsafe(
      `SELECT pg_get_constraintdef(oid) AS def
         FROM pg_constraint
        WHERE conrelid = 'appointment'::regclass AND contype = 'c'`,
    )) as Array<{ def: string }>;
    const checkCedula = filas.find((f) => /id_number/i.test(f.def) && /\[VE\]/.test(f.def));
    expect(checkCedula).toBeDefined();
  });

  it('impide un status fuera del enum permitido (CHECK status)', async () => {
    const filas = (await prisma.$queryRawUnsafe(
      `SELECT pg_get_constraintdef(oid) AS def
         FROM pg_constraint
        WHERE conrelid = 'appointment'::regclass AND contype = 'c'`,
    )) as Array<{ def: string }>;
    const checkStatus = filas.find((f) => /status/i.test(f.def) && /cancelled_by_bank/i.test(f.def));
    expect(checkStatus).toBeDefined();
  });
});
