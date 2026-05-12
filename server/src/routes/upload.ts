import { Router } from 'express';
import { upload } from '../middleware/multer.js';
import { uploadToS3, getSignedDownloadUrl } from '../services/s3.js';
import { v4 as uuidv4 } from 'uuid';
import { appLogger } from '../services/logger.js';

const router = Router();

router.post('/', upload.array('files', 16), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const assetType = req.body.assetType as string; // 'logo' | 'product' | 'reference'
    const productIndex = req.body.productIndex
      ? parseInt(req.body.productIndex, 10)
      : undefined;

    const uploadedAssets = await Promise.all(
      files.map(async (file) => {
        const ext = file.originalname.split('.').pop() || 'png';
        const key = `uploads/${assetType}/${uuidv4()}.${ext}`;
        await uploadToS3(key, file.buffer, file.mimetype);
        const url = await getSignedDownloadUrl(key);

        return {
          type: assetType,
          productIndex,
          url,
          key,
          originalName: file.originalname,
        };
      })
    );

    appLogger.info(`Uploaded ${uploadedAssets.length} ${assetType} asset(s)`);
    res.json({ assets: uploadedAssets });
  } catch (error) {
    appLogger.error('Upload failed', { error });
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
