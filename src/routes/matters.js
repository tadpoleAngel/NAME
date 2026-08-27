import express from 'express';
import { getMatter, createMatter } from '../controllers/matterController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, requireRole('attorney', 'tenant_admin'), createMatter);
router.get('/:id', authenticate, getMatter);

export default router;