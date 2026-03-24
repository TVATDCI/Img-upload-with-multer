import Image from '../models/Image.js';
import { uploadToCloudinary, deleteFromCloudinary } from './cloudinaryService.js';
import { deleteFile } from '../utils/fileUtils.js';
import { imageSizeFromFile } from 'image-size';
import { getPalette } from 'colorthief';

async function extractLocalMetadata(localFilePath) {
  const metadata = {
    dimensions: {},
    colors: [],
    fileType: null,
  };

  try {
    const dimensions = imageSizeFromFile(localFilePath);
    if (dimensions) {
      metadata.dimensions = {
        width: dimensions.width,
        height: dimensions.height,
      };
      metadata.fileType = dimensions.type ? `image/${dimensions.type}` : null;
    }
  } catch (err) {
    console.warn('Failed to extract dimensions:', err.message);
  }

  try {
    const palette = await getPalette(localFilePath, { colorCount: 6, format: 'hex' });
    metadata.colors = palette.map((c) => c.hex);
  } catch (err) {
    console.warn('Failed to extract colors:', err.message);
  }

  return metadata;
}

export const createImage = async ({ filename, originalName, localFilePath, size, user_ip }) => {
  let publicId = null;
  let path = `/uploads/${filename}`;
  let dimensions = {};
  let colors = [];
  let fileType = null;

  try {
    const result = await uploadToCloudinary(localFilePath, { colors: true });
    path = result.secure_url;
    publicId = result.public_id;

    if (result.width && result.height) {
      dimensions = { width: result.width, height: result.height };
    }

    if (result.colors && result.colors.length > 0) {
      colors = result.colors.slice(0, 6).map((c) => c[0]);
    }

    if (result.format) {
      fileType = `image/${result.format}`;
    }

    deleteFile(localFilePath);
  } catch (err) {
    console.warn('Cloudinary upload failed, keeping local file:', err.message);

    const localMetadata = await extractLocalMetadata(localFilePath);
    dimensions = localMetadata.dimensions;
    colors = localMetadata.colors;
    fileType = localMetadata.fileType;
  }

  const image = new Image({
    filename,
    originalName: originalName || filename,
    path,
    publicId,
    localPath: publicId ? null : localFilePath,
    size,
    dimensions,
    colors,
    fileType,
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

export const updateImageDisplayName = async (id, displayName) => {
  return Image.findByIdAndUpdate(id, { displayName }, { new: true });
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
