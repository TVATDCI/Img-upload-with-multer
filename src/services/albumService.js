import Album from '../models/Album.js';
import Image from '../models/Image.js';

const createAlbumError = (code, message) => {
  const err = new Error(message);
  err.code = code;
  return err;
};

const getMostRecentAlbumImage = async (albumId, excludedImageId = null) => {
  const query = { album: albumId };

  if (excludedImageId) {
    query._id = { $ne: excludedImageId };
  }

  return Image.findOne(query).sort({ uploadDate: -1, _id: -1 }).select('_id');
};

export const createAlbum = async ({ name, description }) => {
  return Album.create({ name, description });
};

export const getAlbumById = async (albumId) => {
  return Album.findById(albumId);
};

export const getAlbumsWithImageCounts = async () => {
  return Album.listWithImageCounts();
};

export const getAlbumImages = async (albumId, skip, limit) => {
  const [images, total] = await Promise.all([
    Image.find({ album: albumId }).sort({ uploadDate: -1, _id: -1 }).skip(skip).limit(limit),
    Image.countDocuments({ album: albumId }),
  ]);

  return { images, total };
};

export const refreshAlbumCoverImage = async (albumId, removedImageId = null) => {
  const album = await Album.findById(albumId).select('coverImage');

  if (!album) {
    return null;
  }

  if (removedImageId && album.coverImage && !album.coverImage.equals(removedImageId)) {
    return album;
  }

  const fallbackImage = await getMostRecentAlbumImage(albumId, removedImageId);
  album.coverImage = fallbackImage?._id ?? null;
  await album.save();

  return album;
};

export const assignImageToAlbum = async (imageId, albumId) => {
  const image = await Image.findById(imageId);

  if (!image) {
    throw createAlbumError('IMAGE_NOT_FOUND', 'Image not found!');
  }

  let targetAlbum = null;
  if (albumId) {
    targetAlbum = await Album.findById(albumId).select('_id coverImage');
    if (!targetAlbum) {
      throw createAlbumError('ALBUM_NOT_FOUND', 'Album not found!');
    }
  }

  const previousAlbumId = image.album ? image.album.toString() : null;
  const nextAlbumId = targetAlbum ? targetAlbum._id.toString() : null;

  image.album = targetAlbum?._id ?? null;
  await image.save();

  if (previousAlbumId && previousAlbumId !== nextAlbumId) {
    await refreshAlbumCoverImage(previousAlbumId, image._id);
  }

  if (nextAlbumId) {
    const albumToUpdate = previousAlbumId === nextAlbumId ? targetAlbum : await Album.findById(nextAlbumId).select('coverImage');

    if (albumToUpdate && !albumToUpdate.coverImage) {
      albumToUpdate.coverImage = image._id;
      await albumToUpdate.save();
    }
  }

  return image;
};

export const updateAlbumCoverImage = async (albumId, imageId) => {
  const album = await Album.findById(albumId);

  if (!album) {
    throw createAlbumError('ALBUM_NOT_FOUND', 'Album not found!');
  }

  const image = await Image.findById(imageId).select('album');

  if (!image) {
    throw createAlbumError('IMAGE_NOT_FOUND', 'Image not found!');
  }

  if (!image.album || !image.album.equals(album._id)) {
    throw createAlbumError('IMAGE_NOT_IN_ALBUM', 'Cover image must belong to the album');
  }

  album.coverImage = image._id;
  await album.save();

  return album;
};

export const syncAlbumCoverAfterImageRemoval = async (image) => {
  if (!image?.album) {
    return null;
  }

  return refreshAlbumCoverImage(image.album, image._id);
};
