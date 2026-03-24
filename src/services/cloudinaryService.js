import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/index.js';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

export const uploadToCloudinary = (filePath, options = {}) => {
  return cloudinary.uploader.upload(filePath, {
    folder: 'img-upload',
    resource_type: 'auto',
    ...options,
  });
};

export const deleteFromCloudinary = (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};
