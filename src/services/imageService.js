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
    console.log('[Cloudinary] Uploaded:', { path, publicId });
    deleteFile(localFilePath);
  } catch (err) {
    console.warn('Cloudinary upload failed, keeping local file:', err.message);
  }

  console.log('[Image] Saving to DB:', { filename, path, publicId, localPath: publicId ? null : localFilePath });

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
