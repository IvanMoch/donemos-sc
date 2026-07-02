/**
 * Contract test rate limit POST /api/v1/appointments (T051). Rojo antes de impl.
 * Bucket público 30/min: la 31ª request dentro de la ventana → 429 (research §10).
 * El throttler actúa en el guard, antes de validar el cuerpo, así que se pueden
 * enviar cuerpos inválidos y aun así contar para el límite.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp, resetDb } from '../utils/contract-app';
import type { PrismaService } from '../../src/common/prisma/prisma.service';

describe('POST /api/v1/appointments (rate limit)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createContractApp());
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('devuelve 429 en la request 31 dentro del minuto', async () => {
    const cuerpo = { eligibilityDeclared: false }; // inválido: no importa, el throttle cuenta antes
    let ultimo = 0;
    for (let i = 0; i < 31; i += 1) {
      const res = await request(app.getHttpServer()).post('/api/v1/appointments').send(cuerpo);
      ultimo = res.status;
    }
    expect(ultimo).toBe(429);
  });
});
