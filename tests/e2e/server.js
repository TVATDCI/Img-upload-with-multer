import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { cleanupDb, seedAdminUser, seedImage } from '../utils/testHelpers.js';

process.env.NODE_ENV = 'test';
process.env.PORT = '3101';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1d';
process.env.ALLOWED_ORIGINS = 'http://127.0.0.1:3101';
process.env.UPLOADS_FOLDER = 'uploads-e2e';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'Password123!';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

const mongoServer = await MongoMemoryServer.create();
process.env.MONGO_URI = mongoServer.getUri();

const { default: app } = await import('../../src/app.js');

await cleanupDb();
await seedAdminUser();
await seedImage({ filename: 'e2e-seeded.png', originalName: 'e2e-seeded.png' });

const server = app.listen(process.env.PORT, () => {
  console.log(`E2E server listening on ${process.env.PORT}`);
});

const shutdown = async () => {
  await cleanupDb();
  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
  await mongoose.disconnect();
  await mongoServer.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
