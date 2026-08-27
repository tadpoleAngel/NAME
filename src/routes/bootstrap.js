import express from 'express';
import { getBootstrap } from '../controllers/bootstrapController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getBootstrap);

export default router;