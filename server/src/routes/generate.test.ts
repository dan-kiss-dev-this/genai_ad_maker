import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { generateRequest } from '../test/fixtures.js';
import { SIGNED_URL, openaiMock, resetExternalMocks, s3Mock } from '../test/setup.js';
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

  describe('otherGuidelines', () => {
    it('adds the trimmed text to every hero prompt before the layout instructions', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send(generateRequest({ otherGuidelines: '  \n No people in the shot  \n' }));

      expect(response.status).toBe(200);
      expect(response.body.images).toHaveLength(3);
      for (const image of response.body.images as { prompt: string }[]) {
        const line = 'Additional guidelines: No people in the shot\n';
        expect(image.prompt).toContain(line);
        expect(image.prompt.indexOf(line)).toBeLessThan(
          image.prompt.indexOf('IMPORTANT LAYOUT INSTRUCTIONS')
        );
      }
    });

    it('places the line after the brand guidelines and competitor references', async () => {
      const response = await request(app).post('/api/generate').send(
        generateRequest({
          brandGuidelines: 'Always show the logo',
          competitorReferences: 'Blue Bottle ads',
          otherGuidelines: 'Avoid the color red',
        })
      );

      expect(response.status).toBe(200);
      for (const image of response.body.images as { prompt: string }[]) {
        const additional = image.prompt.indexOf('Additional guidelines: Avoid the color red');
        expect(image.prompt.indexOf('Brand guidelines: Always show the logo')).toBeLessThan(additional);
        expect(image.prompt.indexOf('Competitor references for style inspiration: Blue Bottle ads')).toBeLessThan(additional);
      }
    });

    it('adds no line when the field is omitted', async () => {
      const body = generateRequest();
      expect(body.brief).not.toHaveProperty('otherGuidelines');

      const response = await request(app).post('/api/generate').send(body);

      expect(response.status).toBe(200);
      expect(response.body.images).toHaveLength(3);
      for (const image of response.body.images as { prompt: string }[]) {
        expect(image.prompt).not.toContain('Additional guidelines');
      }
    });

    it.each([
      ['empty', ''],
      ['whitespace-only', '  \n\t  '],
    ])('adds no line when the field is %s', async (_label, otherGuidelines) => {
      const response = await request(app)
        .post('/api/generate')
        .send(generateRequest({ otherGuidelines }));

      expect(response.status).toBe(200);
      expect(response.body.images).toHaveLength(3);
      for (const image of response.body.images as { prompt: string }[]) {
        expect(image.prompt).not.toContain('Additional guidelines');
      }
    });
  });

  describe('otherGuidelines length limit', () => {
    it('accepts exactly 300 characters', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send(generateRequest({ otherGuidelines: 'a'.repeat(300) }));

      expect(response.status).toBe(200);
      expect(response.body.images).toHaveLength(3);
    });

    it('rejects 301 characters before calling OpenAI', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send(generateRequest({ otherGuidelines: 'a'.repeat(301) }));

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid brief: otherGuidelines must be 300 characters or fewer',
      });
      expect(openaiMock.imagesGenerate).not.toHaveBeenCalled();
      expect(openaiMock.imagesEdit).not.toHaveBeenCalled();
      expect(s3Mock.send).not.toHaveBeenCalled();
    });

    it('measures the trimmed length, so padding does not count', async () => {
      const otherGuidelines = `   ${'a'.repeat(300)}\n\n   `;
      expect(otherGuidelines.length).toBeGreaterThan(300);

      const response = await request(app)
        .post('/api/generate')
        .send(generateRequest({ otherGuidelines }));

      expect(response.status).toBe(200);
      expect(response.body.images).toHaveLength(3);
    });

    it('accepts a brief without the field', async () => {
      const response = await request(app).post('/api/generate').send(generateRequest());

      expect(response.status).toBe(200);
      expect(response.body.images).toHaveLength(3);
    });
  });
});
