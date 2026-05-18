import { db } from '../config/fileDB.js';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_ACTIVE_SUPPORT_MESSAGES = 5;

// ---- General Messages (buyer contact) ----

export const sendMessage = (req, res) => {
  const { buyerId, buyerName, buyerPhone, subject, message } = req.body;
  try {
    const msg = db.create('messages', { buyerId, buyerName, buyerPhone, subject, message, read: false, reply: null });
    db.create('notifications', { type: 'message', title: 'New Message from Buyer', message: `${buyerName}: ${subject}`, targetRole: 'admin', read: false });
    res.status(201).json({ message: 'Message sent to admin.', data: msg });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getMessages = (req, res) => {
  try {
    const allMsgs = db.findAll('messages').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (req.user?.role === 'admin') {
      return res.json(allMsgs);
    }
    // Filter by authenticated user's ID
    const userMsgs = allMsgs.filter(m => m.buyerId === req.user?.id);
    res.json(userMsgs);
  }
  catch (error) { res.status(500).json({ message: error.message }); }
};

export const replyMessage = (req, res) => {
  const { reply } = req.body;
  try {
    const updated = db.updateById('messages', req.params.id, { reply, read: true });
    if (!updated) return res.status(404).json({ message: 'Message not found' });
    res.json(updated);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteMessage = (req, res) => {
  try {
    db.deleteById('messages', req.params.id);
    res.json({ message: 'Message deleted.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ---- Support Messages (password recovery / admin help queue) ----

const getWordCount = (str) => {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
};

export const sendSupportMessage = (req, res) => {
  const { subject, message, category, phone, email } = req.body;
  const userId = req.user?.id;

  try {
    // Validate inputs
    if (!subject || !subject.trim()) {
      return res.status(400).json({ message: 'Subject is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const words = getWordCount(message);
    if (words > 1000) {
      return res.status(400).json({ message: `Message exceeds the maximum limit of 1000 words. (Current word count: ${words})` });
    }

    // Get user details
    const user = db.findById('users', userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Enforce Token-Based Support System
    const currentTokens = typeof user.supportTokens === 'number' ? user.supportTokens : 5;
    if (currentTokens <= 0) {
      return res.status(403).json({
        message: 'You have 0 support tokens remaining. You cannot submit support requests. Please contact administrator directly.'
      });
    }

    const msg = db.create('supportmessages', {
      userId,
      userName: user.name,
      userPhone: phone.trim() || user.phone,
      email: email.trim(),
      userRole: user.role,
      subject: subject.trim(),
      message: message.trim(),
      category: category || 'general',
      requestLat: req.body.requestLat ? parseFloat(req.body.requestLat) : null,
      requestLng: req.body.requestLng ? parseFloat(req.body.requestLng) : null,
      status: 'open',
      adminNote: null
    });

    // Deduct 1 token from user
    const updatedUser = db.updateById('users', userId, { supportTokens: currentTokens - 1 });

    // Appending to Unified Direct Thread
    db.create('chat_messages', {
      threadId: userId,
      senderId: userId,
      senderName: user.name,
      senderRole: user.role,
      message: message.trim(),
      subject: subject.trim(),
      category: category || 'general',
      isTicket: true,
      requestLat: req.body.requestLat ? parseFloat(req.body.requestLat) : null,
      requestLng: req.body.requestLng ? parseFloat(req.body.requestLng) : null,
      email: email.trim(),
      phone: phone.trim() || user.phone,
      createdAt: new Date().toISOString()
    });

    let thread = db.findOne('chat_threads', { userId });
    if (!thread) {
      db.create('chat_threads', {
        _id: userId,
        userId,
        userName: user.name,
        userPhone: phone.trim() || user.phone,
        email: email.trim(),
        userRole: user.role,
        status: 'open',
        subject: subject.trim(),
        category: category || 'general',
        lastMessage: message.trim(),
        lastMessageAt: new Date().toISOString(),
        unreadByAdmin: true,
        unreadByUser: false,
        requestLat: req.body.requestLat ? parseFloat(req.body.requestLat) : null,
        requestLng: req.body.requestLng ? parseFloat(req.body.requestLng) : null
      });
    } else {
      db.updateById('chat_threads', thread._id, {
        lastMessage: message.trim(),
        lastMessageAt: new Date().toISOString(),
        unreadByAdmin: true,
        status: 'open',
        subject: subject.trim(),
        category: category || 'general',
        email: email.trim(),
        userPhone: phone.trim() || user.phone,
        requestLat: req.body.requestLat ? parseFloat(req.body.requestLat) : null,
        requestLng: req.body.requestLng ? parseFloat(req.body.requestLng) : null
      });
    }

    db.create('notifications', {
      type: 'support_request',
      title: '🆘 New Support Request',
      message: `${user.name} (${user.phone}): ${subject}`,
      targetRole: 'admin',
      read: false
    });

    res.status(201).json({
      message: 'Support request submitted. Admin will review it.',
      data: msg,
      supportTokens: updatedUser.supportTokens
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendRecoverySupportMessage = (req, res) => {
  const { phone, email, subject, message } = req.body;

  try {
    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: 'Registered phone number is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const user = db.findOne('users', { phone: phone.trim() });
    if (!user) {
      return res.status(444).json({ message: 'No registered account found with this phone number.' });
    }

    const words = getWordCount(message);
    if (words > 1000) {
      return res.status(400).json({ message: `Message exceeds the maximum limit of 1000 words. (Current word count: ${words})` });
    }

    // Enforce Token-Based Support System
    const currentTokens = typeof user.supportTokens === 'number' ? user.supportTokens : 5;
    if (currentTokens <= 0) {
      return res.status(403).json({
        message: 'This account has 0 support tokens remaining. Password recovery requests cannot be submitted. Please contact administrator.'
      });
    }

    const msg = db.create('supportmessages', {
      userId: user._id,
      userName: user.name,
      userPhone: user.phone,
      email: email.trim(),
      userRole: user.role,
      subject: subject?.trim() || 'Forgot Password Recovery',
      message: message.trim(),
      category: 'password_recovery',
      status: 'open',
      adminNote: null
    });

    // Deduct 1 token from user
    const updatedUser = db.updateById('users', user._id, { supportTokens: currentTokens - 1 });

    // Appending to Unified Direct Thread
    db.create('chat_messages', {
      threadId: user._id,
      senderId: user._id,
      senderName: user.name,
      senderRole: user.role,
      message: message.trim(),
      subject: subject?.trim() || 'Forgot Password Recovery',
      category: 'password_recovery',
      isTicket: true,
      email: email.trim(),
      phone: user.phone,
      createdAt: new Date().toISOString()
    });

    let thread = db.findOne('chat_threads', { userId: user._id });
    if (!thread) {
      db.create('chat_threads', {
        _id: user._id,
        userId: user._id,
        userName: user.name,
        userPhone: user.phone,
        email: email.trim(),
        userRole: user.role,
        status: 'open',
        subject: subject?.trim() || 'Forgot Password Recovery',
        category: 'password_recovery',
        lastMessage: message.trim(),
        lastMessageAt: new Date().toISOString(),
        unreadByAdmin: true,
        unreadByUser: false
      });
    } else {
      db.updateById('chat_threads', thread._id, {
        lastMessage: message.trim(),
        lastMessageAt: new Date().toISOString(),
        unreadByAdmin: true,
        status: 'open',
        subject: subject?.trim() || 'Forgot Password Recovery',
        category: 'password_recovery',
        email: email.trim(),
        userPhone: user.phone
      });
    }

    db.create('notifications', {
      type: 'support_request',
      title: '🆘 Forgot Password Support',
      message: `Forgot Password: ${user.name} (${user.phone})`,
      targetRole: 'admin',
      read: false
    });

    res.status(201).json({
      message: 'Password recovery request submitted successfully.',
      data: msg,
      supportTokens: updatedUser.supportTokens
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSupportMessages = (req, res) => {
  try {
    const msgs = db.findAll('supportmessages');
    const users = db.findAll('users');
    const enriched = msgs.map(m => {
      const user = users.find(u => u._id === m.userId || u.phone === m.userPhone);
      return {
        ...m,
        supportTokens: user ? (typeof user.supportTokens === 'number' ? user.supportTokens : 5) : 'N/A'
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(enriched);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getUserSupportMessages = (req, res) => {
  const userId = req.user?.id;
  try {
    const msgs = db.findAll('supportmessages')
      .filter(m => m.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const activeCount = msgs.filter(m => m.status !== 'resolved').length;
    res.json({ messages: msgs, activeCount, limit: MAX_ACTIVE_SUPPORT_MESSAGES });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const resolveSupportMessage = (req, res) => {
  const { adminNote } = req.body;
  try {
    const updated = db.updateById('supportmessages', req.params.id, {
      status: 'resolved',
      adminNote: adminNote || 'Resolved by admin.',
      resolvedAt: new Date().toISOString()
    });
    if (!updated) return res.status(404).json({ message: 'Support message not found' });
    res.json({ message: 'Support request resolved.', data: updated });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteSupportMessage = (req, res) => {
  try {
    db.deleteById('supportmessages', req.params.id);
    res.json({ message: 'Support message deleted.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// Public guest support messages
export const sendGeneralSupportMessage = (req, res) => {
  const { phone, email, message } = req.body;
  try {
    if (!phone || !phone.trim()) return res.status(400).json({ message: 'Phone number is required.' });
    if (!email || !email.trim()) return res.status(400).json({ message: 'Email address is required.' });
    if (!message || !message.trim()) return res.status(400).json({ message: 'Message is required.' });

    const words = getWordCount(message);
    if (words > 1000) {
      return res.status(400).json({ message: `Message exceeds the maximum limit of 1000 words. (Current word count: ${words})` });
    }

    // Check if phone matches any user to link role
    let userId = null;
    let userName = 'Guest Visitor';
    let userRole = 'guest';

    // Normalize phone purely by digits
    const searchPhone = phone.replace(/\D/g, '');
    const searchMatch = searchPhone.length >= 11 ? searchPhone.slice(-11) : searchPhone;

    if (searchMatch) {
      const user = db.findAll('users').find(u => {
        const p = u.phone ? u.phone.replace(/\D/g, '') : '';
        return (p.length >= 11 ? p.slice(-11) : p) === searchMatch;
      });
      if (user) {
        userId = user._id;
        userName = user.name;
        userRole = user.role;
      }
    }

    const msg = db.create('supportmessages', {
      userId,
      userName,
      userPhone: phone.trim(),
      email: email.trim(),
      userRole,
      subject: 'General Visitor Inquiry',
      message: message.trim(),
      category: 'general',
      status: 'open',
      adminNote: null
    });

    const activeThreadId = userId || `guest_${searchMatch || Date.now().toString()}`;

    // Appending to Unified Direct Thread
    db.create('chat_messages', {
      threadId: activeThreadId,
      senderId: userId || 'guest',
      senderName: userName,
      senderRole: userRole,
      message: message.trim(),
      subject: 'General Visitor Inquiry',
      category: 'general',
      isTicket: true,
      email: email.trim(),
      phone: phone.trim(),
      createdAt: new Date().toISOString()
    });

    let thread = db.findOne('chat_threads', { _id: activeThreadId });
    if (!thread) {
      db.create('chat_threads', {
        _id: activeThreadId,
        userId: userId, // null for guests
        userName,
        userPhone: phone.trim(),
        email: email.trim(),
        userRole,
        status: 'open',
        subject: 'General Visitor Inquiry',
        category: 'general',
        lastMessage: message.trim(),
        lastMessageAt: new Date().toISOString(),
        unreadByAdmin: true,
        unreadByUser: false
      });
    } else {
      db.updateById('chat_threads', thread._id, {
        lastMessage: message.trim(),
        lastMessageAt: new Date().toISOString(),
        unreadByAdmin: true,
        status: 'open',
        subject: 'General Visitor Inquiry',
        email: email.trim(),
        userPhone: phone.trim()
      });
    }

    db.create('notifications', {
      type: 'support_request',
      title: '🆘 New Guest Support Request',
      message: `Guest (${phone.trim()}): General Visitor Inquiry`,
      targetRole: 'admin',
      read: false
    });

    res.status(201).json({
      message: 'Support request submitted successfully. Admin will contact you via email.',
      data: msg
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---- Unified Direct Messaging (User ↔ Admin) ----

export const getUserThread = (req, res) => {
  const userId = req.user.id;
  try {
    const messages = db.find('chat_messages', { threadId: userId });
    
    // Mark admin replies as read
    messages.forEach(m => {
      if (m.senderRole === 'admin' && !m.read) {
        db.updateById('chat_messages', m._id, { read: true });
      }
    });

    db.updateOne('chat_threads', { userId }, { unreadByUser: false });
    res.json({ threadId: userId, messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendMessageToAdmin = (req, res) => {
  const { message } = req.body;
  const userId = req.user.id;
  const userName = req.user.name;
  const userRole = req.user.role;
  const userPhone = req.user.phone || '';
  const email = req.user.email || '';

  try {
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message content is required.' });
    }

    const msg = db.create('chat_messages', {
      threadId: userId,
      senderId: userId,
      senderName: userName,
      senderRole: userRole,
      message: message.trim(),
      read: false,
      createdAt: new Date().toISOString()
    });

    let thread = db.findOne('chat_threads', { userId });
    if (!thread) {
      db.create('chat_threads', {
        _id: userId,
        userId,
        userName,
        userPhone,
        email,
        userRole,
        status: 'open',
        subject: 'General Chat',
        category: 'general',
        lastMessage: message.trim(),
        lastMessageAt: new Date().toISOString(),
        unreadByAdmin: true,
        unreadByUser: false
      });
    } else {
      db.updateById('chat_threads', thread._id, {
        lastMessage: message.trim(),
        lastMessageAt: new Date().toISOString(),
        unreadByAdmin: true,
        status: 'open'
      });
    }

    db.create('notifications', {
      type: 'message',
      title: `💬 New Message from ${userName}`,
      message: message.trim().substring(0, 60),
      targetRole: 'admin',
      read: false
    });

    res.status(201).json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adminGetThreads = (req, res) => {
  try {
    const threads = db.findAll('chat_threads').sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    res.json(threads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adminGetThreadDetails = (req, res) => {
  const { userId } = req.params;
  try {
    const messages = db.find('chat_messages', { threadId: userId });
    
    messages.forEach(m => {
      if (m.senderRole !== 'admin' && !m.read) {
        db.updateById('chat_messages', m._id, { read: true });
      }
    });

    db.updateOne('chat_threads', { _id: userId }, { unreadByAdmin: false });
    res.json({ threadId: userId, messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adminReplyToThread = (req, res) => {
  const { userId } = req.params;
  const { message } = req.body;

  try {
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message reply content is required.' });
    }

    const thread = db.findOne('chat_threads', { _id: userId });
    if (!thread) {
      return res.status(404).json({ message: 'Conversation thread not found.' });
    }

    const msg = db.create('chat_messages', {
      threadId: userId,
      senderId: 'admin',
      senderName: 'Admin',
      senderRole: 'admin',
      message: message.trim(),
      read: false,
      createdAt: new Date().toISOString()
    });

    db.updateById('chat_threads', thread._id, {
      lastMessage: message.trim(),
      lastMessageAt: new Date().toISOString(),
      unreadByUser: true,
      unreadByAdmin: false
    });

    db.create('notifications', {
      type: 'message_reply',
      title: '👑 Admin Official Reply',
      message: message.trim().substring(0, 60),
      targetUser: userId,
      read: false
    });

    res.status(201).json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const adminResolveThread = (req, res) => {
  const { userId } = req.params;
  try {
    const thread = db.findOne('chat_threads', { _id: userId });
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    db.updateById('chat_threads', thread._id, {
      status: 'resolved',
      resolvedAt: new Date().toISOString()
    });

    const msg = db.create('chat_messages', {
      threadId: userId,
      senderId: 'admin',
      senderName: 'System Notice',
      senderRole: 'admin',
      message: '✅ This support thread was marked as resolved by the administrator.',
      createdAt: new Date().toISOString()
    });

    res.json({ message: 'Thread resolved successfully.', data: msg });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---- Seller Community Group Chat (Sellers + Admin) ----

export const getGroupMessages = (req, res) => {
  const user = req.user;
  try {
    if (user.role !== 'admin' && user.role !== 'farmer') {
      return res.status(403).json({ message: 'Access denied. Only sellers and admin can access this group chat.' });
    }

    if (user.role === 'farmer') {
      const dbUser = db.findById('users', user.id);
      if (dbUser && dbUser.enrolledInGroupChat === false) {
        return res.status(403).json({ message: 'You have been removed from the Seller Community Group Chat by the administrator.' });
      }
    }

    const messages = db.findAll('group_messages').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendGroupMessage = (req, res) => {
  const user = req.user;
  const { message } = req.body;

  try {
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message content is required.' });
    }

    if (user.role !== 'admin' && user.role !== 'farmer') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    let senderName = user.name;
    let extraDetails = {};

    if (user.role === 'farmer') {
      const dbUser = db.findById('users', user.id);
      if (dbUser && dbUser.enrolledInGroupChat === false) {
        return res.status(403).json({ message: 'You have been removed from the Seller Community Group Chat.' });
      }
      senderName = dbUser ? dbUser.name : user.name;
      extraDetails = {
        farmName: dbUser?.farmName || '',
        sellerCode: dbUser?.sellerCode || ''
      };
    }

    const msg = db.create('group_messages', {
      senderId: user.id,
      senderName,
      senderRole: user.role,
      message: message.trim(),
      pinned: false,
      ...extraDetails,
      createdAt: new Date().toISOString()
    });

    res.status(201).json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const pinGroupMessage = (req, res) => {
  try {
    const updated = db.updateById('group_messages', req.params.id, { pinned: true });
    if (!updated) return res.status(404).json({ message: 'Message not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const unpinGroupMessage = (req, res) => {
  try {
    const updated = db.updateById('group_messages', req.params.id, { pinned: false });
    if (!updated) return res.status(404).json({ message: 'Message not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteGroupMessage = (req, res) => {
  try {
    db.deleteById('group_messages', req.params.id);
    res.json({ message: 'Group message deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUnreadMessageCount = (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  try {
    let unreadCount = 0;

    if (role === 'admin') {
      // 1. Unread chat thread messages from users
      const chatMsgs = db.findAll('chat_messages') || [];
      const unreadChat = chatMsgs.filter(m => m.senderRole !== 'admin' && !m.read).length;

      // 2. Open support request tickets
      const supportMsgs = db.findAll('supportmessages') || [];
      const unreadSupport = supportMsgs.filter(s => s.status === 'open').length;

      // 3. Unread general buyer inquiries
      const generalMsgs = db.findAll('messages') || [];
      const unreadGeneral = generalMsgs.filter(g => !g.read).length;

      unreadCount = unreadChat + unreadSupport + unreadGeneral;
    } else {
      // Users count unread replies from Admin in their direct chat thread
      const userMsgs = db.find('chat_messages', { threadId: userId }) || [];
      unreadCount = userMsgs.filter(m => m.senderRole === 'admin' && !m.read).length;
    }

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


