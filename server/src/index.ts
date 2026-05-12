import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload.js';
import generateRouter from './routes/generate.js';
import imagesRouter from './routes/images.js';
import { appLogger } from './services/logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/upload', uploadRouter);
app.use('/api/generate', generateRouter);
app.use('/api/images', imagesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  appLogger.info(`Server running on port ${PORT}`);
});
