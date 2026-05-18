import express from 'express';
import { sendAdminOTP, verifyAdminOTP } from '../controllers/otpController.js';
const router = express.Router();
router.post('/send', sendAdminOTP);
router.post('/verify', verifyAdminOTP);
export default router;
