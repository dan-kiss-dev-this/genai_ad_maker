import 'dotenv/config';
import app from './app.js';
import { appLogger } from './services/logger.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  appLogger.info(`Server running on port ${PORT}`);
});
