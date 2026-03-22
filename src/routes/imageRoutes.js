import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  uploadImage,
  handleUpload,
  getImages,
  getImageById,
  deleteImage,
  serveImage,
} from '../controllers/imageController.js';

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many uploads. Please try again later.' },
});

router.post('/uploadImage', uploadLimiter, uploadImage, handleUpload);
router.get('/images', getImages);
router.get('/images/:id', getImageById);
router.get('/images/:id/src', serveImage);
router.delete('/images/:id', deleteImage);

export default router;
