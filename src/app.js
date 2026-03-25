import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { env } from './config/index.js';
import { connectDB } from './config/database.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { multerErrorHandler } from './middlewares/multerError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();

app.use(helmet());

// Configure CORS
const allowedOrigins = env.cors.origin.split(',').map((o) => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Middlewares
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Static Files & Uploads
const uploadDir = path.resolve(rootDir, env.uploadsFolder);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(rootDir, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'public', 'index.html'));
});

// Routes
app.use(routes);

// Error Handling
app.use(multerErrorHandler);
app.use(errorHandler);

// Database Connection
await connectDB();

export default app;
