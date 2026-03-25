import express from 'express';
import imageRoutes from './imageRoutes.js';
import authRoutes from './authRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use(imageRoutes);

export default router;
