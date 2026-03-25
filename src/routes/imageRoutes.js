import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  uploadImage,
  handleUpload,
  getImages,
  getImageById,
  deleteImage,
  serveImage,
  batchDeleteImages,
  updateDisplayName,
} from '../controllers/imageController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many uploads. Please try again later.' },
});

// Public Routes
router.get('/images', getImages);
router.get('/images/:id', getImageById);
router.get('/images/:id/src', serveImage);

// Admin Only Routes - Batch routes MUST come before specific ID routes
router.delete('/images/batch', protect, restrictTo('admin'), batchDeleteImages);

router.post('/uploadImage', protect, restrictTo('admin'), uploadLimiter, uploadImage, handleUpload);
router.patch('/images/:id/displayName', protect, restrictTo('admin'), updateDisplayName);
router.delete('/images/:id', protect, restrictTo('admin'), deleteImage);

export default router;
