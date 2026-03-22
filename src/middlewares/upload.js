import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { env } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '..', '..', env.uploadsFolder);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        'LIMIT_FILE_TYPE',
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`
      ),
      false
    );
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 },
  fileFilter,
});
