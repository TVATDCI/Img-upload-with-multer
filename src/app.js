import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { env } from './config/index.js';
import { connectDB } from './config/database.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { multerErrorHandler } from './middlewares/multerError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());
const allowedOrigins = env.cors.origin.split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10kb' }));

const uploadDir = path.resolve(__dirname, '..', env.uploadsFolder);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

app.use(routes);
app.use(multerErrorHandler);
app.use(errorHandler);

await connectDB();

export default app;
