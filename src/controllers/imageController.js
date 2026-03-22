import * as imageService from '../services/imageService.js';
import { upload } from '../middlewares/upload.js';
import { success, created, badRequest, notFound } from '../utils/responseHelper.js';
import { deleteFile } from '../utils/fileUtils.js';

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
