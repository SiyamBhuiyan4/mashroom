import express from 'express';
import { 
  getSellerLocations, 
  updateSellerLocation, 
  getMarkers, 
  createMarker, 
  updateMarker, 
  deleteMarker 
} from '../controllers/mapController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public — everyone can see seller locations on the map
router.get('/sellers', getSellerLocations);

// Public — retrieve all multi-location markers
router.get('/markers', getMarkers);

// ADMIN ONLY — direct direct-assign/override single locations
router.post('/seller-location', requireAdmin, updateSellerLocation);

// ADMIN ONLY — CRUD multi-markers
router.post('/admin/markers', requireAdmin, createMarker);
router.put('/admin/markers/:id', requireAdmin, updateMarker);
router.delete('/admin/markers/:id', requireAdmin, deleteMarker);

export default router;
