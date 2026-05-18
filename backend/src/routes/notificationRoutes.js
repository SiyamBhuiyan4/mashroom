import express from 'express';
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotification,
  clearAllNotifications
} from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All notification management endpoints require authentication
router.get('/', requireAuth, getMyNotifications);
router.put('/:id/read', requireAuth, markNotificationRead);
router.post('/mark-all-read', requireAuth, markAllNotificationsRead);
router.delete('/:id', requireAuth, clearNotification);
router.post('/clear-all', requireAuth, clearAllNotifications);

export default router;
