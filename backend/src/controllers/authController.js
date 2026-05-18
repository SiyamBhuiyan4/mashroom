import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../config/fileDB.js';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'mashroom-magic/avatars', resource_type: 'image' },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET || 'mashroom_magic_secret_2024', { expiresIn: '30d' });

const generateSellerCode = () => {
  const existing = db.findAll('users').filter(u => u.sellerCode);
  const nextNum = 1000 + existing.length;
  return `MM-SELLER-${nextNum}`;
};

export const registerUser = async (req, res) => {
  const { name, email, phone, password, role,
    farmName, district, mushroomType, capacity, nationalId } = req.body;

  try {
    if (db.findOne('users', { phone })) {
      return res.status(400).json({ message: 'This phone number is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userRole = role || 'buyer';
    const isApproved = userRole !== 'farmer';

    const userData = {
      name, email, phone,
      password: hashedPassword,
      role: userRole,
      isApproved,
      verificationCode: null,
      avatar: null,
      bio: null,
      lastActive: new Date().toISOString(),
      // Seller-specific
      farmName: farmName || null,
      district: district || null,
      mushroomType: mushroomType || null,
      capacity: capacity || null,
      nationalId: nationalId || null,
      sellerCode: null,
      locationLat: null,
      locationLng: null,
      locationSet: false,
      rating: 5,
      gallery: [],
      totalSales: 0,
      successfulDeliveries: 0,
      supportTokens: 5
    };

    const user = db.create('users', userData);

    if (userRole === 'farmer') {
      db.create('notifications', {
        type: 'farmer_application',
        title: 'New Farmer Application',
        message: `${name} has applied for a seller account (${farmName || 'N/A'}, ${district || 'N/A'})`,
        read: false,
        targetRole: 'admin'
      });
      return res.status(201).json({ message: 'Application submitted. Awaiting admin approval.', pendingApproval: true });
    }

    res.status(201).json({
      _id: user._id, name: user.name, email: user.email, phone: user.phone,
      role: user.role, isApproved: user.isApproved,
      token: generateToken(user._id, user.role)
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  const { phone, password } = req.body;
  try {
    const user = db.findOne('users', { phone });
    if (!user) return res.status(401).json({ message: 'Invalid phone number or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid phone number or password.' });

    if (!user.isApproved) return res.status(403).json({ message: 'Your account is pending admin approval.' });

    // Update lastActive on login
    db.updateById('users', user._id, { lastActive: new Date().toISOString() });

    res.json({
      _id: user._id, name: user.name, email: user.email, phone: user.phone,
      role: user.role, sellerCode: user.sellerCode || null,
      avatar: user.avatar || null, bio: user.bio || null, gallery: user.gallery || [],
      token: generateToken(user._id, user.role)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Heartbeat — called by frontend every 60s to keep lastActive fresh
export const heartbeat = (req, res) => {
  try {
    const userId = req.user?.id;
    if (userId && userId !== 'admin') {
      db.updateById('users', userId, { lastActive: new Date().toISOString() });
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
};

export const updateProfile = async (req, res) => {
  const { name, email, phone, bio, farmName, district, mushroomType, capacity, currentPassword } = req.body;
  const userId = req.params.id;

  try {
    const user = db.findById('users', userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // ---- PASSWORD VERIFICATION GATE ----
    // Admin bypasses this check when editing on behalf of a user
    if (req.user?.role !== 'admin') {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to save changes.' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(403).json({ message: 'Incorrect password. Changes not saved.' });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone) {
      const existing = db.findOne('users', { phone });
      if (existing && existing._id !== userId) return res.status(400).json({ message: 'Phone number already in use' });
      updates.phone = phone;
    }
    if (bio !== undefined) updates.bio = bio;

    // Seller-only fields — only update if the user is a farmer
    if (user.role === 'farmer') {
      if (farmName) updates.farmName = farmName;
      if (district) updates.district = district;
      if (mushroomType) updates.mushroomType = mushroomType;
      if (capacity) updates.capacity = capacity;
    }

    // Handle Cloudinary Avatar Upload
    if (req.file) {
      try {
        const imageUrl = await uploadToCloudinary(req.file.buffer);
        updates.avatar = imageUrl;
      } catch (uploadErr) {
        console.error('Cloudinary upload error:', uploadErr);
        return res.status(500).json({ message: 'Failed to upload profile picture.' });
      }
    }

    const updated = db.updateById('users', userId, updates);
    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const uploadToGallery = async (req, res) => {
  const userId = req.params.id;
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });

    const user = db.findById('users', userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const imageUrl = await uploadToCloudinary(req.file.buffer);
    
    const gallery = user.gallery || [];
    gallery.push(imageUrl);
    db.updateById('users', userId, { gallery });
    res.json({ message: 'Image added to gallery', gallery });
  } catch (error) {
    console.error('Gallery upload error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const verifyAdminPassword = (req, res) => {
  const { password } = req.body;
  const settings = db.findOne('adminsettings', { key: 'config' });
  const adminPass = settings?.adminPassword || 'admin101';

  console.log(`[ADMIN LOGIN] Attempt with: "${password}" | Expected: "${adminPass}"`);

  if (password === adminPass) {
    const token = generateToken('admin', 'admin');
    return res.json({ success: true, token, role: 'admin', name: 'Admin', _id: 'admin' });
  }
  res.status(401).json({ success: false, message: 'Incorrect admin password.' });
};

export const requestPasswordRecovery = async (req, res) => {
  const { phone } = req.body;
  try {
    const user = db.findOne('users', { phone });
    if (!user) return res.status(404).json({ message: 'No account found with this phone number.' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    db.updateById('users', user._id, { verificationCode: code });
    console.log(`\n[RECOVERY] Code for ${phone}: ${code}\n`);
    res.json({ message: 'Contact admin at siyambhuiyan444@gmail.com with your phone number to receive your code.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { phone, code, newPassword } = req.body;
  try {
    const user = db.findOne('users', { phone });
    if (!user || user.verificationCode !== code) return res.status(400).json({ message: 'Invalid code.' });
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    db.updateById('users', user._id, { password: hashed, verificationCode: null });
    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyPhoneForSupport = (req, res) => {
  const { phone } = req.body;
  try {
    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }
    const user = db.findOne('users', { phone: phone.trim() });
    if (!user) {
      return res.status(404).json({ message: 'No registered account found with this phone number.' });
    }
    res.json({
      success: true,
      name: user.name,
      role: user.role,
      supportTokens: typeof user.supportTokens === 'number' ? user.supportTokens : 5
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
