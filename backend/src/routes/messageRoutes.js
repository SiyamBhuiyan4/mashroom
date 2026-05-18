import express from 'express';
import {
  sendMessage, getMessages, replyMessage, deleteMessage,
  sendSupportMessage, getSupportMessages, getUserSupportMessages,
  resolveSupportMessage, deleteSupportMessage, sendRecoverySupportMessage,
  sendGeneralSupportMessage,
  getUserThread, sendMessageToAdmin, adminGetThreads, adminGetThreadDetails,
  adminReplyToThread, adminResolveThread, getGroupMessages, sendGroupMessage,
  pinGroupMessage, unpinGroupMessage, deleteGroupMessage
} from '../controllers/messageController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// General messages (buyer contact)
router.post('/', requireAuth, sendMessage);
router.get('/', requireAuth, getMessages);
router.put('/:id/reply', requireAdmin, replyMessage);
router.delete('/:id', requireAdmin, deleteMessage);

// Support messages — require login to send, admin to manage
router.post('/support/general', sendGeneralSupportMessage);
router.post('/support', requireAuth, sendSupportMessage);
router.post('/support/recovery', sendRecoverySupportMessage);
router.get('/support/my', requireAuth, getUserSupportMessages);
router.get('/support', requireAdmin, getSupportMessages);
router.put('/support/:id/resolve', requireAdmin, resolveSupportMessage);
router.delete('/support/:id', requireAdmin, deleteSupportMessage);

// Unified Direct Messaging (User ↔ Admin)
router.get('/unified/thread', requireAuth, getUserThread);
router.post('/unified/send', requireAuth, sendMessageToAdmin);
router.get('/unified/admin/threads', requireAdmin, adminGetThreads);
router.get('/unified/admin/threads/:userId', requireAdmin, adminGetThreadDetails);
router.post('/unified/admin/threads/:userId/reply', requireAdmin, adminReplyToThread);
router.put('/unified/admin/threads/:userId/resolve', requireAdmin, adminResolveThread);

// Seller Community Group Chat (Sellers + Admin)
router.get('/group', requireAuth, getGroupMessages);
router.post('/group', requireAuth, sendGroupMessage);
router.put('/group/:id/pin', requireAdmin, pinGroupMessage);
router.put('/group/:id/unpin', requireAdmin, unpinGroupMessage);
router.delete('/group/:id', requireAdmin, deleteGroupMessage);

export default router;
