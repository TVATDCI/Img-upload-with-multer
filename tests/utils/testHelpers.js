import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import Album from '../../src/models/Album.js';
import Image from '../../src/models/Image.js';
import User from '../../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const fixturesDir = path.resolve(__dirname, '..', 'fixtures', 'sample-images');
export const samplePngPath = path.join(fixturesDir, 'sample.png');
export const sampleJpegPath = path.join(fixturesDir, 'sample.jpg');

export const getUploadsDir = () => path.resolve(process.cwd(), process.env.UPLOADS_FOLDER || 'uploads-test');

export const ensureUploadsDir = async () => {
  await fs.mkdir(getUploadsDir(), { recursive: true });
};

export const createAuthCookie = (userOrId, options = {}) => {
  const userId = typeof userOrId === 'object' ? userOrId._id?.toString() : String(userOrId);
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
    ...options,
  });

  return `jwt=${token}`;
};

export const seedAdminUser = async (overrides = {}) => {
  return User.create({
    email: 'admin@example.com',
    password: 'Password123!',
    role: 'admin',
    ...overrides,
  });
};

export const copyFixtureToUploads = async (fixtureName = 'sample.png', targetName = fixtureName) => {
  await ensureUploadsDir();

  const sourcePath = path.join(fixturesDir, fixtureName);
  const destinationPath = path.join(getUploadsDir(), targetName);

  await fs.copyFile(sourcePath, destinationPath);

  return destinationPath;
};

export const seedImage = async (overrides = {}) => {
  const {
    fixtureName = 'sample.png',
    filename = `seed-${Date.now()}.${fixtureName.split('.').pop()}`,
    originalName = fixtureName,
    path: imagePath,
    localPath,
    publicId = null,
  } = overrides;

  let resolvedPath = imagePath;
  let resolvedLocalPath = localPath;

  if (!resolvedPath) {
    resolvedLocalPath = await copyFixtureToUploads(fixtureName, filename);
    resolvedPath = `/uploads/${filename}`;
  }

  return Image.create({
    filename,
    originalName,
    displayName: overrides.displayName,
    path: resolvedPath,
    publicId,
    localPath: publicId ? null : resolvedLocalPath,
    size: overrides.size ?? 128,
    dimensions: overrides.dimensions ?? { width: 1, height: 1 },
    colors: overrides.colors ?? ['#ffffff'],
    fileType: overrides.fileType ?? (fixtureName.endsWith('.png') ? 'image/png' : 'image/jpeg'),
    uploadDate: overrides.uploadDate ?? new Date(),
    user_ip: overrides.user_ip ?? '127.0.0.1',
    tags: overrides.tags ?? [],
    album: overrides.album ?? null,
  });
};

export const cleanupDb = async () => {
  await Promise.all([Album.deleteMany({}), Image.deleteMany({}), User.deleteMany({})]);

  await ensureUploadsDir();
  const uploadEntries = await fs.readdir(getUploadsDir(), { withFileTypes: true });
  await Promise.all(
    uploadEntries.map((entry) =>
      fs.rm(path.join(getUploadsDir(), entry.name), { force: true, recursive: true })
    )
  );
};
