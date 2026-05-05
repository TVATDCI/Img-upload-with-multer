import mongoose from 'mongoose';
import * as albumService from '../services/albumService.js';
import { badRequest, created, error, notFound, success } from '../utils/responseHelper.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

export const createAlbum = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
      return badRequest(res, 'Album name must be between 1 and 100 characters');
    }

    if (description != null && (typeof description !== 'string' || description.trim().length > 500)) {
      return badRequest(res, 'Album description must be 500 characters or fewer');
    }

    const album = await albumService.createAlbum({
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() : undefined,
    });

    return created(res, album, 'Album created successfully!');
  } catch (err) {
    if (err?.code === 11000) {
      return error(res, 409, 'Album name already exists');
    }

    next(err);
  }
};

export const getAlbums = async (_req, res, next) => {
  try {
    const albums = await albumService.getAlbumsWithImageCounts();
    return success(res, albums, 'Albums retrieved successfully!');
  } catch (err) {
    next(err);
  }
};

export const updateAlbum = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { coverImage } = req.body;

    if (!isValidObjectId(id)) {
      return badRequest(res, 'Invalid album ID');
    }

    if (typeof coverImage !== 'string' || !isValidObjectId(coverImage)) {
      return badRequest(res, 'Invalid cover image ID');
    }

    const album = await albumService.updateAlbumCoverImage(id, coverImage);
    return success(res, album, 'Album updated successfully!');
  } catch (err) {
    if (err?.code === 'ALBUM_NOT_FOUND') {
      return notFound(res, 'Album not found!');
    }

    if (err?.code === 'IMAGE_NOT_FOUND') {
      return notFound(res, 'Image not found!');
    }

    if (err?.code === 'IMAGE_NOT_IN_ALBUM') {
      return badRequest(res, 'Cover image must belong to the album');
    }

    next(err);
  }
};

export const getAlbumImages = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return badRequest(res, 'Invalid album ID');
    }

    const album = await albumService.getAlbumById(id);
    if (!album) {
      return notFound(res, 'Album not found!');
    }

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(Number.parseInt(req.query.limit, 10) || 12, 1);
    const skip = (page - 1) * limit;

    const { images, total } = await albumService.getAlbumImages(id, skip, limit);

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
