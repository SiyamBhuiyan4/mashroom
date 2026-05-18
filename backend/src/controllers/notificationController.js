import { db } from '../config/fileDB.js';

// Retrieve notifications for the currently logged-in user
export const getMyNotifications = (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const allNotifs = db.findAll('notifications') || [];

    // Filter notifications relevant to this user
    const filtered = allNotifs.filter(n => {
      // 1. Skip if explicitly cleared by this user
      if (n.clearedBy && n.clearedBy.includes(userId)) return false;

      // 2. If it's a specific individual notification
      if (n.userId) return n.userId === userId;

      // 3. If it's role-targeted
      if (n.targetRole) {
        if (n.targetRole === 'all') return true;
        if (n.targetRole === role) return true;
      }
      return false;
    });

    // Sort by newest first
    const sorted = filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Map notification list to show appropriate read status for this user
    const mapped = sorted.map(n => {
      let isRead = false;
      if (n.userId) {
        isRead = !!n.read;
      } else {
        isRead = n.readBy ? n.readBy.includes(userId) : !!n.read;
      }
      return {
        _id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        targetRole: n.targetRole || null,
        userId: n.userId || null,
        createdAt: n.createdAt,
        read: isRead
      };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark a single notification as read
export const markNotificationRead = (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const notif = db.findById('notifications', id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    if (notif.userId) {
      // Specific individual notification
      db.updateById('notifications', id, { read: true });
    } else {
      // Role-targeted notification: append to readBy list
      const readBy = notif.readBy || [];
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        db.updateById('notifications', id, { readBy });
      }
    }

    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark all notifications as read for current user
export const markAllNotificationsRead = (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const allNotifs = db.findAll('notifications') || [];

    allNotifs.forEach(n => {
      // Filter out cleared
      if (n.clearedBy && n.clearedBy.includes(userId)) return;

      const matchesUser = n.userId === userId || (n.targetRole && (n.targetRole === 'all' || n.targetRole === role));
      if (!matchesUser) return;

      if (n.userId) {
        if (!n.read) {
          db.updateById('notifications', n._id, { read: true });
        }
      } else {
        const readBy = n.readBy || [];
        if (!readBy.includes(userId)) {
          readBy.push(userId);
          db.updateById('notifications', n._id, { readBy });
        }
      }
    });

    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clear a single notification (dismiss)
export const clearNotification = (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const notif = db.findById('notifications', id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    if (notif.userId) {
      // Specific individual notification: delete completely
      db.deleteById('notifications', id);
    } else {
      // Role-targeted notification: append to clearedBy list
      const clearedBy = notif.clearedBy || [];
      if (!clearedBy.includes(userId)) {
        clearedBy.push(userId);
        db.updateById('notifications', id, { clearedBy });
      }
    }

    res.json({ message: 'Notification cleared.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clear all notifications for current user
export const clearAllNotifications = (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  try {
    const allNotifs = db.findAll('notifications') || [];

    allNotifs.forEach(n => {
      const matchesUser = n.userId === userId || (n.targetRole && (n.targetRole === 'all' || n.targetRole === role));
      if (!matchesUser) return;

      if (n.userId) {
        db.deleteById('notifications', n._id);
      } else {
        const clearedBy = n.clearedBy || [];
        if (!clearedBy.includes(userId)) {
          clearedBy.push(userId);
          db.updateById('notifications', n._id, { clearedBy });
        }
      }
    });

    res.json({ message: 'All notifications cleared.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
