import { db } from '../config/fileDB.js';
import bcrypt from 'bcryptjs';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const isOnline = (lastActive) => {
  if (!lastActive) return false;
  return (Date.now() - new Date(lastActive).getTime()) < ONLINE_THRESHOLD_MS;
};

const sortByOnlineStatus = (users) => {
  return users.sort((a, b) => {
    const aOnline = isOnline(a.lastActive);
    const bOnline = isOnline(b.lastActive);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    // Both same online status — sort by lastActive desc
    const aTime = a.lastActive ? new Date(a.lastActive).getTime() : 0;
    const bTime = b.lastActive ? new Date(b.lastActive).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    // Fallback: lexicographical by name
    return (a.name || '').localeCompare(b.name || '');
  });
};

// --- Analytics ---
export const getAnalytics = (req, res) => {
  try {
    const totalBuyers = db.count('users', { role: 'buyer' });
    const totalSellers = db.count('users', { role: 'farmer', isApproved: true });
    const pendingApprovals = db.count('users', { role: 'farmer', isApproved: false });
    const totalOrders = db.count('orders');
    const allOrders = db.findAll('orders');
    const revenue = allOrders.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + (o.totalCost || 0) + (o.deliveryCharge || 0), 0);
    res.json({ totalBuyers, totalSellers, pendingApprovals, totalOrders, revenue });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- Farmer Management ---
export const getPendingFarmers = (req, res) => {
  try {
    const farmers = db.find('users', { role: 'farmer', isApproved: false });
    res.json(farmers.map(f => ({ _id: f._id, name: f.name, email: f.email, phone: f.phone, farmName: f.farmName, district: f.district, mushroomType: f.mushroomType, capacity: f.capacity, createdAt: f.createdAt })));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const approveFarmer = (req, res) => {
  try {
    const user = db.findById('users', req.params.id);
    if (!user || user.role !== 'farmer') return res.status(404).json({ message: 'Farmer not found' });
    const sellerCode = `MM-SELLER-${1000 + db.count('users', { role: 'farmer', isApproved: true })}`;
    const updated = db.updateById('users', req.params.id, { isApproved: true, sellerCode, enrolledInGroupChat: true });
    db.create('notifications', { type: 'approval', title: 'Account Approved', message: `Your seller account has been approved! Your code is ${sellerCode}`, userId: req.params.id, read: false });
    res.json({ message: 'Farmer approved', sellerCode, user: updated });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const rejectFarmer = (req, res) => {
  try {
    const user = db.findById('users', req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    db.deleteById('users', req.params.id);
    res.json({ message: 'Application rejected and removed.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getAllUsers = (req, res) => {
  try {
    const users = db.findAll('users').map(u => ({ ...u, password: undefined }));
    res.json(users);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const lookupUserByPhone = (req, res) => {
  const { phone } = req.query;
  try {
    if (!phone) return res.status(400).json({ message: 'Phone number is required.' });
    
    // Normalize phone number (strip non-digits, take last 11)
    const raw = phone.toString().replace(/\D/g, '');
    const searchMatch = raw.length >= 11 ? raw.slice(-11) : raw;
    
    if (!searchMatch) return res.status(400).json({ message: 'Invalid phone format.' });

    const user = db.findAll('users').find(u => {
      if (!u.phone) return false;
      const p = u.phone.toString().replace(/\D/g, '');
      return (p.length >= 11 ? p.slice(-11) : p) === searchMatch;
    });

    if (!user) return res.status(404).json({ message: 'No registered account found with this phone number.' });
    
    const { password, ...safe } = user;
    res.json(safe);
  } catch (error) { 
    res.status(500).json({ message: error.message }); 
  }
};

// --- Sellers (sorted: online first → recent → alpha) ---
export const getSellers = (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    let sellers = db.find('users', { role: 'farmer', isApproved: true }).map(u => {
      const { password, ...safe } = u;
      return { ...safe, online: isOnline(u.lastActive) };
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      sellers = sellers.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.farmName?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.sellerCode?.toLowerCase().includes(q)
      );
    }

    sellers = sortByOnlineStatus(sellers);

    const total = sellers.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = sellers.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({ sellers: paginated, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- Buyers (sorted: online first → recent → alpha) ---
export const getBuyers = (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    let buyers = db.find('users', { role: 'buyer' }).map(u => {
      const { password, ...safe } = u;
      const userOrders = db.findAll('orders').filter(o => o.buyerId === u._id);
      return { ...safe, online: isOnline(u.lastActive), totalOrders: userOrders.length };
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      buyers = buyers.filter(b =>
        b.name?.toLowerCase().includes(q) ||
        b.phone?.includes(q) ||
        b.email?.toLowerCase().includes(q)
      );
    }

    buyers = sortByOnlineStatus(buyers);

    const total = buyers.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = buyers.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({ buyers: paginated, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteUser = (req, res) => {
  try {
    const user = db.findById('users', req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    
    // Create Audit Log with detailed snapshot before deletion
    db.create('auditlogs', {
      type: 'delete_user_by_admin',
      adminId: req.user?.id || 'admin',
      targetUserId: req.params.id,
      targetUserPhone: user.phone,
      targetUserName: user.name,
      before: { ...user, password: '[REDACTED]' },
      after: null,
      timestamp: new Date().toISOString()
    });

    db.deleteById('users', req.params.id);
    res.json({ message: 'User deleted.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- Seller Location Assignment (Admin Only) ---
export const assignSellerLocation = (req, res) => {
  const { farmerId, lat, lng } = req.body;
  try {
    if (!farmerId || lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'farmerId, lat, and lng are required.' });
    }
    const seller = db.findById('users', farmerId);
    if (!seller || seller.role !== 'farmer') {
      return res.status(404).json({ message: 'Seller not found.' });
    }
    const updated = db.updateById('users', farmerId, {
      locationLat: parseFloat(lat),
      locationLng: parseFloat(lng),
      locationSet: true
    });
    res.json({ message: 'Seller location assigned by admin.', lat: updated.locationLat, lng: updated.locationLng });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- Products / Pricing ---
export const setDailyPrice = (req, res) => {
  const { name, price } = req.body;
  try {
    const product = db.create('products', { name, price: parseFloat(price), setAt: new Date().toISOString() });
    db.create('notifications', { type: 'price_update', title: 'Price Updated', message: `${name} price updated to ৳${price}/kg`, targetRole: 'all', read: false });
    res.status(201).json(product);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updatePrice = (req, res) => {
  const { price } = req.body;
  try {
    const updated = db.updateById('products', req.params.id, { price: parseFloat(price), setAt: new Date().toISOString() });
    if (!updated) return res.status(404).json({ message: 'Product not found' });
    res.json(updated);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deletePrice = (req, res) => {
  try {
    db.deleteById('products', req.params.id);
    res.json({ message: 'Price entry deleted.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getProducts = (req, res) => {
  try { res.json(db.findAll('products')); }
  catch (error) { res.status(500).json({ message: error.message }); }
};

// --- Admin Settings ---
export const getAdminSettings = (req, res) => {
  try {
    const settings = db.findOne('adminsettings', { key: 'config' });
    if (!settings) return res.json({ adminPassword: 'admin101', otpEmail: 'siyambhuiyan444@gmail.com', otpEnabled: true, noticeEnabled: false, noticeText: '' });
    const { adminPassword, ...safe } = settings;
    res.json(safe);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getPublicSettings = (req, res) => {
  try {
    const settings = db.findOne('adminsettings', { key: 'config' }) || {};
    res.json({
      noticeEnabled: !!settings.noticeEnabled,
      noticeText: settings.noticeText || ''
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateAdminSettings = (req, res) => {
  const { otpEmail, otpEnabled, newPassword, noticeEnabled, noticeText } = req.body;
  try {
    let settings = db.findOne('adminsettings', { key: 'config' });
    const updates = {};
    if (otpEmail !== undefined) updates.otpEmail = otpEmail;
    if (typeof otpEnabled !== 'undefined') updates.otpEnabled = otpEnabled;
    if (newPassword) updates.adminPassword = newPassword;
    if (typeof noticeEnabled !== 'undefined') updates.noticeEnabled = noticeEnabled;
    if (noticeText !== undefined) updates.noticeText = noticeText;

    if (!settings) {
      db.create('adminsettings', { key: 'config', adminPassword: newPassword || 'admin101', otpEmail: otpEmail || 'siyambhuiyan444@gmail.com', otpEnabled: true, noticeEnabled: false, noticeText: '', ...updates });
    } else {
      db.updateById('adminsettings', settings._id, updates);
    }
    res.json({ message: 'Settings updated.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- Notifications ---
export const getNotifications = (req, res) => {
  try {
    const notifs = db.findAll('notifications').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(notifs);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const markNotificationRead = (req, res) => {
  try {
    db.updateById('notifications', req.params.id, { read: true });
    res.json({ message: 'Marked as read.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateFarmerRanking = (req, res) => {
  const { farmerId, rating } = req.body;
  try {
    const user = db.findById('users', farmerId);
    if (!user || user.role !== 'farmer') return res.status(404).json({ message: 'Farmer not found' });
    const val = Math.min(9, Math.max(1, parseInt(rating)));
    db.updateById('users', farmerId, { rating: val });
    res.json({ message: 'Farmer ranking updated', rating: val });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateUserTokens = (req, res) => {
  const { id } = req.params;
  const { action, amount, tokens } = req.body;
  try {
    const user = db.findById('users', id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    let newTokens = typeof user.supportTokens === 'number' ? user.supportTokens : 5;
    if (action === 'grant') {
      newTokens += Number(amount || 0);
    } else if (action === 'reduce') {
      newTokens = Math.max(0, newTokens - Number(amount || 0));
    } else if (action === 'reset') {
      newTokens = 5;
    } else if (typeof tokens === 'number') {
      newTokens = tokens;
    }

    const updated = db.updateById('users', id, { supportTokens: newTokens });
    res.json({ message: 'Tokens updated successfully.', supportTokens: updated.supportTokens });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetUserPasswordDirectly = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  try {
    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({ message: 'New password is required.' });
    }
    const user = db.findById('users', id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword.trim(), salt);

    db.updateById('users', id, { password: hashedPassword });

    // Create Audit Log
    db.create('auditlogs', {
      type: 'password_reset_by_admin',
      adminId: req.user?.id || 'admin',
      targetUserId: user._id,
      targetUserPhone: user.phone,
      targetUserName: user.name,
      targetUserRole: user.role,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'User password updated directly by admin.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserProfileDirectly = (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  try {
    const user = db.findById('users', id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const updates = {};
    const allowed = [
      'name', 'email', 'phone', 'bio', 'farmName', 'district',
      'mushroomType', 'capacity', 'isApproved', 'rating', 'supportTokens',
      'nationalId', 'online', 'manualRevenueAdjustment', 'sellerCode'
    ];
    allowed.forEach(k => {
      if (fields[k] !== undefined) {
        if (k === 'capacity' || k === 'rating' || k === 'supportTokens' || k === 'manualRevenueAdjustment') {
          updates[k] = fields[k] !== null && fields[k] !== '' ? Number(fields[k]) : null;
        } else {
          updates[k] = fields[k];
        }
      }
    });

    const updated = db.updateById('users', id, updates);

    // Create Audit Log with detailed before/after snapshots
    db.create('auditlogs', {
      type: 'profile_override_by_admin',
      adminId: req.user?.id || 'admin',
      targetUserId: user._id,
      targetUserPhone: user.phone,
      targetUserName: user.name,
      before: { ...user, password: '[REDACTED]' },
      after: { ...updated, password: '[REDACTED]' },
      updates: Object.keys(updates),
      timestamp: new Date().toISOString()
    });

    const { password, ...safeUser } = updated;
    res.json({ message: 'Profile updated directly by admin.', user: safeUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAuditLogs = (req, res) => {
  try {
    const logs = db.findAll('auditlogs').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveLocationRequest = (req, res) => {
  const { supportMsgId } = req.body;
  try {
    if (!supportMsgId) {
      return res.status(400).json({ message: 'supportMsgId is required.' });
    }
    const msg = db.findById('supportmessages', supportMsgId);
    if (!msg) {
      return res.status(404).json({ message: 'Support message not found.' });
    }
    if (msg.category !== 'location_update' || msg.requestLat === undefined || msg.requestLng === undefined) {
      return res.status(400).json({ message: 'This support message is not a valid location update request.' });
    }

    const sellerId = msg.userId;
    const seller = db.findById('users', sellerId);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found.' });
    }

    // 1. Update seller profile
    db.updateById('users', sellerId, {
      locationLat: msg.requestLat,
      locationLng: msg.requestLng,
      locationSet: true
    });

    // 2. Plot/update main_farm marker in markers
    const existingMarker = db.findOne('markers', { sellerId, type: 'main_farm' });
    if (existingMarker) {
      db.updateById('markers', existingMarker._id, {
        lat: msg.requestLat,
        lng: msg.requestLng,
        label: `${seller.farmName || seller.name}'s Main Farm`
      });
    } else {
      db.create('markers', {
        sellerId,
        lat: msg.requestLat,
        lng: msg.requestLng,
        type: 'main_farm',
        label: `${seller.farmName || seller.name}'s Main Farm`,
        notes: 'Created via admin approval of location request ticket'
      });
    }

    // 3. Resolve support message
    const updatedMsg = db.updateById('supportmessages', supportMsgId, {
      status: 'resolved',
      adminNote: 'Location request approved and plotted on map.'
    });

    // 4. Create Notification
    db.create('notifications', {
      type: 'location_approved',
      title: '📍 Location Request Approved',
      message: 'Your farm coordinates have been verified and plotted on the official map!',
      userId: sellerId,
      read: false
    });

    // 5. Create Audit Log
    db.create('auditlogs', {
      type: 'approve_location_request',
      adminId: req.user?.id || 'admin',
      targetUserId: sellerId,
      targetUserPhone: seller.phone,
      details: `Approved coordinates (${msg.requestLat}, ${msg.requestLng}) via ticket ${supportMsgId}`,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Location request approved and plotted.', supportMessage: updatedMsg });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderEarnings = (req, res) => {
  const { id } = req.params;
  const { approvedEarnings, isEarningApproved } = req.body;
  try {
    const order = db.findById('orders', id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const before = {
      approvedEarnings: order.approvedEarnings !== undefined ? order.approvedEarnings : null,
      isEarningApproved: order.isEarningApproved !== undefined ? order.isEarningApproved : false
    };

    const updates = {
      approvedEarnings: parseFloat(approvedEarnings || 0),
      isEarningApproved: !!isEarningApproved
    };

    const updated = db.updateById('orders', id, updates);

    // Create Audit Log
    db.create('auditlogs', {
      type: 'order_earnings_override',
      adminId: req.user?.id || 'admin',
      targetOrderId: id,
      targetUserId: order.farmerId,
      before,
      after: updates,
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Order earnings overridden successfully.', order: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetSellerEarnings = (req, res) => {
  const { id } = req.params;
  try {
    const seller = db.findById('users', id);
    if (!seller) return res.status(404).json({ message: 'Seller not found.' });

    const before = {
      manualRevenueAdjustment: seller.manualRevenueAdjustment !== undefined ? seller.manualRevenueAdjustment : 0,
      totalSales: seller.totalSales !== undefined ? seller.totalSales : 0
    };

    // Update seller profile
    const updatedSeller = db.updateById('users', id, {
      manualRevenueAdjustment: 0,
      totalSales: 0
    });

    // Reset all completed orders for this seller to 0 earnings and unapproved
    const sellerOrders = db.find('orders', { farmerId: id });
    sellerOrders.forEach(o => {
      if (o.status === 'Delivered') {
        db.updateById('orders', o._id, {
          approvedEarnings: 0,
          isEarningApproved: false
        });
      }
    });

    // Create Audit Log
    db.create('auditlogs', {
      type: 'reset_seller_earnings',
      adminId: req.user?.id || 'admin',
      targetUserId: id,
      targetUserPhone: seller.phone,
      before,
      after: {
        manualRevenueAdjustment: 0,
        totalSales: 0
      },
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Seller earnings reset to zero successfully.', seller: updatedSeller });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

