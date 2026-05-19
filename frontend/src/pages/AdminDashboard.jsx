import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import BangladeshMap from '../components/BangladeshMap';

const NAV = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'farmers', icon: '👨‍🌾', label: 'Farmer Approvals' },
  { id: 'prices', icon: '💰', label: 'Pricing' },
  { id: 'orders', icon: '📦', label: 'Orders' },
  { id: 'ledger', icon: '💵', label: 'Financial Ledger' },
  { id: 'sellers', icon: '🌾', label: 'Sellers' },
  { id: 'buyers', icon: '🛒', label: 'Buyers' },
  { id: 'support', icon: '🆘', label: 'Support Queue' },
  { id: 'map', icon: '🗺️', label: 'Map View' },
  { id: 'messages', icon: '💬', label: 'Messages' },
  { id: 'group_chat', icon: '👥', label: 'Community Chat' },
  { id: 'audit_logs', icon: '📋', label: 'Audit Logs' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

const STATUS_COLORS = {
  'Order Pending': 'yellow', 'Order Confirmed': 'blue', 'Out for Delivery': 'purple',
  'Delivered': 'green', 'Cancelled': 'red', 'Rejected': 'red', 'Refunded': 'yellow'
};

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Automatically collapse sidebar on mobile, expand on desktop
      setSidebarOpen(!mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Data states
  const [analytics, setAnalytics] = useState(null);
  const [pendingFarmers, setPendingFarmers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [settings, setSettings] = useState({});
  // Sellers/Buyers/Support
  const [sellers, setSellers] = useState({ sellers: [], total: 0, page: 1, pages: 1 });
  const [buyers, setBuyers] = useState({ buyers: [], total: 0, page: 1, pages: 1 });
  const [supportMsgs, setSupportMsgs] = useState([]);
  const [sellerSearch, setSellerSearch] = useState('');
  const [buyerSearch, setBuyerSearch] = useState('');
  const [sellerPage, setSellerPage] = useState(1);
  const [buyerPage, setBuyerPage] = useState(1);
  const [assigningLocation, setAssigningLocation] = useState(null); // farmerId being assigned

  // Redesign states
  const [allFarmers, setAllFarmers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [settlementPercentages, setSettlementPercentages] = useState({});

  // Admin Override Modal states
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideUser, setOverrideUser] = useState(null);
  const [overrideName, setOverrideName] = useState('');
  const [overrideEmail, setOverrideEmail] = useState('');
  const [overridePhone, setOverridePhone] = useState('');
  const [overrideBio, setOverrideBio] = useState('');
  const [overrideFarmName, setOverrideFarmName] = useState('');
  const [overrideDistrict, setOverrideDistrict] = useState('');
  const [overrideCapacity, setOverrideCapacity] = useState('');
  const [overrideTokens, setOverrideTokens] = useState(5);
  const [overrideNewPassword, setOverrideNewPassword] = useState('');
  const [overrideIsApproved, setOverrideIsApproved] = useState(true);
  const [overrideRating, setOverrideRating] = useState(5);
  const [overrideNationalId, setOverrideNationalId] = useState('');
  const [overrideOnline, setOverrideOnline] = useState(false);
  const [overrideManualRevenue, setOverrideManualRevenue] = useState(0);
  const [overrideSellerCode, setOverrideSellerCode] = useState('');
  const [overrideEnrolledInGroupChat, setOverrideEnrolledInGroupChat] = useState(true);

  // Financial Ledger states
  const [overrideTransactions, setOverrideTransactions] = useState([]);
  const [txnForm, setTxnForm] = useState({ amount: '', note: '', referenceId: '' });
  const [editEarningsOrderId, setEditEarningsOrderId] = useState(null);
  const [editEarningsValue, setEditEarningsValue] = useState(0);
  const [editEarningsApproved, setEditEarningsApproved] = useState(false);

  // Form states
  const [newProduct, setNewProduct] = useState({ name: '', price: '' });
  const [editProduct, setEditProduct] = useState(null);
  const [settingsForm, setSettingsForm] = useState({ otpEmail: '', newPassword: '', otpEnabled: true });
  const [replyText, setReplyText] = useState({});
  const [orderFilter, setOrderFilter] = useState('all');
  const [loading, setLoading] = useState({});
  const [msg, setMsg] = useState('');

  // Message Center states
  const [chatThreads, setChatThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [selectedThreadMessages, setSelectedThreadMessages] = useState([]);
  const [adminReplyInput, setAdminReplyInput] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [messageFilter, setMessageFilter] = useState('all');
  const [messageCenterLoading, setMessageCenterLoading] = useState(false);

  // Group Chat states
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupInput, setGroupInput] = useState('');
  const [groupLoading, setGroupLoading] = useState(false);

  const showMsg = (text, isErr = false) => {
    setMsg(isErr ? `❌ ${text}` : `✅ ${text}`);
    setTimeout(() => setMsg(''), 3500);
  };

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (tab === 'overview') loadAnalytics();
    if (tab === 'sellers') loadSellers(1, sellerSearch);
    if (tab === 'buyers') loadBuyers(1, buyerSearch);
    if (tab === 'support') loadSupportMsgs();
    if (tab === 'farmers') loadPendingFarmers();
    if (tab === 'messages') loadMessages();
    if (tab === 'group_chat') loadGroupMessages();
    if (tab === 'audit_logs') loadAuditLogs();
  }, [tab]);

  const loadAll = () => {
    loadAnalytics();
    loadPendingFarmers();
    loadProducts();
    loadOrders();
    loadUsers();
    loadMessages();
    loadNotifications();
    loadUnreadMessages();
    loadSettings();
    loadSellers();
    loadBuyers();
    loadSupportMsgs();
    loadAllFarmers();
    loadAuditLogs();
  };

  const loadAllFarmers = () => {
    axios.get('/api/admin/sellers?limit=1000')
      .then(r => setAllFarmers(r.data && Array.isArray(r.data.sellers) ? r.data.sellers : []))
      .catch(() => {});
  };

  const loadAuditLogs = () => {
    axios.get('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${user?.token}` } })
      .then(r => setAuditLogs(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  };

  const loadSellers = (page = 1, search = sellerSearch) =>
    axios.get(`/api/admin/sellers?page=${page}&search=${encodeURIComponent(search)}&limit=10`)
      .then(r => setSellers(r.data && typeof r.data === 'object' && Array.isArray(r.data.sellers) ? r.data : { sellers: [], total: 0, page: 1, pages: 1 })).catch(() => {});

  const loadBuyers = (page = 1, search = buyerSearch) =>
    axios.get(`/api/admin/buyers?page=${page}&search=${encodeURIComponent(search)}&limit=10`)
      .then(r => setBuyers(r.data && typeof r.data === 'object' && Array.isArray(r.data.buyers) ? r.data : { buyers: [], total: 0, page: 1, pages: 1 })).catch(() => {});

  const loadSupportMsgs = () =>
    axios.get('/api/messages/support', { headers: { Authorization: `Bearer ${user?.token}` } })
      .then(r => setSupportMsgs(Array.isArray(r.data) ? r.data : [])).catch(() => {});

  const loadAnalytics = () => axios.get('/api/admin/analytics').then(r => setAnalytics(r.data && typeof r.data === 'object' ? r.data : null)).catch(() => {});
  const loadPendingFarmers = () => axios.get('/api/admin/pending-farmers').then(r => setPendingFarmers(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  const loadProducts = () => axios.get('/api/admin/products').then(r => setProducts(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  const loadOrders = () => axios.get('/api/orders').then(r => setOrders(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  const loadUsers = () => axios.get('/api/admin/users').then(r => setUsers(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  const loadChatThreads = async () => {
    try {
      const { data } = await axios.get('/api/messages/unified/admin/threads', { headers: { Authorization: `Bearer ${user?.token}` } });
      setChatThreads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load chat threads:', err);
    }
  };

  const loadThreadDetails = async (threadId) => {
    try {
      setMessageCenterLoading(true);
      const { data } = await axios.get(`/api/messages/unified/admin/threads/${threadId}`, { headers: { Authorization: `Bearer ${user?.token}` } });
      setSelectedThreadMessages(data && Array.isArray(data.messages) ? data.messages : []);
      setSelectedThreadId(threadId);
      setChatThreads(prev => Array.isArray(prev) ? prev.map(t => t._id === threadId ? { ...t, unreadByAdmin: false } : t) : []);
    } catch (err) {
      showMsg('Failed to load conversation history.', true);
    } finally {
      setMessageCenterLoading(false);
    }
  };

  const sendAdminReply = async (e) => {
    e.preventDefault();
    if (!adminReplyInput.trim() || !selectedThreadId) return;
    try {
      const { data } = await axios.post(`/api/messages/unified/admin/threads/${selectedThreadId}/reply`, { message: adminReplyInput }, { headers: { Authorization: `Bearer ${user?.token}` } });
      setSelectedThreadMessages(prev => Array.isArray(prev) ? [...prev, data] : [data]);
      setAdminReplyInput('');
      setChatThreads(prev => Array.isArray(prev) ? prev.map(t => t._id === selectedThreadId ? { ...t, lastMessage: adminReplyInput, lastMessageAt: new Date().toISOString(), unreadByAdmin: false } : t) : []);
    } catch (err) {
      showMsg(err?.response?.data?.message || 'Failed to send reply to user.', true);
    }
  };

  const resolveThread = async (threadId) => {
    try {
      const { data } = await axios.put(`/api/messages/unified/admin/threads/${threadId}/resolve`, {}, { headers: { Authorization: `Bearer ${user?.token}` } });
      setSelectedThreadMessages(prev => Array.isArray(prev) ? [...prev, data.data] : [data.data]);
      setChatThreads(prev => Array.isArray(prev) ? prev.map(t => t._id === threadId ? { ...t, status: 'resolved' } : t) : []);
      showMsg('Conversation thread resolved.');
    } catch {
      showMsg('Failed to resolve thread.', true);
    }
  };

  const loadMessages = () => {
    axios.get('/api/messages').then(r => setMessages(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    loadChatThreads();
  };

  const loadGroupMessages = async () => {
    try {
      const { data } = await axios.get('/api/messages/group', { headers: { Authorization: `Bearer ${user?.token}` } });
      setGroupMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load group messages:', err);
    }
  };

  const sendGroupMessage = async (e) => {
    e.preventDefault();
    if (!groupInput.trim()) return;
    try {
      setGroupLoading(true);
      const { data } = await axios.post('/api/messages/group', { message: groupInput }, { headers: { Authorization: `Bearer ${user?.token}` } });
      setGroupMessages(prev => [...prev, data]);
      setGroupInput('');
    } catch {
      showMsg('Failed to send group message.', true);
    } finally {
      setGroupLoading(false);
    }
  };

  const deleteGroupMessage = async (messageId) => {
    if (!window.confirm('Are you absolutely sure you want to delete this community message?')) return;
    try {
      await axios.delete(`/api/messages/group/${messageId}`, { headers: { Authorization: `Bearer ${user?.token}` } });
      setGroupMessages(prev => prev.filter(m => m._id !== messageId));
      showMsg('Community message deleted.');
    } catch {
      showMsg('Failed to delete message.', true);
    }
  };

  const togglePinGroupMessage = async (messageId) => {
    const msgToToggle = groupMessages.find(m => m._id === messageId);
    if (!msgToToggle) return;
    const action = msgToToggle.pinned ? 'unpin' : 'pin';
    try {
      const { data } = await axios.put(`/api/messages/group/${messageId}/${action}`, {}, { headers: { Authorization: `Bearer ${user?.token}` } });
      const nowPinned = data.pinned;
      setGroupMessages(prev => prev.map(m => {
        if (m._id === messageId) {
          return { ...m, pinned: nowPinned };
        }
        return nowPinned ? { ...m, pinned: false } : m;
      }));
      showMsg(nowPinned ? 'Message pinned as active announcement!' : 'Message unpinned.');
    } catch {
      showMsg('Failed to toggle pin status.', true);
    }
  };

  const loadNotifications = () => axios.get('/api/notifications', { headers: { Authorization: `Bearer ${user?.token}` } }).then(r => setNotifications(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  const loadUnreadMessages = () => axios.get('/api/messages/unread-count', { headers: { Authorization: `Bearer ${user?.token}` } }).then(r => setUnreadMessages(r.data.unreadCount || 0)).catch(() => {});

  useEffect(() => {
    loadUnreadMessages();
    const interval = setInterval(() => {
      loadUnreadMessages();
      loadNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  const loadSettings = () => axios.get('/api/admin/settings').then(r => {
    const d = r.data && typeof r.data === 'object' ? r.data : {};
    setSettings(d);
    setSettingsForm({ otpEmail: d.otpEmail || '', newPassword: '', otpEnabled: d.otpEnabled !== false, noticeEnabled: !!d.noticeEnabled, noticeText: d.noticeText || '' });
  }).catch(() => {});

  const approveFarmer = async (id) => {
    setLoad('approve_' + id, true);
    try { await axios.post(`/api/admin/approve-farmer/${id}`, {}, { headers: { Authorization: `Bearer ${user?.token}` } }); loadPendingFarmers(); loadAnalytics(); showMsg('Farmer approved!'); }
    catch (e) { showMsg(e.response?.data?.message || 'Failed', true); }
    setLoad('approve_' + id, false);
  };

  const rejectFarmer = async (id) => {
    if (!window.confirm('Reject and remove this application?')) return;
    try { await axios.delete(`/api/admin/reject-farmer/${id}`, { headers: { Authorization: `Bearer ${user?.token}` } }); loadPendingFarmers(); showMsg('Application rejected.'); }
    catch { showMsg('Failed', true); }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    try { await axios.post('/api/admin/products', newProduct); setNewProduct({ name: '', price: '' }); loadProducts(); showMsg('Price added!'); }
    catch (e) { showMsg(e.response?.data?.message || 'Failed', true); }
  };

  const updateProduct = async (id, price) => {
    try { await axios.put(`/api/admin/products/${id}`, { price }); setEditProduct(null); loadProducts(); showMsg('Price updated!'); }
    catch { showMsg('Failed', true); }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this price entry?')) return;
    try { await axios.delete(`/api/admin/products/${id}`); loadProducts(); showMsg('Deleted.'); }
    catch { showMsg('Failed', true); }
  };

  const updateOrderStatus = async (orderId, status) => {
    try { await axios.post('/api/orders/update-status', { orderId, status }); loadOrders(); showMsg('Order updated!'); }
    catch { showMsg('Failed', true); }
  };

  const setDeliveryCharge = async (orderId, charge) => {
    try { await axios.post('/api/orders/request-charge', { orderId, deliveryCharge: charge }); loadOrders(); showMsg('Delivery charge set!'); }
    catch { showMsg('Failed', true); }
  };

  const confirmDispatch = async (orderId, farmerId) => {
    setLoad('dispatch_' + orderId, true);
    try { 
      await axios.post('/api/orders/confirm', { orderId, farmerId }, { headers: { Authorization: `Bearer ${user?.token}` } }); 
      loadOrders(); 
      loadAuditLogs();
      showMsg(farmerId ? 'Order confirmed & assigned to seller!' : 'Order confirmed! Admin will deliver directly.'); 
    }
    catch (e) { showMsg(e.response?.data?.message || 'Failed', true); }
    setLoad('dispatch_' + orderId, false);
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try { await axios.delete(`/api/admin/user/${id}`, { headers: { Authorization: `Bearer ${user?.token}` } }); loadUsers(); loadSellers(); loadBuyers(); loadAnalytics(); showMsg('User deleted.'); }
    catch (e) { showMsg(e.response?.data?.message || 'Failed to delete user', true); }
  };

  const resolveSupportMsg = async (id) => {
    try {
      await axios.put(`/api/messages/support/${id}/resolve`, { adminNote: 'Resolved by admin.' }, { headers: { Authorization: `Bearer ${user?.token}` } });
      loadSupportMsgs();
      showMsg('Support request resolved.');
    } catch { showMsg('Failed', true); }
  };

  const handleApproveLocation = async (supportMsgId) => {
    if (!window.confirm('Approve this location request and plot marker on the map?')) return;
    try {
      await axios.post('/api/admin/approve-location-request', { supportMsgId });
      showMsg('✅ Location request approved and marker plotted successfully!');
      loadSupportMsgs();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Approval failed', true);
    }
  };

  const deleteSupportMsg = async (id) => {
    if (!window.confirm('Delete this support request?')) return;
    try {
      await axios.delete(`/api/messages/support/${id}`, { headers: { Authorization: `Bearer ${user?.token}` } });
      loadSupportMsgs();
      showMsg('Deleted.');
    } catch { showMsg('Failed', true); }
  };

  const assignSellerLocation = async (farmerId, lat, lng) => {
    try {
      await axios.post('/api/admin/assign-seller-location', { farmerId, lat, lng });
      setAssigningLocation(null);
      loadSellers();
      showMsg('Location assigned!');
    } catch { showMsg('Failed to assign location', true); }
  };

  const setFarmerRating = async (farmerId, rating) => {
    try {
      await axios.post('/api/admin/update-farmer-ranking', { farmerId, rating });
      loadUsers();
      showMsg('Farmer rating updated!');
    } catch { showMsg('Failed to update rating', true); }
  };

  const replyToMessage = async (id) => {
    if (!replyText[id]) return;
    try { await axios.put(`/api/messages/${id}/reply`, { reply: replyText[id] }); setReplyText(prev => ({ ...prev, [id]: '' })); loadMessages(); showMsg('Reply sent!'); }
    catch { showMsg('Failed', true); }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      await axios.put('/api/admin/settings', settingsForm);
      showMsg('Settings saved!');
      loadSettings();
    } catch { showMsg('Failed', true); }
  };

  const markNotifRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${user?.token}` } });
      loadNotifications();
    } catch {}
  };

  const markAllNotifsRead = async () => {
    try {
      await axios.post('/api/notifications/mark-all-read', {}, { headers: { Authorization: `Bearer ${user?.token}` } });
      loadNotifications();
      showMsg('All notifications marked as read.');
    } catch {}
  };

  const clearAllNotifs = async () => {
    try {
      await axios.post('/api/notifications/clear-all', {}, { headers: { Authorization: `Bearer ${user?.token}` } });
      loadNotifications();
      showMsg('All notifications cleared.');
    } catch {}
  };

  const clearNotif = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.delete(`/api/notifications/${id}`, { headers: { Authorization: `Bearer ${user?.token}` } });
      loadNotifications();
      showMsg('Notification cleared.');
    } catch {}
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const loadOverrideTransactions = async (userId) => {
    try {
      const { data } = await axios.get(`/api/transactions/user/${userId}`, { headers: { Authorization: `Bearer ${user?.token}` } });
      setOverrideTransactions(data);
    } catch {
      setOverrideTransactions([]);
    }
  };

  const handleOpenOverrideModal = (targetUser) => {
    setOverrideUser(targetUser);
    setOverrideName(targetUser.name || '');
    setOverrideEmail(targetUser.email || '');
    setOverridePhone(targetUser.phone || '');
    setOverrideBio(targetUser.bio || '');
    setOverrideFarmName(targetUser.farmName || '');
    setOverrideDistrict(targetUser.district || '');
    setOverrideCapacity(targetUser.capacity || '');
    setOverrideTokens(typeof targetUser.supportTokens === 'number' ? targetUser.supportTokens : 5);
    setOverrideNewPassword('');
    setOverrideIsApproved(targetUser.isApproved !== false);
    setOverrideRating(targetUser.rating || 5);
    setOverrideNationalId(targetUser.nationalId || '');
    setOverrideSellerCode(targetUser.sellerCode || '');
    setOverrideOnline(!!targetUser.online);
    setOverrideManualRevenue(targetUser.manualRevenueAdjustment || 0);
    setOverrideEnrolledInGroupChat(targetUser.enrolledInGroupChat !== false);
    
    // Financial Ledger Setup
    setTxnForm({ amount: '', note: '', referenceId: '' });
    loadOverrideTransactions(targetUser._id);
    
    setShowOverrideModal(true);
  };

  const handleUpdateTokens = async (userId, action, amount = 1) => {
    try {
      await axios.put(`/api/admin/user/${userId}/tokens`, { action, amount }, { headers: { Authorization: `Bearer ${user?.token}` } });
      loadSupportMsgs();
      loadUsers();
      loadSellers();
      loadBuyers();
      showMsg('Support tokens updated successfully.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to update tokens.', true);
    }
  };

  const handleSaveOverrideProfile = async (e) => {
    e.preventDefault();
    if (!overrideUser) return;
    try {
      const payload = {
        name: overrideName,
        email: overrideEmail,
        phone: overridePhone,
        bio: overrideBio,
        supportTokens: Number(overrideTokens),
        online: overrideOnline,
        manualRevenueAdjustment: Number(overrideManualRevenue)
      };
      if (overrideUser.role === 'farmer') {
        payload.farmName = overrideFarmName;
        payload.district = overrideDistrict;
        payload.capacity = overrideCapacity;
        payload.isApproved = overrideIsApproved;
        payload.rating = Number(overrideRating);
        payload.nationalId = overrideNationalId;
        payload.sellerCode = overrideSellerCode;
        payload.enrolledInGroupChat = overrideEnrolledInGroupChat;
      }
      await axios.put(`/api/admin/user/${overrideUser._id}/profile`, payload, { headers: { Authorization: `Bearer ${user?.token}` } });
      setShowOverrideModal(false);
      loadSupportMsgs();
      loadUsers();
      loadSellers();
      loadBuyers();
      loadAnalytics();
      showMsg('Profile overrides updated successfully by Admin.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to override user profile.', true);
    }
  };

  const handleSaveOverridePassword = async (e) => {
    e.preventDefault();
    if (!overrideUser || !overrideNewPassword.trim()) return;
    try {
      await axios.put(`/api/admin/user/${overrideUser._id}/password`, { newPassword: overrideNewPassword }, { headers: { Authorization: `Bearer ${user?.token}` } });
      setOverrideNewPassword('');
      setShowOverrideModal(false);
      showMsg('Password overridden successfully by Admin.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to reset user password.', true);
    }
  };

  const normalizePhone = (p) => {
    if (!p) return '';
    const digits = p.toString().replace(/\D/g, '');
    return digits.length >= 11 ? digits.slice(-11) : digits;
  };

  const handleTransitionToUserChat = (targetUser) => {
    setShowOverrideModal(false);
    setTab('messages');
    loadThreadDetails(targetUser._id);
  };

  const handleSupportPhoneClick = async (m) => {
    if (!m.userPhone) return;
    const normSearch = normalizePhone(m.userPhone);
    let found = users.find(u => 
      u._id === m.userId || 
      normalizePhone(u.phone) === normSearch
    );
    
    if (found) {
      handleOpenOverrideModal(found);
      return;
    }
    
    try {
      showMsg('Searching database for matching profile...');
      const { data } = await axios.get(`/api/admin/user/lookup?phone=${encodeURIComponent(m.userPhone)}`, { headers: { Authorization: `Bearer ${user?.token}` } });
      handleOpenOverrideModal(data);
    } catch (err) {
      showMsg(err.response?.data?.message || 'No matching registered profile found in database.', true);
    }
  };

  const handleResetSellerEarnings = async (farmerId) => {
    if (!window.confirm('Are you absolutely sure you want to reset all earnings and adjustments for this seller to 0? This cannot be undone.')) return;
    try {
      await axios.post(`/api/admin/user/${farmerId}/reset-earnings`, {}, { headers: { Authorization: `Bearer ${user?.token}` } });
      setShowOverrideModal(false);
      loadUsers();
      loadSellers();
      loadAnalytics();
      showMsg('Seller earnings successfully reset to 0.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Reset failed.', true);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!overrideUser) return;
    try {
      await axios.post('/api/transactions', {
        userId: overrideUser._id,
        userRole: overrideUser.role,
        type: overrideUser.role === 'buyer' ? 'spending' : 'revenue',
        amount: txnForm.amount,
        note: txnForm.note,
        referenceId: txnForm.referenceId
      }, { headers: { Authorization: `Bearer ${user?.token}` } });
      
      setTxnForm({ amount: '', note: '', referenceId: '' });
      loadOverrideTransactions(overrideUser._id);
      loadAnalytics();
      showMsg('Transaction added successfully to ledger.');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to add transaction.', true);
    }
  };

  const handleDeleteTransaction = async (txnId) => {
    if (!window.confirm('Delete this ledger entry permanently?')) return;
    try {
      await axios.delete(`/api/transactions/${txnId}`, { headers: { Authorization: `Bearer ${user?.token}` } });
      loadOverrideTransactions(overrideUser._id);
      loadAnalytics();
      showMsg('Transaction deleted.');
    } catch (err) {
      showMsg('Failed to delete transaction.', true);
    }
  };

  const handleResetTransactions = async () => {
    if (!overrideUser) return;
    if (!window.confirm('Are you absolutely sure you want to delete ALL ledger entries for this user? This will set their total to 0.')) return;
    try {
      await axios.post(`/api/transactions/reset/${overrideUser._id}`, {}, { headers: { Authorization: `Bearer ${user?.token}` } });
      loadOverrideTransactions(overrideUser._id);
      loadAnalytics();
      showMsg('All ledger transactions reset to 0.');
    } catch (err) {
      showMsg('Failed to reset transactions.', true);
    }
  };

  const finalizeSettlement = async (orderId) => {
    const pctValue = settlementPercentages[orderId] !== undefined ? settlementPercentages[orderId] : 80;
    const pct = parseFloat(pctValue);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return showMsg('Please enter a percentage between 0 and 100.', true);
    }
    if (!window.confirm(`Finalize payout at ${pct}% for this order? This action is permanent.`)) return;
    
    setLoad('settle_' + orderId, true);
    try {
      await axios.post('/api/admin/orders/settle', { orderId, sellerPercentage: pct }, { headers: { Authorization: `Bearer ${user?.token}` } });
      loadOrders();
      loadAnalytics();
      loadAuditLogs();
      showMsg('Settlement finalized & seller paid successfully!');
    } catch (e) {
      showMsg(e.response?.data?.message || 'Settlement failed', true);
    }
    setLoad('settle_' + orderId, false);
  };

  const filteredOrders = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter);
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const Card = ({ icon, label, value, color = 'var(--color-primary)' }) => (
    <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <div style={{ fontSize: '2.25rem', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,197,94,0.1)', borderRadius: 'var(--radius-md)' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color, fontFamily: 'var(--font-heading)' }}>{value ?? '—'}</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-body)', position: 'relative' }}>
      {/* Frosted Backdrop Overlay on Mobile when Sidebar is toggled open */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(5px)', zIndex: 999 }} 
        />
      )}

      {/* Sidebar */}
      <div style={isMobile ? {
        position: 'fixed',
        left: sidebarOpen ? '0px' : '-240px',
        top: 0,
        bottom: 0,
        width: '240px',
        background: 'rgba(7,26,14,0.98)',
        borderRight: '1px solid var(--border-color)',
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000
      } : {
        width: sidebarOpen ? '240px' : '64px',
        minHeight: '100vh',
        background: 'rgba(7,26,14,0.95)',
        borderRight: '1px solid var(--border-color)',
        transition: 'width 0.3s',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🍄</span>
          {(sidebarOpen || isMobile) && <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden' }}>Mashroom<span style={{ color: 'var(--color-primary)' }}>Magic</span></span>}
        </div>
        <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => { setTab(n.id); if (isMobile) setSidebarOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: (sidebarOpen || isMobile) ? '0.75rem 1.25rem' : '0.75rem', background: tab === n.id ? 'rgba(34,197,94,0.12)' : 'transparent', border: 'none', color: tab === n.id ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer', borderLeft: tab === n.id ? '3px solid var(--color-primary)' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem', fontFamily: 'var(--font-body)', textAlign: 'left' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0, position: 'relative' }}>
                {n.icon}
                {n.id === 'farmers' && pendingFarmers.length > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-6px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pendingFarmers.length}</span>}
                {n.id === 'messages' && unreadMessages > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-6px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadMessages}</span>}
                {n.id === 'support' && supportMsgs.filter(m => m.status === 'open').length > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-6px', background: '#f97316', color: '#fff', borderRadius: '50%', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{supportMsgs.filter(m => m.status === 'open').length}</span>}
              </span>
              {(sidebarOpen || isMobile) && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{n.label}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>
            <span>🚪</span>{(sidebarOpen || isMobile) && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', width: '100%' }}>
        {/* Top bar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(7,26,14,0.7)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isMobile && (
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ☰
              </button>
            )}
            <h2 style={{ fontSize: '1.2rem', margin: 0, fontFamily: 'var(--font-heading)' }}>{NAV.find(n => n.id === tab)?.label}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {msg && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: '0.85rem', color: msg.startsWith('❌') ? '#ef4444' : 'var(--color-primary)' }}>{msg}</motion.span>}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setTab('overview')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: 'var(--text-muted)' }}>🔔</button>
              {unreadNotifs > 0 && <span style={{ position: 'absolute', top: '-2px', right: '-4px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadNotifs}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: 'rgba(34,197,94,0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              <span>🔐</span><span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>System Admin</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', flex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

              {/* OVERVIEW */}
              {tab === 'overview' && (
                <div>
                  {analytics && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                      <Card icon="🛒" label="Total Buyers" value={analytics.totalBuyers} />
                      <Card icon="👨‍🌾" label="Active Sellers" value={analytics.totalSellers} />
                      <Card icon="📦" label="Total Orders" value={analytics.totalOrders} />
                      <Card icon="⏳" label="Pending Approvals" value={analytics.pendingApprovals} color="var(--color-warning)" />
                      <Card icon="💰" label="Revenue (৳)" value={analytics.revenue?.toLocaleString()} color="var(--color-secondary)" />
                    </div>
                  )}
                  {/* Notifications */}
                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        🔔 Recent Notifications
                        {unreadNotifs > 0 && <span className="badge badge-red">{unreadNotifs} new</span>}
                      </h3>
                      {Array.isArray(notifications) && notifications.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={markAllNotifsRead} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--color-primary)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}>Mark all read</button>
                          <button onClick={clearAllNotifs} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}>Clear all</button>
                        </div>
                      )}
                    </div>
                    {!Array.isArray(notifications) || notifications.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No notifications yet.</p> : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {notifications.slice(0, 10).map(n => (
                          <div key={n._id} onClick={() => markNotifRead(n._id)}
                            style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '0.5rem' : '0', padding: '0.75rem 1rem', background: n.read ? 'transparent' : 'rgba(34,197,94,0.06)', border: '1px solid', borderColor: n.read ? 'rgba(255,255,255,0.04)' : 'rgba(34,197,94,0.15)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <div style={{ width: isMobile ? '100%' : 'auto' }}>
                              <div style={{ fontWeight: n.read ? 400 : 600, fontSize: '0.9rem' }}>{n.title}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{n.message}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end', marginTop: isMobile ? '0.25rem' : '0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {!n.read && <div className="pulse-green" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }} />}
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                              </div>
                              <button onClick={(e) => clearNotif(n._id, e)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', padding: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }} title="Clear notification">🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FARMER APPROVALS */}
              {tab === 'farmers' && (
                <div>
                  <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', color: 'var(--text-muted)' }}>
                    {pendingFarmers.length === 0 ? 'No pending applications' : `${pendingFarmers.length} application(s) awaiting review`}
                  </h3>
                  {pendingFarmers.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                      <p style={{ color: 'var(--text-muted)' }}>All applications have been reviewed.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                      {pendingFarmers.map(f => (
                        <motion.div key={f._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="glass-panel" style={{ padding: '1.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                              <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>{f.name}</h4>
                              <span className="badge badge-yellow">Pending</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(f.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                            <div><span style={{ color: 'var(--text-muted)' }}>Farm:</span> <strong>{f.farmName || 'N/A'}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>District:</span> <strong>{f.district || 'N/A'}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Mushroom:</span> <strong>{f.mushroomType || 'N/A'}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Capacity:</span> <strong>{f.capacity ? f.capacity + ' kg/day' : 'N/A'}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> <strong>{f.phone}</strong></div>
                            <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <strong style={{ fontSize: '0.8rem' }}>{f.email || 'N/A'}</strong></div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => approveFarmer(f._id)} disabled={loading['approve_' + f._id]}>
                              {loading['approve_' + f._id] ? '...' : '✅ Approve'}
                            </button>
                            <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => rejectFarmer(f._id)}>
                              ❌ Reject
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PRICING */}
              {tab === 'prices' && (
                <div>
                  <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Add New Mushroom Price</h3>
                    <form onSubmit={addProduct} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <input className="input-field" style={{ flex: '1', minWidth: '160px' }} placeholder="Mushroom name" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} required />
                      <input className="input-field" style={{ width: '140px' }} type="number" placeholder="Price (৳/kg)" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} required />
                      <button type="submit" className="btn btn-primary">+ Add Price</button>
                    </form>
                  </div>
                  <div className="glass-panel" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.9rem' }}>Today's Mushroom Prices</div>
                    {products.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No prices set yet.</div>
                    ) : (
                      <table className="data-table">
                        <thead><tr><th>Mushroom</th><th>Price (৳/kg)</th><th>Updated</th><th>Actions</th></tr></thead>
                        <tbody>
                          {products.map(p => (
                            <tr key={p._id}>
                              <td><strong>{p.name}</strong></td>
                              <td>
                                {editProduct === p._id ? (
                                  <input className="input-field" style={{ width: '120px', padding: '0.4rem 0.6rem' }} type="number" defaultValue={p.price}
                                    onBlur={e => updateProduct(p._id, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') updateProduct(p._id, e.target.value); if (e.key === 'Escape') setEditProduct(null); }} autoFocus />
                                ) : (
                                  <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>৳{p.price}</span>
                                )}
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(p.setAt || p.updatedAt).toLocaleString()}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button className="btn btn-outline btn-sm" onClick={() => setEditProduct(p._id)}>✏️ Edit</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p._id)}>🗑️</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* ORDERS */}
              {tab === 'orders' && (
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    {['all', 'Order Pending', 'Order Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled'].map(f => (
                      <button key={f} className={`btn btn-sm ${orderFilter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setOrderFilter(f)}>
                        {f === 'all' ? 'All Orders' : f}
                      </button>
                    ))}
                  </div>
                  <div className="glass-panel" style={{ overflow: 'auto' }}>
                    {filteredOrders.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No orders found.</div>
                    ) : (
                      <table className="data-table">
                        <thead><tr><th>Buyer</th><th>Product</th><th>Qty</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                          {filteredOrders.map(o => (
                            <tr key={o._id}>
                              <td>
                                <div style={{ fontWeight: 600 }}>{o.buyerName}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{o.buyerPhone}</div>
                                {o.deliveryAddress && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {o.deliveryAddress}</div>}
                              </td>
                              <td>{o.productName}</td>
                              <td>{o.quantity} kg</td>
                              <td>
                                <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>৳{o.totalCost}</div>
                                {o.deliveryCharge > 0 && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>+৳{o.deliveryCharge} delivery</div>}
                              </td>
                              <td><span className={`badge badge-${STATUS_COLORS[o.status] || 'blue'}`}>{o.status}</span></td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  {o.status === 'Order Pending' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(255,255,255,0.1)', minWidth: '180px' }}>
                                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <span>🚴</span> Delivery Option:
                                      </div>
                                      <select 
                                        className="input-field" 
                                        style={{ padding: '0.25rem 0.4rem', fontSize: '0.75rem', width: '100%', background: 'var(--bg-card)' }}
                                        id={`assign-select-${o._id}`}
                                        defaultValue=""
                                      >
                                        <option value="">Direct Delivery (Admin)</option>
                                        {allFarmers.map(f => (
                                          <option key={f._id} value={f._id}>
                                            👨‍🌾 {f.name} ({f.district || 'N/A'})
                                          </option>
                                        ))}
                                      </select>
                                      <button 
                                        className="btn btn-primary btn-sm" 
                                        onClick={() => {
                                          const selectEl = document.getElementById(`assign-select-${o._id}`);
                                          confirmDispatch(o._id, selectEl ? selectEl.value : null);
                                        }} 
                                        disabled={loading['dispatch_' + o._id]}
                                        style={{ width: '100%', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                      >
                                        {loading['dispatch_' + o._id] ? 'Dispatched...' : 'Confirm order'}
                                      </button>
                                    </div>
                                  )}
                                  {o.status === 'Order Confirmed' && (
                                    <button className="btn btn-warning btn-sm" onClick={() => updateOrderStatus(o._id, 'Out for Delivery')}>🚚 Dispatch</button>
                                  )}
                                  {o.status === 'Out for Delivery' && (
                                    <button className="btn btn-primary btn-sm" onClick={() => updateOrderStatus(o._id, 'Delivered')}>✅ Delivered</button>
                                  )}
                                  <select className="input-field" style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem', width: 'auto' }} value={o.status} onChange={e => updateOrderStatus(o._id, e.target.value)}>
                                    {['Order Pending','Order Confirmed','Out for Delivery','Delivered','Cancelled','Rejected','Refunded'].map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* FINANCIAL LEDGER */}
              {tab === 'ledger' && (
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>💵</span> Centralized Earnings Ledger
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Review successfully delivered orders. Specify exact farmer earnings for each completed delivery, override system calculated revenues, and confirm payments. Sellers only see approved amounts.
                  </p>

                  <div className="glass-panel" style={{ overflow: 'auto' }}>
                    {orders.filter(o => o.status === 'Delivered').length === 0 ? (
                      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏳</div>
                        No completed deliveries have registered on the system yet.
                      </div>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Order Details</th>
                            <th>Seller / Farmer</th>
                            <th>Product Details</th>
                            <th>Total Cost</th>
                            <th>Seller Payout Share</th>
                            <th>Settlement Status</th>
                            <th>Settlement Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.filter(o => o.status === 'Delivered').map(o => {
                            return (
                              <tr key={o._id}>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{o.buyerName}</div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID: {o._id.substring(0, 8)}...</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{o.farmerName || 'Direct (Admin)'}</div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID: {o.farmerId ? o.farmerId.substring(0, 8) + '...' : '—'}</div>
                                </td>
                                <td>
                                  <div>🍄 {o.productName}</div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{o.quantity} kg</div>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600 }}>৳{o.totalCost}</div>
                                  {o.deliveryCharge > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+৳{o.deliveryCharge} delivery</div>}
                                </td>
                                <td>
                                  {!o.farmerId ? (
                                    <div style={{ color: 'var(--text-muted)' }}>—</div>
                                  ) : o.isSettled ? (
                                    <div>
                                      <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>৳{o.sellerEarnings}</div>
                                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({o.sellerPercentage}%)</div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                      <input 
                                        type="number" 
                                        className="input-field" 
                                        min="0" 
                                        max="100" 
                                        value={settlementPercentages[o._id] !== undefined ? settlementPercentages[o._id] : 80}
                                        onChange={e => setSettlementPercentages(prev => ({ ...prev, [o._id]: e.target.value }))}
                                        style={{ width: '85px', padding: '0.25rem 0.4rem', fontSize: '0.8rem' }}
                                      />
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>% share (0-100)</span>
                                    </div>
                                  )}
                                </td>
                                <td>
                                  {!o.farmerId ? (
                                    <span className="badge badge-green">Self-Handled</span>
                                  ) : o.isSettled ? (
                                    <span className="badge badge-green">Payout Disbursed</span>
                                  ) : (
                                    (() => {
                                      const pct = parseFloat(settlementPercentages[o._id] !== undefined ? settlementPercentages[o._id] : 80) || 0;
                                      const sellerShare = ((o.totalCost * pct) / 100).toFixed(2);
                                      const adminShare = (o.totalCost - sellerShare).toFixed(2);
                                      return (
                                        <div style={{ fontSize: '0.78rem' }}>
                                          <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Seller: ৳{sellerShare}</div>
                                          <div style={{ color: 'var(--text-muted)' }}>Admin: ৳{adminShare}</div>
                                        </div>
                                      );
                                    })()
                                  )}
                                </td>
                                <td>
                                  {!o.farmerId ? (
                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                      ৳{(o.totalCost || 0) + (o.deliveryCharge || 0)} Admin Rev
                                    </div>
                                  ) : o.isSettled ? (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      Admin commission: ৳{o.adminEarnings}
                                    </div>
                                  ) : (
                                    <button 
                                      className="btn btn-primary btn-sm" 
                                      onClick={() => finalizeSettlement(o._id)}
                                      disabled={loading['settle_' + o._id]}
                                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                                    >
                                      {loading['settle_' + o._id] ? '...' : '💸 Finalize Payout'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* SELLERS */}
              {tab === 'sellers' && (
                <div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input className="input-field" style={{ flex: 1, minWidth: '200px' }} placeholder="Search by name, farm, phone..." value={sellerSearch}
                      onChange={e => setSellerSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { setSellerPage(1); loadSellers(1, sellerSearch); } }} />
                    <button className="btn btn-primary btn-sm" onClick={() => { setSellerPage(1); loadSellers(1, sellerSearch); }}>Search</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setSellerSearch(''); setSellerPage(1); loadSellers(1, ''); }}>Reset</button>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{sellers.total} seller(s) · Page {sellers.page}/{sellers.pages}</div>
                  <div className="glass-panel" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                      <thead><tr><th>Status</th><th>Name</th><th>Code</th><th>Phone</th><th>Location</th><th>Rating</th><th>Last Active</th><th>Actions</th></tr></thead>
                      <tbody>
                        {sellers.sellers.map(s => (
                          <tr key={s._id}>
                            <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.online ? '#22c55e' : '#6b7280', display: 'inline-block', flexShrink: 0, boxShadow: s.online ? '0 0 6px #22c55e' : 'none' }} />{s.online ? 'Online' : 'Offline'}</span></td>
                            <td><div style={{ fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.farmName}</div></td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--color-primary)' }}>{s.sellerCode || '—'}</td>
                            <td style={{ fontSize: '0.85rem' }}><span onClick={() => handleOpenOverrideModal(s)} style={{ color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>{s.phone}</span></td>
                            <td><span className={`badge ${s.locationSet ? 'badge-green' : 'badge-yellow'}`}>{s.locationSet ? '📍 Set' : 'Not Set'}</span></td>
                            <td><select className="input-field" style={{ padding: '0.25rem 0.5rem', fontSize: '0.82rem', width: '80px' }} value={s.rating || 5} onChange={e => setFarmerRating(s._id, e.target.value)}>{[...Array(9)].map((_, i) => <option key={i+1} value={i+1}>{i+1}★</option>)}</select></td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.lastActive ? new Date(s.lastActive).toLocaleString() : '—'}</td>
                            <td><div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button className="btn btn-outline btn-sm" onClick={() => handleOpenOverrideModal(s)} style={{ fontSize: '0.75rem' }}>⚙️ Manage</button>
                              <button className="btn btn-outline btn-sm" onClick={() => setAssigningLocation(s._id)} style={{ fontSize: '0.75rem' }}>📍 Locate</button>
                              <button className="btn btn-danger btn-sm" onClick={() => deleteUser(s._id)}>Delete</button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {sellers.pages > 1 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                      {[...Array(sellers.pages)].map((_, i) => (
                        <button key={i} className={`btn btn-sm ${sellerPage === i+1 ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setSellerPage(i+1); loadSellers(i+1); }}>{i+1}</button>
                      ))}
                    </div>
                  )}
                  {/* Assign Location Modal */}
                  {assigningLocation && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000 }} onClick={() => setAssigningLocation(null)} />
                      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '90%', maxWidth: '700px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', zIndex: 1001 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '1rem' }}>📍 Assign Location for {sellers.sellers.find(s => s._id === assigningLocation)?.name}</h3>
                          <button onClick={() => setAssigningLocation(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Click on the map to select this seller's location.</p>
                        <BangladeshMap pickMode={true} farmerId={assigningLocation} height="420px"
                          onLocationPick={(lat, lng) => assignSellerLocation(assigningLocation, lat, lng)} />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* BUYERS */}
              {tab === 'buyers' && (
                <div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input className="input-field" style={{ flex: 1, minWidth: '200px' }} placeholder="Search by name, phone, email..." value={buyerSearch}
                      onChange={e => setBuyerSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { setBuyerPage(1); loadBuyers(1, buyerSearch); } }} />
                    <button className="btn btn-primary btn-sm" onClick={() => { setBuyerPage(1); loadBuyers(1, buyerSearch); }}>Search</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setBuyerSearch(''); setBuyerPage(1); loadBuyers(1, ''); }}>Reset</button>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{buyers.total} buyer(s) · Page {buyers.page}/{buyers.pages}</div>
                  <div className="glass-panel" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                      <thead><tr><th>Status</th><th>Name</th><th>Phone</th><th>Email</th><th>Orders</th><th>Joined</th><th>Last Active</th><th>Action</th></tr></thead>
                      <tbody>
                        {buyers.buyers.map(b => (
                          <tr key={b._id}>
                            <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.online ? '#22c55e' : '#6b7280', display: 'inline-block', flexShrink: 0, boxShadow: b.online ? '0 0 6px #22c55e' : 'none' }} />{b.online ? 'Online' : 'Offline'}</span></td>
                            <td style={{ fontWeight: 600 }}>{b.name}</td>
                            <td style={{ fontSize: '0.85rem' }}><span onClick={() => handleOpenOverrideModal(b)} style={{ color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}>{b.phone}</span></td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{b.email || '—'}</td>
                            <td><span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{b.totalOrders}</span></td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.lastActive ? new Date(b.lastActive).toLocaleString() : '—'}</td>
                            <td><div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button className="btn btn-outline btn-sm" onClick={() => handleOpenOverrideModal(b)} style={{ fontSize: '0.75rem' }}>⚙️ Manage</button>
                              <button className="btn btn-danger btn-sm" onClick={() => deleteUser(b._id)}>Delete</button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {buyers.pages > 1 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                      {[...Array(buyers.pages)].map((_, i) => (
                        <button key={i} className={`btn btn-sm ${buyerPage === i+1 ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setBuyerPage(i+1); loadBuyers(i+1); }}>{i+1}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUPPORT QUEUE */}
              {tab === 'support' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{supportMsgs.filter(m => m.status === 'open').length} open · {supportMsgs.filter(m => m.status === 'resolved').length} resolved</h3>
                    <button className="btn btn-outline btn-sm" onClick={loadSupportMsgs}>🔄 Refresh</button>
                  </div>
                  {supportMsgs.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🆘</div>
                      <p style={{ color: 'var(--text-muted)' }}>No support requests yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {supportMsgs.map(m => (
                        <div key={m._id} className="glass-panel" style={{ padding: '1.5rem', borderColor: m.status === 'resolved' ? 'var(--border-color)' : 'rgba(249,115,22,0.3)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                {m.userName}{' '}
                                <span 
                                  onClick={() => handleSupportPhoneClick(m)}
                                  style={{ color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600, fontSize: '0.85rem' }}
                                >
                                  ({m.userPhone})
                                </span>
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.25rem' }}>
                                📧 Email: <span style={{ color: 'var(--color-primary)' }}>{m.email || 'N/A'}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{m.userRole?.toUpperCase()} · {m.category?.replace('_', ' ')} · {new Date(m.createdAt).toLocaleString()}</div>
                              
                              {/* Token Management Panel */}
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tokens: <strong style={{ color: m.supportTokens > 0 ? 'var(--color-primary)' : '#ef4444' }}>{m.supportTokens}</strong></span>
                                <button className="btn btn-outline btn-xs" onClick={() => handleUpdateTokens(m.userId, 'grant', 1)} style={{ padding: '0.1rem 0.35rem', fontSize: '0.7rem', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--color-primary)' }}>+ Grant</button>
                                <button className="btn btn-outline btn-xs" onClick={() => handleUpdateTokens(m.userId, 'reduce', 1)} style={{ padding: '0.1rem 0.35rem', fontSize: '0.7rem', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>- Reduce</button>
                                <button className="btn btn-outline btn-xs" onClick={() => handleUpdateTokens(m.userId, 'reset')} style={{ padding: '0.1rem 0.35rem', fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.2)' }}>↺ Reset</button>
                              </div>

                              <div style={{ fontWeight: 600, color: '#f97316', marginTop: '0.5rem', fontSize: '0.9rem' }}>{m.subject}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span className={`badge ${m.status === 'resolved' ? 'badge-green' : 'badge-yellow'}`}>{m.status === 'resolved' ? '✓ Resolved' : 'Open'}</span>
                            </div>
                          </div>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>{m.message}</p>
                          
                          {m.category === 'location_update' && m.requestLat && m.requestLng && (
                             <div style={{ margin: '-0.25rem 0 1rem 0', padding: '0.75rem 1rem', background: 'rgba(249,115,22,0.06)', border: '1px dashed rgba(249,115,22,0.25)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
                               <strong>📍 High-Precision Geolocation Request:</strong> Lat {m.requestLat.toFixed(6)} · Lng {m.requestLng.toFixed(6)}
                             </div>
                           )}

                          {m.adminNote && <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(34,197,94,0.06)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', marginBottom: '0.75rem', borderLeft: '3px solid var(--color-primary)' }}>Admin note: {m.adminNote}</div>}
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {m.status !== 'resolved' && (
                              <button className="btn btn-primary btn-sm" onClick={() => resolveSupportMsg(m._id)}>✓ Mark Resolved</button>
                            )}
                            {m.status !== 'resolved' && m.category === 'location_update' && m.requestLat && m.requestLng && (
                               <button className="btn btn-outline btn-sm" onClick={() => handleApproveLocation(m._id)} style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                 📍 Approve & Plot Marker
                               </button>
                             )}
                            <button className="btn btn-danger btn-sm" onClick={() => deleteSupportMsg(m._id)}>🗑️ Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MAP */}
              {tab === 'map' && (
                 <div className="glass-panel" style={{ padding: '1.5rem' }}>
                   <h3 style={{ marginBottom: '0.4rem', fontSize: '1.1rem' }}>🗺️ Interactive Map Dashboard</h3>
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                     <strong>Admin Authority:</strong> Click anywhere on the map to drop a seller marker, assign seller profiles, drag/move nodes, or delete spatial markers.
                   </p>
                   <BangladeshMap adminMode={true} height="560px" />
                 </div>
               )}

              {/* MESSAGES */}
              {tab === 'messages' && (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', height: 'calc(100vh - 180px)', minHeight: '580px', alignItems: 'stretch' }}>
                  
                  {/* Left Pane - Sidebar with Threads */}
                  <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>💬</span> Unified Inbox
                    </h3>

                    {/* Filter and Search controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
                      <input 
                        className="input-field" 
                        value={messageSearch}
                        onChange={e => setMessageSearch(e.target.value)}
                        placeholder="🔍 Search name or phone..." 
                        style={{ margin: 0, padding: '0.45rem 0.75rem', fontSize: '0.85rem' }} 
                      />
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {['all', 'open', 'resolved'].map(f => (
                          <button
                            key={f}
                            className={`btn ${messageFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setMessageFilter(f)}
                            style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.78rem', textTransform: 'capitalize' }}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scrollable Threads List */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
                      {chatThreads
                        .filter(t => {
                          const query = messageSearch.toLowerCase();
                          const matchesSearch = 
                            (t.userName || '').toLowerCase().includes(query) || 
                            (t.userPhone || '').includes(query);
                          const matchesFilter = 
                            messageFilter === 'all' || 
                            t.status === messageFilter;
                          return matchesSearch && matchesFilter;
                        })
                        .map(t => {
                          const isActive = selectedThreadId === t._id;
                          const roleLabel = t.userRole === 'farmer' ? '👨‍🌾 Farmer' : t.userRole === 'buyer' ? '👤 Buyer' : '🌐 Guest';
                          const isResolved = t.status === 'resolved';

                          return (
                            <div
                              key={t._id}
                              onClick={() => loadThreadDetails(t._id)}
                              style={{
                                padding: '0.85rem 1rem',
                                background: isActive ? 'rgba(34,197,94,0.12)' : t.unreadByAdmin ? 'rgba(251,146,60,0.06)' : 'rgba(255, 255, 255, 0.02)',
                                border: isActive ? '1px solid var(--color-primary)' : t.unreadByAdmin ? '1px solid rgba(251,146,60,0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: isActive ? 'var(--color-primary)' : 'var(--text-main)' }}>
                                  {t.userName || 'Anonymous Guest'}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                                  {roleLabel}
                                </span>
                                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem', background: isResolved ? 'rgba(34,197,94,0.1)' : 'rgba(251,146,60,0.1)', borderRadius: '4px', color: isResolved ? 'var(--color-primary)' : '#f97316' }}>
                                  {isResolved ? 'Resolved' : 'Open'}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {t.lastMessage || 'No messages yet'}
                              </div>
                              {t.unreadByAdmin && (
                                <span style={{
                                  position: 'absolute',
                                  right: '10px',
                                  bottom: '10px',
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: '#f97316'
                                }} />
                              )}
                            </div>
                          );
                        })}
                      {chatThreads.length === 0 && (
                        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                          <span style={{ fontSize: '1.5rem' }}>📭</span>
                          <p style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>No conversations yet.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Pane - Chat Window Details */}
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    {selectedThreadId ? (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Conversation Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
                          <div>
                            {(() => {
                              const thread = chatThreads.find(t => t._id === selectedThreadId);
                              return (
                                <>
                                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                                    💬 Conversation with {thread?.userName || 'Anonymous'}
                                  </h4>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    📞 Phone: {thread?.userPhone} • Status: <strong style={{ color: thread?.status === 'resolved' ? 'var(--color-primary)' : '#f97316' }}>{thread?.status || 'open'}</strong>
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-secondary"
                              onClick={() => loadThreadDetails(selectedThreadId)}
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                            >
                              🔄 Refresh
                            </button>
                            <button
                              className="btn btn-success"
                              onClick={() => resolveThread(selectedThreadId)}
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: 'var(--color-primary)' }}
                            >
                              ✅ Resolve
                            </button>
                          </div>
                        </div>

                        {/* Scrolling Conversation Log */}
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem', marginBottom: '1rem' }}>
                          {messageCenterLoading ? (
                            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                              <p>Loading messages...</p>
                            </div>
                          ) : (
                            selectedThreadMessages.map(m => {
                              const isMe = m.senderRole === 'admin';
                              const isTicket = !!m.isTicket;

                              if (isTicket) {
                                return (
                                  <div key={m._id} style={{ alignSelf: 'center', width: '100%', maxWidth: '90%' }}>
                                    <div style={{
                                      background: 'rgba(249, 115, 22, 0.08)',
                                      border: '1px solid rgba(249, 115, 22, 0.25)',
                                      borderRadius: '8px',
                                      padding: '0.85rem 1.2rem',
                                      fontSize: '0.82rem',
                                      color: 'var(--text-muted)',
                                      lineHeight: 1.5
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', borderBottom: '1px solid rgba(249, 115, 22, 0.15)', paddingBottom: '0.25rem' }}>
                                        <strong style={{ color: '#f97316' }}>🆘 Ingested Support Request</strong>
                                        <span>{new Date(m.createdAt).toLocaleString()}</span>
                                      </div>
                                      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                                        Subject: {m.subject}
                                      </div>
                                      <div style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                                        {m.message}
                                      </div>
                                      {m.category === 'location_update' && m.requestLat && m.requestLng && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                                          📍 GPS requested: Lat {m.requestLat} · Lng {m.requestLng}
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.75rem', opacity: 0.8 }}>
                                        <span>Category: <span style={{ textTransform: 'capitalize' }}>{m.category?.replace('_', ' ')}</span></span>
                                        <span>•</span>
                                        <span>Email: {m.email || 'N/A'}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={m._id} style={{
                                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                                  maxWidth: '75%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: isMe ? 'flex-end' : 'flex-start'
                                }}>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem', padding: '0 0.25rem' }}>
                                    {isMe ? '👑 You (Admin)' : 'User'} • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <div style={{
                                    background: isMe ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
                                    border: isMe ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                    color: isMe ? '#000000' : 'var(--text-main)',
                                    fontWeight: isMe ? 500 : 400,
                                    padding: '0.75rem 1.1rem',
                                    borderRadius: isMe ? '12px 0px 12px 12px' : '0px 12px 12px 12px',
                                    fontSize: '0.86rem',
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap'
                                  }}>
                                    {m.message}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Admin Text Input Reply Footer */}
                        <form onSubmit={sendAdminReply} style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                          <input
                            className="input-field"
                            value={adminReplyInput}
                            onChange={e => setAdminReplyInput(e.target.value)}
                            placeholder="Type your official response to this thread..."
                            required
                            style={{ flex: 1, margin: 0 }}
                          />
                          <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ padding: '0 1.5rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            📤 Reply
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💬</div>
                        <h4 style={{ color: 'var(--text-main)', marginBottom: '0.35rem' }}>Select a conversation thread</h4>
                        <p style={{ fontSize: '0.85rem' }}>Choose any conversation thread from the sidebar inbox to read and send replies.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COMMUNITY GROUP CHAT (ADMIN SIDE) */}
              {tab === 'group_chat' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '1.5rem', height: 'calc(100vh - 180px)', minHeight: '580px', alignItems: 'stretch' }}>
                  
                  {/* Main Chat Panel */}
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>👥</span> Seller Community Chat & Moderation
                    </h3>

                    {/* Announcement Banner */}
                    {groupMessages.some(m => m.pinned) && (
                      <div style={{
                        background: 'rgba(249, 115, 22, 0.07)',
                        border: '1px solid rgba(249, 115, 22, 0.25)',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.1rem' }}>📌</span>
                          <div>
                            <strong style={{ color: '#f97316' }}>Active Announcement: </strong>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {groupMessages.find(m => m.pinned)?.message}
                            </span>
                          </div>
                        </div>
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => togglePinGroupMessage(groupMessages.find(m => m.pinned)?._id)}
                          style={{ padding: '0.1rem 0.4rem', fontSize: '0.72rem' }}
                        >
                          Unpin
                        </button>
                      </div>
                    )}

                    {/* Messages Flow */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem', marginBottom: '1rem' }}>
                      {groupMessages.map(m => {
                        const isMe = m.senderRole === 'admin';

                        return (
                          <div key={m._id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                            {/* Avatar */}
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: isMe ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.08)',
                              border: isMe ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                              color: isMe ? '#000000' : 'var(--text-main)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '0.82rem',
                              flexShrink: 0
                            }}>
                              {isMe ? '👑' : m.senderName?.[0]?.toUpperCase() || 'S'}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                              {/* Sender Info with moderation options on hover/aside */}
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <strong style={{ color: isMe ? 'var(--color-primary)' : 'var(--text-main)' }}>{m.senderName}</strong>
                                {m.senderDistrict && <span style={{ opacity: 0.7 }}>({m.senderDistrict})</span>}
                                <span>•</span>
                                <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span>•</span>
                                <button
                                  className="btn-link"
                                  onClick={() => togglePinGroupMessage(m._id)}
                                  style={{ background: 'none', border: 'none', color: m.pinned ? '#f97316' : 'var(--color-primary)', cursor: 'pointer', padding: 0, fontSize: '0.72rem' }}
                                >
                                  {m.pinned ? '📌 Unpin' : '📌 Pin Announcement'}
                                </button>
                                <span>•</span>
                                <button
                                  className="btn-link"
                                  onClick={() => deleteGroupMessage(m._id)}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontSize: '0.72rem' }}
                                >
                                  🗑️ Delete
                                </button>
                              </div>

                              {/* Text Bubble */}
                              <div style={{
                                background: isMe ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.04)',
                                border: isMe ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
                                color: isMe ? '#000000' : 'var(--text-main)',
                                padding: '0.75rem 1.1rem',
                                borderRadius: isMe ? '12px 0px 12px 12px' : '0px 12px 12px 12px',
                                fontSize: '0.86rem',
                                lineHeight: 1.45,
                                whiteSpace: 'pre-wrap',
                                position: 'relative'
                              }}>
                                {m.message}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {groupMessages.length === 0 && (
                        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👥</div>
                          <p style={{ fontSize: '0.85rem' }}>No community messages yet. Send an announcement or welcome message above!</p>
                        </div>
                      )}
                    </div>

                    {/* Message Input Footer */}
                    <form onSubmit={sendGroupMessage} style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                      <input
                        className="input-field"
                        value={groupInput}
                        onChange={e => setGroupInput(e.target.value)}
                        placeholder="Broadcast an official message or announcement to all sellers..."
                        required
                        style={{ flex: 1, margin: 0 }}
                        disabled={groupLoading}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={groupLoading}
                        style={{ padding: '0 1.5rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        {groupLoading ? 'Broadcasting...' : '📤 Broadcast'}
                      </button>
                    </form>
                  </div>

                  {/* Sidebar Community Members Info Panel */}
                  <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>👥 Active Members</h4>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {Array.from(new Set(groupMessages.map(m => JSON.stringify({ name: m.senderName, role: m.senderRole, district: m.senderDistrict }))))
                        .map(str => JSON.parse(str))
                        .map((mbr, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                            <span style={{ fontSize: '0.75rem' }}>{mbr.role === 'admin' ? '👑' : '👨‍🌾'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {mbr.name}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {mbr.role === 'admin' ? 'System Admin' : mbr.district || 'Seller'}
                              </div>
                            </div>
                          </div>
                        ))}
                      {groupMessages.length === 0 && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No active members listed.</p>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* SYSTEM AUDIT LOGS */}
              {tab === 'audit_logs' && (
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📋</span> Real-time System Audit Logs
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    Monitor system events, order creations, farmer assignments, password-verified tracking updates, and financial settlements.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Search audit logs by message, type, or user ID..." 
                      value={auditSearch} 
                      onChange={e => setAuditSearch(e.target.value)} 
                      style={{ maxWidth: '400px' }} 
                    />
                    {auditSearch && (
                      <button className="btn btn-outline btn-sm" onClick={() => setAuditSearch('')}>Clear</button>
                    )}
                  </div>

                  <div className="glass-panel" style={{ overflow: 'auto' }}>
                    {auditLogs.length === 0 ? (
                      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs recorded yet.</div>
                    ) : (
                      <table className="data-table" style={{ fontSize: '0.88rem' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '180px' }}>Timestamp</th>
                            <th style={{ width: '150px' }}>Event Type</th>
                            <th>Event Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.filter(log => {
                            const q = auditSearch.toLowerCase();
                            return !q || 
                              log.type?.toLowerCase().includes(q) || 
                              log.details?.toLowerCase().includes(q) ||
                              log._id?.includes(q) ||
                              log.userId?.includes(q) ||
                              log.adminId?.includes(q);
                          }).map(log => (
                            <tr key={log._id}>
                              <td style={{ color: 'var(--text-muted)' }}>
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td>
                                <span className={`badge badge-${
                                  log.type === 'order_creation' ? 'blue' : 
                                  log.type === 'seller_assignment' ? 'purple' : 
                                  log.type === 'order_settlement' ? 'green' : 
                                  log.type === 'tracking_update' ? 'yellow' : 'blue'
                                }`} style={{ fontSize: '0.75rem' }}>
                                  {log.type}
                                </span>
                              </td>
                              <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                                {log.details}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* SETTINGS */}
              {tab === 'settings' && (
                <div style={{ maxWidth: '560px' }}>
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>⚙️ System Settings</h3>
                    <form onSubmit={saveSettings}>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>OTP Receiver Email</label>
                        <input className="input-field" type="email" value={settingsForm.otpEmail} onChange={e => setSettingsForm({ ...settingsForm, otpEmail: e.target.value })} placeholder="admin@example.com" />
                      </div>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>New Admin Password</label>
                        <input className="input-field" type="password" value={settingsForm.newPassword} onChange={e => setSettingsForm({ ...settingsForm, newPassword: e.target.value })} placeholder="Leave blank to keep current" />
                      </div>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Noticebar Text (Global Message)</label>
                        <input className="input-field" type="text" value={settingsForm.noticeText} onChange={e => setSettingsForm({ ...settingsForm, noticeText: e.target.value })} placeholder="e.g., Weekend Discount: 20% off all orders!" />
                      </div>
                      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input type="checkbox" id="otpEnabled" checked={settingsForm.otpEnabled} onChange={e => setSettingsForm({ ...settingsForm, otpEnabled: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                        <label htmlFor="otpEnabled" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Enable OTP for admin login</label>
                      </div>
                      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input type="checkbox" id="noticeEnabled" checked={settingsForm.noticeEnabled} onChange={e => setSettingsForm({ ...settingsForm, noticeEnabled: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                        <label htmlFor="noticeEnabled" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Show Noticebar globally for logged-in users</label>
                      </div>
                      <button type="submit" className="btn btn-primary">Save Settings</button>
                    </form>

                    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                      <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--text-muted)' }}>Current Configuration</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>OTP Email: </span><strong>{settings.otpEmail || 'Not set'}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>OTP Status: </span><span className={`badge ${settings.otpEnabled !== false ? 'badge-green' : 'badge-red'}`}>{settings.otpEnabled !== false ? 'Enabled' : 'Disabled'}</span></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Noticebar Status: </span><span className={`badge ${settings.noticeEnabled ? 'badge-green' : 'badge-red'}`}>{settings.noticeEnabled ? 'Active' : 'Disabled'}</span></div>
                        {settings.noticeEnabled && <div><span style={{ color: 'var(--text-muted)' }}>Notice Text: </span><strong>{settings.noticeText}</strong></div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Universal User Override Modal */}
      <AnimatePresence>
        {showOverrideModal && overrideUser && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)', overflow: 'auto' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel" 
              style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', border: '1px solid rgba(239, 68, 68, 0.3)', position: 'relative' }}
            >
              {/* Close Button */}
              <button 
                type="button" 
                onClick={() => setShowOverrideModal(false)}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
              >
                &times;
              </button>

              <h2 style={{ fontSize: '1.35rem', marginBottom: '0.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚙️</span> Universal Profile Override
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                Bypass all user password validations to directly update profile settings or reset access credentials for <strong style={{ color: 'var(--color-primary)' }}>{overrideUser.name}</strong> ({overrideUser.role?.toUpperCase()}).
              </p>

              {/* Direct Messaging Shortcut Action */}
              <div style={{ marginBottom: '1.5rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Need to contact this user directly? Open a private two-way chat thread instantly.
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleTransitionToUserChat(overrideUser)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  💬 Message User
                </button>
              </div>

              {/* Financial Ledger Management */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Financial Ledger ({overrideUser.role === 'buyer' ? 'Spending' : 'Revenue'})
                  </h3>
                  <button onClick={handleResetTransactions} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>
                    Reset Ledger
                  </button>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {overrideTransactions.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No ledger entries found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {overrideTransactions.map(txn => (
                        <div key={txn._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.3rem' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ color: txn.amount >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{txn.amount >= 0 ? '+' : ''}৳{txn.amount}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{txn.note || 'No note'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(txn.createdAt).toLocaleDateString()}</span>
                            <button onClick={() => handleDeleteTransaction(txn._id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>&times;</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleAddTransaction} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount (৳)</label>
                    <input className="input-field" type="number" required value={txnForm.amount} onChange={e => setTxnForm({ ...txnForm, amount: e.target.value })} placeholder="e.g. 500 or -100" style={{ padding: '0.5rem' }} />
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Note / Reference</label>
                    <input className="input-field" type="text" value={txnForm.note} onChange={e => setTxnForm({ ...txnForm, note: e.target.value })} placeholder="e.g. Bulk order payment" style={{ padding: '0.5rem' }} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Add</button>
                </form>
              </div>

              {/* Profile Details Form */}
              <form onSubmit={handleSaveOverrideProfile} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profile Information</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Name</label>
                    <input className="input-field" type="text" value={overrideName} onChange={e => setOverrideName(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Email</label>
                    <input className="input-field" type="email" value={overrideEmail} onChange={e => setOverrideEmail(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Phone Number</label>
                    <input className="input-field" type="text" value={overridePhone} onChange={e => setOverridePhone(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Support Tokens</label>
                    <input className="input-field" type="number" value={overrideTokens} onChange={e => setOverrideTokens(e.target.value)} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Manual Revenue Adjustment (৳)</label>
                    <input className="input-field" type="number" value={overrideManualRevenue} onChange={e => setOverrideManualRevenue(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.2rem' }}>
                      <input type="checkbox" id="overrideOnline" checked={overrideOnline} onChange={e => setOverrideOnline(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }} />
                      <label htmlFor="overrideOnline" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Mark User Active/Online</label>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Bio</label>
                  <textarea className="input-field" rows={2} value={overrideBio} onChange={e => setOverrideBio(e.target.value)} style={{ resize: 'none' }} />
                </div>

                {overrideUser.role === 'farmer' && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>Seller Specific Settings</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Farm Name</label>
                        <input className="input-field" type="text" value={overrideFarmName} onChange={e => setOverrideFarmName(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>District</label>
                        <input className="input-field" type="text" value={overrideDistrict} onChange={e => setOverrideDistrict(e.target.value)} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>National ID Number</label>
                        <input className="input-field" type="text" value={overrideNationalId} onChange={e => setOverrideNationalId(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Capacity (kg/month)</label>
                        <input className="input-field" type="number" value={overrideCapacity} onChange={e => setOverrideCapacity(e.target.value)} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Rating</label>
                        <select className="input-field" value={overrideRating} onChange={e => setOverrideRating(e.target.value)}>
                          {[...Array(9)].map((_, i) => <option key={i+1} value={i+1}>{i+1}★</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Seller Code</label>
                        <input className="input-field" type="text" value={overrideSellerCode} onChange={e => setOverrideSellerCode(e.target.value)} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" id="overrideApproved" checked={overrideIsApproved} onChange={e => setOverrideIsApproved(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }} />
                        <label htmlFor="overrideApproved" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Seller Approved and Active</label>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" id="overrideEnrolledInGroupChat" checked={overrideEnrolledInGroupChat} onChange={e => setOverrideEnrolledInGroupChat(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }} />
                        <label htmlFor="overrideEnrolledInGroupChat" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Enrolled in Seller Chat Room</label>
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Save Profile Overrides
                </button>
              </form>

              {/* Direct Password Reset Form */}
              <form onSubmit={handleSaveOverridePassword}>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>⚠️</span> Direct Password Administration
                </h3>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>New Access Password</label>
                  <input 
                    className="input-field" 
                    type="password" 
                    placeholder="Enter new password directly" 
                    value={overrideNewPassword} 
                    onChange={e => setOverrideNewPassword(e.target.value)} 
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-danger" style={{ width: '100%' }}>
                  Force Reset Password Directly
                </button>
              </form>

              {/* Administrative Critical Actions */}
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px dashed rgba(239, 68, 68, 0.3)' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                  <span>🚨</span> CRITICAL DESTRUCTIVE OVERRIDES
                </h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {overrideUser.role === 'farmer' && (
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      onClick={() => handleResetSellerEarnings(overrideUser._id)}
                      style={{ flex: 1, borderColor: '#f97316', color: '#f97316', padding: '0.6rem 1rem', fontSize: '0.82rem', borderRadius: 'var(--radius-md)', fontWeight: 600, background: 'transparent', cursor: 'pointer' }}
                    >
                      💸 Reset Earnings to ৳0
                    </button>
                  )}
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={() => { deleteUser(overrideUser._id); setShowOverrideModal(false); }}
                    style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', padding: '0.6rem 1rem', fontSize: '0.82rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ❌ Delete Account Completely
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
