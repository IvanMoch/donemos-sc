/**
 * Contract test GET /api/v1/health (T042). Rojo antes de la implementación.
 * Contrato: { status: 'ok', db: 'ok'|'down' } (research §13).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp } from '../utils/contract-app';

describe('GET /api/v1/health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createContractApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 con status ok y db ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok' });
  });
});
