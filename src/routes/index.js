import express from 'express';
import imageRoutes from './imageRoutes.js';
import authRoutes from './authRoutes.js';
import albumRoutes from './albumRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use(imageRoutes);
router.use(albumRoutes);

export default router;
