import express from 'express';
import { placeOrder, requestDeliveryCharge, confirmOrderAndDispatch, updateOrderStatus, getOrders, getBuyerOrders, getFarmerOrders } from '../controllers/orderController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const requireSelfOrAdminBuyer = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user?.role === 'admin' || req.user?.id === req.params.buyerId) {
      return next();
    }
    return res.status(403).json({ message: 'Access denied. You can only view your own orders.' });
  });
};

const requireSelfOrAdminFarmer = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user?.role === 'admin' || req.user?.id === req.params.farmerId) {
      return next();
    }
    return res.status(403).json({ message: 'Access denied. You can only view your own orders.' });
  });
};

router.post('/', requireAuth, placeOrder);
router.get('/', requireAdmin, getOrders);
router.get('/buyer/:buyerId', requireSelfOrAdminBuyer, getBuyerOrders);
router.get('/farmer/:farmerId', requireSelfOrAdminFarmer, getFarmerOrders);
router.post('/request-charge', requireAdmin, requestDeliveryCharge);
router.post('/confirm', requireAdmin, confirmOrderAndDispatch);
router.post('/update-status', requireAuth, updateOrderStatus);

export default router;
