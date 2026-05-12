import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { appLogger } from './logger.js';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || '';

export function sanitizeForS3Key(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string = 'image/png'
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
  appLogger.info(`Uploaded to S3: ${key}`);
  return key;
}

export async function uploadJsonToS3(
  key: string,
  data: unknown
): Promise<string> {
  const body = Buffer.from(JSON.stringify(data, null, 2));
  return uploadToS3(key, body, 'application/json');
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export function buildS3Key(parts: {
  brandName: string;
  productName: string;
  timestamp: string;
  subfolder?: string;
  filename: string;
}): string {
  const brand = sanitizeForS3Key(parts.brandName);
  const product = sanitizeForS3Key(parts.productName);
  const segments = ['generated', brand, product, parts.timestamp];
  if (parts.subfolder) segments.push(parts.subfolder);
  segments.push(parts.filename);
  return segments.join('/');
}
