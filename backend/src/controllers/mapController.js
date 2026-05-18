import { db } from '../config/fileDB.js';

// Auto-seed markers from users collection if markers collection is empty
const checkAndSeedMarkers = () => {
  try {
    const existing = db.findAll('markers');
    if (!existing || existing.length === 0) {
      const farmers = db.find('users', { role: 'farmer', locationSet: true });
      farmers.forEach(f => {
        if (f.locationLat && f.locationLng) {
          db.create('markers', {
            sellerId: f._id,
            lat: parseFloat(f.locationLat),
            lng: parseFloat(f.locationLng),
            type: 'main_farm',
            label: `${f.farmName || f.name}'s Main Farm`,
            notes: 'Auto-seeded from previous location coordinates'
          });
        }
      });
    }
  } catch (err) {
    console.error('Error auto-seeding markers:', err);
  }
};

export const getSellerLocations = (req, res) => {
  try {
    const sellers = db.find('users', { role: 'farmer', isApproved: true, locationSet: true });
    const locations = sellers.map(s => ({
      _id: s._id, name: s.name, farmName: s.farmName, district: s.district,
      mushroomType: s.mushroomType, sellerCode: s.sellerCode,
      lat: s.locationLat, lng: s.locationLng,
      rating: s.rating || 5,
      gallery: s.gallery || [],
      totalSales: s.totalSales || 0,
      successfulDeliveries: s.successfulDeliveries || 0,
      bio: s.bio || ''
    }));
    res.json(locations);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// Keeps compatibility and auto-syncs seller main_farm marker
export const updateSellerLocation = (req, res) => {
  const { farmerId, lat, lng } = req.body;
  try {
    if (!farmerId || lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'farmerId, lat, and lng are required.' });
    }
    const seller = db.findById('users', farmerId);
    if (!seller || seller.role !== 'farmer') {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    const updated = db.updateById('users', farmerId, {
      locationLat: parseFloat(lat),
      locationLng: parseFloat(lng),
      locationSet: true
    });

    // Check if main_farm marker exists, otherwise create it
    const existingMarker = db.findOne('markers', { sellerId: farmerId, type: 'main_farm' });
    if (existingMarker) {
      db.updateById('markers', existingMarker._id, {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      });
    } else {
      db.create('markers', {
        sellerId: farmerId,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        type: 'main_farm',
        label: `${seller.farmName || seller.name}'s Main Farm`,
        notes: 'Synchronized from direct user profile coordinate setup'
      });
    }

    res.json({
      message: 'Seller location updated by admin.',
      seller: { _id: updated._id, lat: updated.locationLat, lng: updated.locationLng }
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ---- MARKERS MULTI-LOCATION API ----

export const getMarkers = (req, res) => {
  try {
    checkAndSeedMarkers();
    const markers = db.findAll('markers') || [];
    const enriched = markers.map(m => {
      let seller = null;
      if (m.sellerId) {
        seller = db.findById('users', m.sellerId);
      }
      return {
        ...m,
        seller: seller ? {
          _id: seller._id,
          name: seller.name,
          farmName: seller.farmName,
          district: seller.district,
          mushroomType: seller.mushroomType,
          rating: seller.rating || 5,
          gallery: seller.gallery || [],
          bio: seller.bio || '',
          phone: seller.phone
        } : null
      };
    });
    res.json(enriched);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createMarker = (req, res) => {
  const { sellerId, lat, lng, type, label, notes } = req.body;
  try {
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat and lng are required.' });
    }
    const marker = db.create('markers', {
      sellerId: sellerId || null,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      type: type || 'main_farm',
      label: label || 'New Marker Location',
      notes: notes || ''
    });

    // If setting a seller's main farm, sync coordinates back to user profile
    if (sellerId && type === 'main_farm') {
      db.updateById('users', sellerId, {
        locationLat: parseFloat(lat),
        locationLng: parseFloat(lng),
        locationSet: true
      });
    }

    // Log admin override action
    db.create('auditlogs', {
      action: 'create_marker',
      performedBy: req.user?.id || 'admin',
      details: `Created marker ${marker._id} at (${lat}, ${lng}) of type ${type} assigned to seller ${sellerId || 'none'}`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(marker);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateMarker = (req, res) => {
  const { id } = req.params;
  const { sellerId, lat, lng, type, label, notes } = req.body;
  try {
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat and lng are required.' });
    }
    const updated = db.updateById('markers', id, {
      sellerId: sellerId || null,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      type: type || 'main_farm',
      label: label || 'Updated Marker Location',
      notes: notes || ''
    });
    if (!updated) return res.status(404).json({ message: 'Marker not found' });

    // Sync back to seller profile if it is main_farm
    if (sellerId && type === 'main_farm') {
      db.updateById('users', sellerId, {
        locationLat: parseFloat(lat),
        locationLng: parseFloat(lng),
        locationSet: true
      });
    }

    // Log admin override action
    db.create('auditlogs', {
      action: 'update_marker',
      performedBy: req.user?.id || 'admin',
      details: `Updated marker ${id} to (${lat}, ${lng}) of type ${type} assigned to seller ${sellerId || 'none'}`,
      timestamp: new Date().toISOString()
    });

    res.json(updated);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteMarker = (req, res) => {
  const { id } = req.params;
  try {
    const deleted = db.deleteById('markers', id);
    if (!deleted) return res.status(404).json({ message: 'Marker not found' });

    // Log admin override action
    db.create('auditlogs', {
      action: 'delete_marker',
      performedBy: req.user?.id || 'admin',
      details: `Deleted marker ${id}`,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Marker deleted successfully.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
