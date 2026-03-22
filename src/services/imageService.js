import Image from "../models/Image.js";
import { deleteFile } from "../utils/fileUtils.js";

export const createImage = async ({ filename, path, user_ip }) => {
  const image = new Image({
    filename,
    path,
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
  deleteFile(image.path);
  await Image.findByIdAndDelete(id);
  return image;
};
