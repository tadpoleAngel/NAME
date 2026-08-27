import express from 'express';
import { logExtensionEvent } from '../controllers/extensionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/events', authenticate, logExtensionEvent);

export default router;