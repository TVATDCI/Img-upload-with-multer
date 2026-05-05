import express from 'express';
import { createAlbum, getAlbumImages, getAlbums, updateAlbum } from '../controllers/albumController.js';
import { protect, restrictTo } from '../middlewares/auth.js';

const router = express.Router();

router.get('/albums', getAlbums);
router.get('/albums/:id/images', getAlbumImages);
router.post('/albums', protect, restrictTo('admin'), createAlbum);
router.patch('/albums/:id', protect, restrictTo('admin'), updateAlbum);

export default router;
