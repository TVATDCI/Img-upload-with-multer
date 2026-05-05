import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/index.js';
import { deleteFile } from '../utils/fileUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '..', '..', env.uploadsFolder);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const storeVariant = async (variantResult) => {
  const { filenameBase, buffer, fallbackBuffer } = variantResult;

  const webpFilename = `${filenameBase}.webp`;
  const jpegFilename = `${filenameBase}.jpg`;

  const webpPath = path.join(uploadDir, webpFilename);
  const jpegPath = path.join(uploadDir, jpegFilename);

  fs.writeFileSync(webpPath, buffer);
  fs.writeFileSync(jpegPath, fallbackBuffer);

  return {
    webpPath: `/uploads/${webpFilename}`,
    jpegPath: `/uploads/${jpegFilename}`,
    localWebpPath: webpPath,
    localJpegPath: jpegPath,
  };
};

export const deleteVariantSet = (filenameBase) => {
  const webpFilename = `${filenameBase}.webp`;
  const jpegFilename = `${filenameBase}.jpg`;

  deleteFile(path.join(uploadDir, webpFilename));
  deleteFile(path.join(uploadDir, jpegFilename));
};

export const deleteImageVariants = (variants = []) => {
  for (const variant of variants) {
    if (variant.localPath) {
      deleteFile(variant.localPath);
    }
  }
};
