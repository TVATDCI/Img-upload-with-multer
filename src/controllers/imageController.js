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
      originalName: req.file.originalname,
      localFilePath: req.file.path,
      size: req.file.size,
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const [images, total] = await Promise.all([
      imageService.getImagesPaginated(skip, limit),
      imageService.getTotalImageCount(),
    ]);

    return success(res, {
      data: images,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
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

export const updateDisplayName = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { displayName } = req.body;

    if (!displayName || typeof displayName !== 'string') {
      return badRequest(res, 'Display name is required');
    }

    const image = await imageService.updateImageDisplayName(id, displayName.trim());
    if (!image) {
      return notFound(res, 'Image not found!');
    }

    return success(res, image, 'Display name updated!');
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

export const batchDeleteImages = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest(res, 'No IDs provided');
    }

    const results = await imageService.batchDeleteImages(ids);

    return success(
      res,
      {
        total: ids.length,
        succeeded: results.succeeded,
        failed: results.failed,
      },
      `${results.succeeded.length} of ${ids.length} images deleted`
    );
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
