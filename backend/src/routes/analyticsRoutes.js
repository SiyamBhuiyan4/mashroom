import express from 'express';
import { getBuyerAnalytics, getFarmerAnalytics } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const requireSelfOrAdminBuyer = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user?.role === 'admin' || req.user?.id === req.params.buyerId) {
      return next();
    }
    return res.status(403).json({ message: 'Access denied. You can only view your own analytics.' });
  });
};

const requireSelfOrAdminFarmer = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user?.role === 'admin' || req.user?.id === req.params.farmerId) {
      return next();
    }
    return res.status(403).json({ message: 'Access denied. You can only view your own analytics.' });
  });
};

router.get('/buyer/:buyerId', requireSelfOrAdminBuyer, getBuyerAnalytics);
router.get('/farmer/:farmerId', requireSelfOrAdminFarmer, getFarmerAnalytics);

export default router;
