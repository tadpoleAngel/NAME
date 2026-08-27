import express from 'express';
import { createMessage } from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/matters/:matterId/messages', authenticate, createMessage);

export default router;