/**
 * Integration test de hashing de contraseña admin (T107). Rojo antes de impl.
 * Verifica que el hash almacenado es bcrypt cost 12 y que valida la contraseña
 * correcta y rechaza la incorrecta (research §6).
 */
import * as bcrypt from 'bcrypt';
import { createContractApp, resetDb, seedAdmin } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';
import type { INestApplication } from '@nestjs/common';

describe('Hashing de contraseña admin (bcrypt cost 12)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createContractApp());
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await prisma.adminUser.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('almacena un hash bcrypt con cost 12 y no la contraseña en claro', async () => {
    await seedAdmin(prisma, { username: 'admin', password: 'secreto-de-prueba' });
    const admin = await prisma.adminUser.findUnique({ where: { username: 'admin' } });
    expect(admin?.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(admin?.passwordHash).not.toContain('secreto-de-prueba');
    await expect(bcrypt.compare('secreto-de-prueba', admin!.passwordHash)).resolves.toBe(true);
    await expect(bcrypt.compare('incorrecta', admin!.passwordHash)).resolves.toBe(false);
  });
});
