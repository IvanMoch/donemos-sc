/**
 * Seed de DonemosSC (T023).
 *
 * Idempotente. Crea/asegura:
 *  - El singleton `system_state` (id = 1). La migración ya lo siembra; aquí se
 *    reasegura por si se corre el seed contra una BD creada por otro camino.
 *  - El `admin_user` inicial, con credenciales tomadas del entorno
 *    (ADMIN_USERNAME / ADMIN_PASSWORD) y contraseña hasheada con bcrypt cost 12
 *    (research §6). No sobrescribe la contraseña si el usuario ya existe.
 *
 * Uso: `pnpm --filter backend exec prisma db seed` (o `prisma migrate reset`).
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const BCRYPT_COST = 12;

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD ?? 'cambiar-en-produccion';
  const fullName = process.env.ADMIN_FULL_NAME ?? 'Administrador del Banco';

  // Singleton del kill switch: garantizar la fila id = 1.
  await prisma.systemState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, appointmentsDisabled: false },
  });

  // Admin inicial: solo se crea si no existe (no se pisa la contraseña vigente).
  const existente = await prisma.adminUser.findUnique({ where: { username } });
  if (!existente) {
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    await prisma.adminUser.create({
      data: { username, passwordHash, fullName },
    });
    // eslint-disable-next-line no-console -- salida informativa del seed (script, no runtime).
    console.log(`Seed: admin_user "${username}" creado.`);
  } else {
    // eslint-disable-next-line no-console -- salida informativa del seed (script, no runtime).
    console.log(`Seed: admin_user "${username}" ya existía; sin cambios.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    // eslint-disable-next-line no-console -- error fatal del seed.
    console.error('Seed falló:', error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
