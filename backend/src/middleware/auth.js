import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mashroom_magic_secret_2024';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
  }
};

export const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
  });
};

export const requireSelfOrAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    const targetId = req.params.id;
    if (req.user?.role === 'admin' || req.user?.id === targetId) {
      return next();
    }
    return res.status(403).json({ message: 'You can only modify your own account.' });
  });
};
