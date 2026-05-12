import { Router } from 'express';
import { getSignedDownloadUrl } from '../services/s3.js';
import { appLogger } from '../services/logger.js';

const router = Router();

router.get('/*', async (req, res) => {
  try {
    const key = (req.params as unknown as Record<number, string>)[0];
    const url = await getSignedDownloadUrl(key);
    res.json({ url });
  } catch (error) {
    appLogger.error('Failed to get image URL', { error });
    res.status(500).json({ error: 'Failed to retrieve image' });
  }
});

export default router;
