import * as imageService from '../services/imageService.js';
import { upload } from '../middlewares/upload.js';
import { success, created, badRequest, notFound, error } from '../utils/responseHelper.js';
import { deleteFile } from '../utils/fileUtils.js';
import path from 'path';
import fs from 'fs';

export const uploadImage = upload.single('image');

export const handleUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return badRequest(res, 'No file uploaded!');
    }

    const image = await imageService.createImage({
      filename: req.file.filename,
      localFilePath: req.file.path,
      user_ip: req.ip,
    });

    return created(res, image, 'Image uploaded successfully!');
  } catch (err) {
    if (req.file) {
      deleteFile(req.file.path);
    }
    next(err);
  }
};

export const getImages = async (req, res, next) => {
  try {
    const images = await imageService.getAllImages();
    return success(res, images);
  } catch (err) {
    next(err);
  }
};

export const getImageById = async (req, res, next) => {
  try {
    const image = await imageService.getImageById(req.params.id);
    if (!image) {
      return notFound(res, 'Image not found!');
    }
    return success(res, image);
  } catch (err) {
    next(err);
  }
};

export const deleteImage = async (req, res, next) => {
  try {
    const image = await imageService.deleteImage(req.params.id);
    if (!image) {
      return notFound(res, 'Image not found!');
    }
    return success(res, null, 'Image deleted successfully!');
  } catch (err) {
    next(err);
  }
};

export const serveImage = async (req, res, next) => {
  try {
    const image = await imageService.getImageById(req.params.id);
    if (!image) {
      return notFound(res, 'Image not found!');
    }

    const imagePath = image.path;

    if (imagePath.startsWith('/uploads/')) {
      const uploadDir = process.env.UPLOADS_FOLDER || './uploads';
      const fullPath = path.resolve(uploadDir, path.basename(imagePath));
      if (fs.existsSync(fullPath)) {
        return res.sendFile(fullPath);
      }
      return notFound(res, 'File not found on disk');
    }

    if (imagePath.includes('cloudinary.com')) {
      try {
        const response = await globalThis.fetch(imagePath);
        if (!response.ok) throw new Error('Cloudinary fetch failed');
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=31536000');
        return res.send(Buffer.from(buffer));
      } catch (fetchErr) {
        console.error('Proxy fetch error:', fetchErr.message);
        return error(res, 502, 'Failed to fetch image from Cloudinary');
      }
    }

    return notFound(res, 'Unknown image source');
  } catch (err) {
    next(err);
  }
};
