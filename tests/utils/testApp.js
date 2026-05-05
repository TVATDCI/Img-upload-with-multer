import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { cleanupDb, ensureUploadsDir } from './testHelpers.js';

let mongoServer;

export const setupIntegrationApp = async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.ALLOWED_ORIGINS = 'http://127.0.0.1:3101';
  process.env.UPLOADS_FOLDER = 'uploads-test';

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();

  await ensureUploadsDir();

  const { default: app } = await import('../../src/app.js');
  return app;
};

export const teardownIntegrationApp = async () => {
  await cleanupDb();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};
