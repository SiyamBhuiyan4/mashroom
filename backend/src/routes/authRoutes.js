import express from 'express';
import {
  registerUser, loginUser, verifyAdminPassword, requestPasswordRecovery,
  resetPassword, updateProfile, uploadToGallery, heartbeat, verifyPhoneForSupport
} from '../controllers/authController.js';
import upload from '../middleware/upload.js';
import { requireAuth, requireSelfOrAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/admin/verify-password', verifyAdminPassword);
router.post('/recover', requestPasswordRecovery);
router.post('/reset', resetPassword);
router.post('/support/check-phone', verifyPhoneForSupport);

// Heartbeat — requires auth (keeps lastActive fresh)
router.post('/heartbeat', requireAuth, heartbeat);

// Profile & gallery — require auth + self-or-admin check
router.put('/profile/:id', requireSelfOrAdmin, upload.single('image'), updateProfile);
router.post('/gallery/:id', requireSelfOrAdmin, upload.single('image'), uploadToGallery);

export default router;
