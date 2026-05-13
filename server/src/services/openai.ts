import OpenAI, { toFile } from 'openai';
import {
  MissingAsset,
  CampaignBrief,
  AssetUpload,
  AspectRatioConfig,
  ASPECT_RATIOS,
  GeneratedImage,
  GenerationLogEntry,
} from '../types/index.js';
import { buildMissingAssetPrompt, buildHeroImagePrompt } from './promptBuilder.js';
import { uploadToS3, buildS3Key, getSignedDownloadUrl, sanitizeForS3Key } from './s3.js';
import { generationLogger } from './logger.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ImageSize = '1024x1024' | '1024x1536' | '1536x1024' | 'auto';

async function generateImage(
  prompt: string,
  size: ImageSize,
  inputImages?: { url: string }[]
): Promise<Buffer> {
  if (inputImages && inputImages.length > 0) {
    // Download images and convert to File objects for the edit API
    const imageFiles = await Promise.all(
      inputImages.map(async (img, i) => {
        const res = await fetch(img.url);
        const buffer = Buffer.from(await res.arrayBuffer());
        return toFile(buffer, `image-${i}.png`, { type: 'image/png' });
      })
    );

    const response = await openai.images.edit({
      model: 'gpt-image-1',
      prompt,
      image: imageFiles as any,
      size: size === 'auto' ? '1024x1024' : size,
      quality: 'high',
    });

    const imageData = response.data?.[0]?.b64_json;
    if (!imageData) {
      throw new Error('No image was generated in the response');
    }

    return Buffer.from(imageData, 'base64');
  } else {
    // Use images.generate when no input images
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      size: size === 'auto' ? '1024x1024' : size,
      quality: 'high',
    });

    const imageData = response.data?.[0]?.b64_json;
    if (!imageData) {
      throw new Error('No image was generated in the response');
    }

    return Buffer.from(imageData, 'base64');
  }
}

function getOpenAISize(ratio: AspectRatioConfig): ImageSize {
  switch (ratio.ratio) {
    case '1:1': return '1024x1024';
    case '9:16': return '1024x1536';
    case '16:9': return '1536x1024';
  }
}

export async function generateMissingAssetImages(
  missingAssets: MissingAsset[],
  brandName: string,
  productName: string,
  timestamp: string
): Promise<{ images: GeneratedImage[]; logs: GenerationLogEntry[] }> {
  const images: GeneratedImage[] = [];
  const logs: GenerationLogEntry[] = [];

  for (const asset of missingAssets) {
    const prompt = buildMissingAssetPrompt(asset);
    const startTime = Date.now();
    const sanitizedDesc = sanitizeForS3Key(asset.description).slice(0, 60);

    const logEntry: GenerationLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'missing-asset',
      prompt,
      inputImageRefs: [],
      requestedDimensions: { width: 1024, height: 1024 },
      status: 'success',
      durationMs: 0,
    };

    try {
      const imageBuffer = await generateImage(prompt, '1024x1024');
      logEntry.durationMs = Date.now() - startTime;

      const filename = `missing-asset-${sanitizedDesc}.png`;
      const s3Key = buildS3Key({
        brandName,
        productName,
        timestamp,
        subfolder: 'missing-assets',
        filename,
      });

      await uploadToS3(s3Key, imageBuffer);
      const url = await getSignedDownloadUrl(s3Key);

      images.push({
        url,
        s3Key,
        aspectRatio: '1:1',
        prompt,
        isMissingAsset: true,
        missingAssetDescription: asset.description,
      });

      generationLogger.info('Missing asset generated', logEntry);
    } catch (error) {
      logEntry.status = 'error';
      logEntry.error = error instanceof Error ? error.message : String(error);
      logEntry.durationMs = Date.now() - startTime;
      generationLogger.error('Missing asset generation failed', logEntry);
      throw error;
    }

    logs.push(logEntry);
  }

  return { images, logs };
}

export async function generateHeroImages(
  brief: CampaignBrief,
  assets: AssetUpload[],
  missingAssetImageUrls: string[],
  productName: string,
  timestamp: string
): Promise<{ images: GeneratedImage[]; logs: GenerationLogEntry[] }> {
  const images: GeneratedImage[] = [];
  const logs: GenerationLogEntry[] = [];

  const inputImages: { url: string }[] = [];

  // Add uploaded assets as input references
  for (const asset of assets) {
    inputImages.push({ url: asset.url });
  }

  // Add generated missing asset images as input references
  for (const url of missingAssetImageUrls) {
    inputImages.push({ url });
  }

  for (const aspectRatio of ASPECT_RATIOS) {
    const prompt = buildHeroImagePrompt(brief, aspectRatio);
    const size = getOpenAISize(aspectRatio);
    const startTime = Date.now();

    const ratioFolder = aspectRatio.ratio.replace(':', 'x');

    const logEntry: GenerationLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'hero-image',
      aspectRatio: aspectRatio.ratio,
      prompt,
      inputImageRefs: inputImages.map((i) => i.url),
      requestedDimensions: { width: aspectRatio.width, height: aspectRatio.height },
      status: 'success',
      durationMs: 0,
    };

    try {
      const imageBuffer = await generateImage(prompt, size, inputImages);
      logEntry.durationMs = Date.now() - startTime;

      const s3Key = buildS3Key({
        brandName: brief.brandName,
        productName,
        timestamp,
        subfolder: ratioFolder,
        filename: 'image.png',
      });

      await uploadToS3(s3Key, imageBuffer);
      const url = await getSignedDownloadUrl(s3Key);

      images.push({
        url,
        s3Key,
        aspectRatio: aspectRatio.ratio,
        prompt,
      });

      generationLogger.info('Hero image generated', logEntry);
    } catch (error) {
      logEntry.status = 'error';
      logEntry.error = error instanceof Error ? error.message : String(error);
      logEntry.durationMs = Date.now() - startTime;
      generationLogger.error('Hero image generation failed', logEntry);
      throw error;
    }

    logs.push(logEntry);
  }

  return { images, logs };
}
