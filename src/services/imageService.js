import Image from '../models/Image.js';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinaryService.js';
import { deleteFile } from '../utils/fileUtils.js';

export const createImage = async ({ filename, localFilePath, user_ip }) => {
  let publicId = null;
  let path = `/uploads/${filename}`; // Default to local file URL

  try {
    const result = await uploadToCloudinary(localFilePath);
    path = result.secure_url;
    publicId = result.public_id;
    deleteFile(localFilePath); // Delete the LOCAL file after successful Cloudinary upload
  } catch (err) {
    console.warn('Cloudinary upload failed, keeping local file:', err.message);
    // path remains as `/uploads/${filename}` for frontend access
  }

  const image = new Image({
    filename,
    path,
    publicId,
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

  if (!image.publicId) {
    deleteFile(image.path);
  }

  await Image.findByIdAndDelete(id);
  return image;
};
