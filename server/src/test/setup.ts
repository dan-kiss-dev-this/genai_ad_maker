import { vi, type Mock } from 'vitest';

/**
 * Shared test harness. Mocks the three external boundaries the generate
 * pipeline touches so the real routes, validation and prompt builder run
 * without credentials, network access or OpenAI cost:
 *
 *   - `openai`                        -> images.generate / images.edit return a tiny PNG
 *   - `@aws-sdk/client-s3`            -> S3Client.send resolves
 *   - `@aws-sdk/s3-request-presigner` -> getSignedUrl returns a fake URL
 *
 * Tests import the exported mocks from this module to inspect or re-stub calls.
 */

/** A 1x1 transparent PNG, base64-encoded — the smallest valid image payload. */
export const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAE/AI/0/kAAAAASUVORK5CYII=';

export const SIGNED_URL = 'https://s3.test.invalid/signed-url';

interface OpenAIMock {
  imagesGenerate: Mock;
  imagesEdit: Mock;
  toFile: Mock;
}

interface S3Mock {
  send: Mock;
  getSignedUrl: Mock;
}

export const openaiMock: OpenAIMock = {
  imagesGenerate: vi.fn(),
  imagesEdit: vi.fn(),
  toFile: vi.fn(),
};

export const s3Mock: S3Mock = {
  send: vi.fn(),
  getSignedUrl: vi.fn(),
};

vi.mock('openai', () => {
  class MockOpenAI {
    images = {
      generate: openaiMock.imagesGenerate,
      edit: openaiMock.imagesEdit,
    };
  }
  return { default: MockOpenAI, OpenAI: MockOpenAI, toFile: openaiMock.toFile };
});

vi.mock('@aws-sdk/client-s3', () => {
  class MockS3Client {
    send = s3Mock.send;
  }
  class PutObjectCommand {
    constructor(public input: unknown) {}
  }
  class GetObjectCommand {
    constructor(public input: unknown) {}
  }
  return { S3Client: MockS3Client, PutObjectCommand, GetObjectCommand };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: s3Mock.getSignedUrl,
}));

/** Reset every mock to its default happy-path behavior. */
export function resetExternalMocks(): void {
  openaiMock.imagesGenerate.mockReset();
  openaiMock.imagesEdit.mockReset();
  openaiMock.toFile.mockReset();
  s3Mock.send.mockReset();
  s3Mock.getSignedUrl.mockReset();

  const imageResponse = { data: [{ b64_json: TINY_PNG_BASE64 }] };
  openaiMock.imagesGenerate.mockResolvedValue(imageResponse);
  openaiMock.imagesEdit.mockResolvedValue(imageResponse);
  openaiMock.toFile.mockImplementation(async (body: unknown, name: string) => ({ body, name }));
  s3Mock.send.mockResolvedValue({});
  s3Mock.getSignedUrl.mockResolvedValue(SIGNED_URL);
}

resetExternalMocks();
