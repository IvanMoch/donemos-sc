/**
 * Helper de testcontainers para las suites de integración del backend.
 *
 * Levanta un PostgreSQL 16 efímero, exporta su URL en DATABASE_URL y aplica
 * las migraciones Prisma si ya existen (a partir de T022). Uso típico:
 *
 *   let contenedor: StartedPostgreSqlContainer;
 *   beforeAll(async () => { contenedor = await startPostgresContainer(); });
 *   afterAll(async () => { await contenedor.stop(); });
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const RAIZ_BACKEND = join(__dirname, '..', '..');

/** Arranca un Postgres 16 efímero y deja DATABASE_URL apuntando a él. */
export async function startPostgresContainer(): Promise<StartedPostgreSqlContainer> {
  const contenedor = await new PostgreSqlContainer('postgres:16')
    .withDatabase('donemos')
    .withUsername('donemos')
    .withPassword('donemos')
    .start();

  // Prisma y la app Nest bajo test leen la conexión desde el entorno.
  process.env.DATABASE_URL = contenedor.getConnectionUri();

  // Mientras no existan migraciones (llegan en T022) el contenedor queda
  // vacío a propósito; los tests de esquema fallarían — comportamiento TDD.
  const dirMigraciones = join(RAIZ_BACKEND, 'prisma', 'migrations');
  if (existsSync(dirMigraciones)) {
    execSync('npx prisma migrate deploy', {
      cwd: RAIZ_BACKEND,
      env: { ...process.env },
      stdio: 'inherit',
    });
  }

  return contenedor;
}
