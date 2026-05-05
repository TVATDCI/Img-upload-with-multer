import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  uploadImage,
  handleUpload,
  handleBatchUpload,
  getImages,
  getImageById,
  deleteImage,
  serveImage,
  serveVariant,
  getUploadProgress,
  batchDeleteImages,
  updateDisplayName,
  updateImageAlbum,
} from '../controllers/imageController.js';
import { upload } from '../middlewares/upload.js';
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
router.get('/images/:id/variant/:size', serveVariant);

// Admin Only Routes - Batch routes MUST come before specific ID routes
router.delete('/images/batch', protect, restrictTo('admin'), batchDeleteImages);

router.post('/uploadImage', protect, restrictTo('admin'), uploadLimiter, uploadImage, handleUpload);
router.post('/uploadImages', protect, restrictTo('admin'), uploadLimiter, upload.array('images', 10), handleBatchUpload);
router.get('/uploads/progress/:jobId', getUploadProgress);
router.patch('/images/:id/displayName', protect, restrictTo('admin'), updateDisplayName);
router.patch('/images/:id/album', protect, restrictTo('admin'), updateImageAlbum);
router.delete('/images/:id', protect, restrictTo('admin'), deleteImage);

export default router;
