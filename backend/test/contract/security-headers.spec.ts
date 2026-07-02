/**
 * Contract test de cabeceras de seguridad (T143). Rojo antes de impl.
 * helmet aplica CSP restrictivo y las cabeceras base; HSTS solo en producción.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp } from '../utils/contract-app';

describe('Cabeceras de seguridad (helmet)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createContractApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('incluye CSP y cabeceras base de helmet', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/live');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    // HSTS solo en producción: en test no debe aparecer.
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });
});
