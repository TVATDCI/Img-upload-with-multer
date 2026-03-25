import express from 'express';
import * as authController from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/getMe', protect, authController.getMe);

export default router;
