import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  GenerateRequest,
  GenerateResponse,
  GenerationLogEntry,
  MissingAsset,
} from '../types/index.js';
import {
  generateMissingAssetImages,
  generateHeroImages,
} from '../services/openai.js';
import { uploadJsonToS3, buildS3Key } from '../services/s3.js';
import { appLogger } from '../services/logger.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { brief, assets, missingAssets } = req.body as GenerateRequest;

    if (!brief || !brief.brandName || !brief.products?.length) {
      res.status(400).json({ error: 'Invalid brief: brandName and at least one product are required' });
      return;
    }

    const sessionId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const allLogs: GenerationLogEntry[] = [];

    appLogger.info(`Starting generation session ${sessionId} for ${brief.brandName}`);

    // Process each product
    const allHeroImages: GenerateResponse['images'] = [];
    const allMissingAssetImages: GenerateResponse['missingAssetImages'] = [];

    for (const product of brief.products) {
      // Step 1: Generate missing asset images (if any)
      const productMissingAssets = missingAssets?.filter(
        (a) => a.productIndex !== undefined
          ? brief.products[a.productIndex]?.name === product.name
          : true
      ) || [];

      let missingAssetImageUrls: string[] = [];

      if (productMissingAssets.length > 0) {
        appLogger.info(`Generating ${productMissingAssets.length} missing asset(s) for ${product.name}`);
        const missingResult = await generateMissingAssetImages(
          productMissingAssets,
          brief.brandName,
          product.name,
          timestamp
        );
        allMissingAssetImages.push(...missingResult.images);
        allLogs.push(...missingResult.logs);
        missingAssetImageUrls = missingResult.images.map((i) => i.url);
      }

      // Step 2: Generate hero images for all 3 aspect ratios
      appLogger.info(`Generating hero images for ${product.name}`);
      const heroResult = await generateHeroImages(
        brief,
        assets || [],
        missingAssetImageUrls,
        product.name,
        timestamp
      );
      allHeroImages.push(...heroResult.images);
      allLogs.push(...heroResult.logs);

      // Save generation log to S3
      const logKey = buildS3Key({
        brandName: brief.brandName,
        productName: product.name,
        timestamp,
        filename: 'generation-log.json',
      });
      await uploadJsonToS3(logKey, {
        sessionId,
        brief,
        assets,
        missingAssets: productMissingAssets,
        logs: allLogs,
      });
    }

    const response: GenerateResponse = {
      sessionId,
      images: allHeroImages,
      missingAssetImages: allMissingAssetImages,
      generationLog: allLogs,
    };

    appLogger.info(`Generation complete for session ${sessionId}: ${allHeroImages.length} hero images, ${allMissingAssetImages.length} missing asset images`);
    res.json(response);
  } catch (error) {
    appLogger.error('Generation failed', { error });
    res.status(500).json({
      error: 'Image generation failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post('/missing-asset', async (req, res) => {
  try {
    const { missingAsset, brandName } = req.body as {
      missingAsset: MissingAsset;
      brandName: string;
    };

    if (!missingAsset?.description || !brandName) {
      res.status(400).json({ error: 'missingAsset with description and brandName are required' });
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    appLogger.info(`Generating preview for missing asset: ${missingAsset.description}`);

    const result = await generateMissingAssetImages(
      [missingAsset],
      brandName,
      'preview',
      timestamp
    );

    res.json({ image: result.images[0] });
  } catch (error) {
    appLogger.error('Missing asset generation failed', { error });
    res.status(500).json({
      error: 'Missing asset generation failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
