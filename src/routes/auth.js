import express from 'express';
import { login, getGoogleAuthUrl, handleGoogleCallback, getCurrentUser } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/google', getGoogleAuthUrl);
router.get('/google/callback', handleGoogleCallback);
router.get('/me', authenticate, getCurrentUser);

export default router;