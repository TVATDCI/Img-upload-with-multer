import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,
  uploadsFolder: process.env.UPLOADS_FOLDER || 'uploads',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  cors: {
    origin: process.env.ALLOWED_ORIGINS || '*',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-for-dev-only',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
};
