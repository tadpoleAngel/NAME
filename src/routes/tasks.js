import express from 'express';
import { createTask, updateTask } from '../controllers/taskController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/matters/:matterId/tasks', authenticate, requireRole('attorney', 'tenant_admin'), createTask);
router.patch('/tasks/:taskId', authenticate, updateTask);

export default router;