import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { generateRequest } from '../test/fixtures.js';
import { SIGNED_URL, resetExternalMocks } from '../test/setup.js';
import { ASPECT_RATIOS } from '../types/index.js';

describe('POST /api/generate', () => {
  beforeEach(() => {
    resetExternalMocks();
  });

  it('returns three hero images for a valid brief with no assets', async () => {
    const response = await request(app).post('/api/generate').send(generateRequest());

    expect(response.status).toBe(200);
    expect(response.body.images).toHaveLength(3);
    expect(response.body.images.map((i: { aspectRatio: string }) => i.aspectRatio)).toEqual(
      ASPECT_RATIOS.map((r) => r.ratio)
    );
    for (const image of response.body.images) {
      expect(image.prompt).toContain('Acme Coffee');
      expect(image.url).toBe(SIGNED_URL);
    }
  });

  it('returns 400 when brandName is missing', async () => {
    const body = generateRequest();
    const { brandName: _brandName, ...briefWithoutBrand } = body.brief;

    const response = await request(app)
      .post('/api/generate')
      .send({ ...body, brief: briefWithoutBrand });

    expect(response.status).toBe(400);
  });
});
