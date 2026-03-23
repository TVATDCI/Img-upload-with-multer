import Image from '../models/Image.js';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinaryService.js';
import { deleteFile } from '../utils/fileUtils.js';

export const createImage = async ({ filename, localFilePath, user_ip }) => {
  let publicId = null;
  let path = `/uploads/${filename}`;

  try {
    const result = await uploadToCloudinary(localFilePath);
    path = result.secure_url;
    publicId = result.public_id;
    deleteFile(localFilePath);
  } catch (err) {
    console.warn('Cloudinary upload failed, keeping local file:', err.message);
  }

  const image = new Image({
    filename,
    path,
    publicId,
    localPath: publicId ? null : localFilePath,
    uploadDate: new Date(),
    user_ip,
  });
  await image.save();
  return image;
};

export const getAllImages = async () => {
  return Image.find().sort({ uploadDate: -1 });
};

export const getImagesPaginated = async (skip, limit) => {
  return Image.find().sort({ uploadDate: -1 }).skip(skip).limit(limit);
};

export const getTotalImageCount = async () => {
  return Image.countDocuments();
};

export const getImageById = async (id) => {
  return Image.findById(id);
};

export const deleteImage = async (id) => {
  const image = await Image.findById(id);
  if (!image) return null;

  if (image.publicId) {
    try {
      await deleteFromCloudinary(image.publicId);
    } catch (err) {
      console.warn('Cloudinary delete failed:', err.message);
    }
  }

  if (image.localPath) {
    deleteFile(image.localPath);
  }

  await Image.findByIdAndDelete(id);
  return image;
};

export const batchDeleteImages = async (ids) => {
  const results = await Promise.allSettled(ids.map((id) => deleteImage(id)));

  const succeeded = [];
  const failed = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      succeeded.push(ids[index]);
    } else {
      failed.push({
        id: ids[index],
        reason: result.reason?.message || 'Delete failed',
      });
    }
  });

  return { succeeded, failed, results };
};
