/**
 * Contract test GET /api/v1/content/donation-info (T043). Rojo antes de impl.
 * Verifica 6 requisitos + 5 consideraciones, el nombre del hospital, mapUrl y
 * schedule (spec.md > Contenido Informativo; contrato DonationInfo).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createContractApp } from '../utils/contract-app';

describe('GET /api/v1/content/donation-info', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createContractApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 con 6 requisitos, 5 consideraciones y datos del hospital', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/content/donation-info');
    expect(res.status).toBe(200);
    expect(res.body.requirements).toHaveLength(6);
    expect(res.body.exclusions).toHaveLength(5);
    for (const req of res.body.requirements) {
      expect(req).toEqual(expect.objectContaining({ title: expect.any(String), description: expect.any(String) }));
    }
    for (const exc of res.body.exclusions) {
      expect(['conditional', 'excluding', 'special_section']).toContain(exc.kind);
    }
    expect(res.body.hospital).toEqual(
      expect.objectContaining({
        name: 'Hospital Central de San Cristóbal',
        mapUrl: expect.stringContaining('maps.app.goo.gl'),
        schedule: expect.any(String),
      }),
    );
  });
});
