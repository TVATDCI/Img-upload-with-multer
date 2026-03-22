import express from "express";
import { uploadImage, handleUpload, getImages, getImageById, deleteImage } from "../controllers/imageController.js";

const router = express.Router();

router.post("/uploadImage", uploadImage, handleUpload);
router.get("/images", getImages);
router.get("/images/:id", getImageById);
router.delete("/images/:id", deleteImage);

export default router;
