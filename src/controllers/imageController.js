import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import * as imageService from '../services/imageService.js';
import * as albumService from '../services/albumService.js';
import { upload } from '../middlewares/upload.js';
import { success, created, badRequest, notFound, error } from '../utils/responseHelper.js';
import { deleteFile } from '../utils/fileUtils.js';
import { VALID_VARIANT_SIZES } from '../services/imageProcessingService.js';
import * as batchUploadService from '../services/batchUploadService.js';
import * as uploadProgressService from '../services/uploadProgressService.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export const uploadImage = upload.single('image');

export const handleUpload = async (req, res, next) => {
  try {
    if (!req.file) {
      return badRequest(res, 'No file uploaded!');
    }

    const watermark = req.body.watermark;

    const image = await imageService.createImage({
      filename: req.file.filename,
      originalName: req.file.originalname,
      localFilePath: req.file.path,
      size: req.file.size,
      user_ip: req.ip,
      watermark,
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
    const includeVariants = req.query.includeVariants === 'true';

    const [images, total] = await Promise.all([
      imageService.getImagesPaginated(skip, limit),
      imageService.getTotalImageCount(),
    ]);

    const sanitizedImages = images.map((image) => {
      const obj = image.toObject ? image.toObject() : image;
      if (!includeVariants) {
        delete obj.variants;
      }
      return obj;
    });

    return success(res, {
      data: sanitizedImages,
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

export const updateImageAlbum = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return badRequest(res, 'Invalid image ID');
    }

    if (!Object.prototype.hasOwnProperty.call(req.body, 'albumId')) {
      return badRequest(res, 'albumId is required');
    }

    const normalizedAlbumId = req.body.albumId === null || req.body.albumId === '' ? null : req.body.albumId;

    if (normalizedAlbumId !== null && (typeof normalizedAlbumId !== 'string' || !isValidObjectId(normalizedAlbumId))) {
      return badRequest(res, 'Invalid album ID');
    }

    const image = await albumService.assignImageToAlbum(id, normalizedAlbumId);
    return success(res, image, 'Image album updated!');
  } catch (err) {
    if (err?.code === 'IMAGE_NOT_FOUND') {
      return notFound(res, 'Image not found!');
    }

    if (err?.code === 'ALBUM_NOT_FOUND') {
      return notFound(res, 'Album not found!');
    }

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

export const handleBatchUpload = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return badRequest(res, 'No files uploaded!');
    }

    if (req.files.length > 10) {
      return badRequest(res, 'Maximum 10 files per batch');
    }

    const watermark = req.body.watermark;

    const result = await batchUploadService.createBatchUpload(req.files, req.ip, watermark);

    if (result.status === 'rolled_back' || result.status === 'failed') {
      return error(res, 500, 'Batch upload failed and was rolled back');
    }

    return created(res, {
      jobId: result.jobId,
      status: result.status,
      createdCount: result.createdCount,
      images: result.images,
    }, 'Batch upload initiated');
  } catch (err) {
    // Clean up any remaining temp files
    if (req.files) {
      for (const file of req.files) {
        deleteFile(file.path);
      }
    }
    next(err);
  }
};

export const getUploadProgress = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = uploadProgressService.getJob(jobId);

    if (!job) {
      return notFound(res, 'Upload job not found');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const clientAdded = uploadProgressService.addClient(jobId, res);
    if (!clientAdded) {
      return notFound(res, 'Upload job not found');
    }

    req.on('close', () => {
      uploadProgressService.removeClient(jobId, res);
    });

    // If job is already completed, send completion event and close
    if (job.status === 'completed' || job.status === 'rolled_back') {
      setTimeout(() => {
        if (!res.writableEnded) {
          res.end();
        }
      }, 1000);
    }
  } catch (err) {
    next(err);
  }
};

export const serveVariant = async (req, res, next) => {
  try {
    const { id, size } = req.params;

    if (!VALID_VARIANT_SIZES.includes(size)) {
      return notFound(res, 'Unknown variant size');
    }

    const image = await imageService.getImageById(id);
    if (!image) {
      return notFound(res, 'Image not found!');
    }

    const variant = image.variants?.find((v) => v.size === size);
    if (!variant || !variant.path) {
      return notFound(res, 'Variant not found');
    }

    const variantPath = variant.path;

    if (variantPath.startsWith('/uploads/')) {
      const uploadDir = process.env.UPLOADS_FOLDER || './uploads';
      const fullPath = path.resolve(uploadDir, path.basename(variantPath));
      if (fs.existsSync(fullPath)) {
        return res.sendFile(fullPath);
      }
      return notFound(res, 'Variant file not found on disk');
    }

    if (variantPath.includes('cloudinary.com')) {
      try {
        const response = await globalThis.fetch(variantPath);
        if (!response.ok) throw new Error('Cloudinary fetch failed');
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/webp';
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=31536000');
        return res.send(Buffer.from(buffer));
      } catch {
        return error(res, 502, 'Failed to fetch variant from Cloudinary');
      }
    }

    return notFound(res, 'Unknown variant source');
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
      } catch {
        return error(res, 502, 'Failed to fetch image from Cloudinary');
      }
    }

    return notFound(res, 'Unknown image source');
  } catch (err) {
    next(err);
  }
};
