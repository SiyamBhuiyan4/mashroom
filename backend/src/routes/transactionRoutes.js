import express from 'express';
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  resetTransactions,
  getUserTransactions,
  getMyTransactions
} from '../controllers/transactionController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// User endpoints
router.get('/my', requireAuth, getMyTransactions);

// Admin endpoints
router.get('/user/:userId', requireAdmin, getUserTransactions);
router.post('/', requireAdmin, addTransaction);
router.put('/:id', requireAdmin, updateTransaction);
router.delete('/:id', requireAdmin, deleteTransaction);
router.post('/reset/:userId', requireAdmin, resetTransactions);

export default router;
