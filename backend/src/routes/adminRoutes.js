import express from 'express';
import {
  getAnalytics, getPendingFarmers, approveFarmer, rejectFarmer,
  getAllUsers, getSellers, getBuyers, deleteUser,
  setDailyPrice, updatePrice, deletePrice, getProducts,
  getAdminSettings, updateAdminSettings, getNotifications,
  markNotificationRead, updateFarmerRanking, assignSellerLocation,
  updateUserTokens, resetUserPasswordDirectly, updateUserProfileDirectly,
  getAuditLogs, approveLocationRequest, updateOrderEarnings, resetSellerEarnings,
  lookupUserByPhone, getPublicSettings, settleOrder, updateUserAvatarDirectly
} from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Publicly readable pricing for Buyers
router.get('/products', getProducts);

// Gated admin-only operations
router.put('/user/:id/avatar', requireAdmin, upload.single('image'), updateUserAvatarDirectly);
router.get('/analytics', requireAdmin, getAnalytics);
router.get('/pending-farmers', requireAdmin, getPendingFarmers);
router.post('/approve-farmer/:id', requireAdmin, approveFarmer);
router.delete('/reject-farmer/:id', requireAdmin, rejectFarmer);

router.get('/users', requireAdmin, getAllUsers);
router.get('/user/lookup', requireAdmin, lookupUserByPhone);
router.get('/sellers', requireAdmin, getSellers);
router.get('/buyers', requireAdmin, getBuyers);
router.delete('/user/:id', requireAdmin, deleteUser);

router.post('/assign-seller-location', requireAdmin, assignSellerLocation);
router.post('/approve-location-request', requireAdmin, approveLocationRequest);

router.post('/products', requireAdmin, setDailyPrice);
router.put('/products/:id', requireAdmin, updatePrice);
router.delete('/products/:id', requireAdmin, deletePrice);

router.get('/settings', requireAdmin, getAdminSettings);
router.put('/settings', requireAdmin, updateAdminSettings);

router.post('/update-farmer-ranking', requireAdmin, updateFarmerRanking);

router.get('/notifications', requireAdmin, getNotifications);
router.put('/notifications/:id', requireAdmin, markNotificationRead);

// Direct Overrides & Token Management
router.put('/user/:id/tokens', requireAdmin, updateUserTokens);
router.put('/user/:id/password', requireAdmin, resetUserPasswordDirectly);
router.put('/user/:id/profile', requireAdmin, updateUserProfileDirectly);
router.get('/audit-logs', requireAdmin, getAuditLogs);
router.put('/orders/:id/earnings', requireAdmin, updateOrderEarnings);
router.post('/orders/settle', requireAdmin, settleOrder);
router.post('/user/:id/reset-earnings', requireAdmin, resetSellerEarnings);

// Publicly readable settings
router.get('/public-settings', getPublicSettings);

export default router;
