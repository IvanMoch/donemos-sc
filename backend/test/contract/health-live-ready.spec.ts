/**
 * Contract test de health diferenciado (T144). Rojo antes de impl.
 * /health/live: proceso vivo (sin BD). /health/ready: incluye ping a Postgres.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp } from '../utils/contract-app';

describe('Health diferenciado', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createContractApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live responde 200 sin depender de la BD', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /health/ready responde 200 con db ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok' });
  });
});
