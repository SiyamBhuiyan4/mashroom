import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ProfilePanel from '../components/ProfilePanel';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { User, LogOut, Settings, BarChart3, Package, Coins, LayoutGrid, Camera, X, MessageSquare, Bell } from 'lucide-react';

const TAB = [
  { id: 'orders', icon: <Package size={18} />, label: 'Orders' },
  { id: 'ledger', icon: <Coins size={18} />, label: 'Revenue Ledger' },
  { id: 'analytics', icon: <BarChart3 size={18} />, label: 'Sales' },
  { id: 'support', icon: <MessageSquare size={18} />, label: 'Support' },
  { id: 'seller_chat', icon: <MessageSquare size={18} />, label: 'Seller Chat' },
  { id: 'gallery', icon: <LayoutGrid size={18} />, label: 'Showcase' },
  { id: 'prices', icon: <Coins size={18} />, label: 'Rates' },
  { id: 'notifications', icon: <Bell size={18} />, label: 'Notifications' },
];

const STATUS_COLORS = {
  'Order Pending': 'yellow', 'Order Confirmed': 'blue', 'Out for Delivery': 'purple',
  'Delivered': 'green', 'Cancelled': 'red', 'Rejected': 'red', 'Refunded': 'yellow'
};

const FarmerDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');
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
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [supportForm, setSupportForm] = useState({ subject: '', message: '', category: 'general', requestLat: '', requestLng: '', phone: user?.phone || '', email: user?.email || '' });
  const [supportQuota, setSupportQuota] = useState({ activeCount: 0, limit: 5, messages: [] });
  const [supportLoading, setSupportLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupInput, setGroupInput] = useState('');
  const [groupLoading, setGroupLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Redesign states for tracking updates and safety verification
  const [showPasswordModal, setShowPasswordModal] = useState(null); // { orderId, targetStatus } or null
  const [confirmPassword, setConfirmPassword] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { authHeader } = useContext(AuthContext);

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 3500); };

  const loadNotifications = () => {
    axios.get('/api/notifications', authHeader())
      .then(r => setNotifications(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  };

  const loadUnreadMessages = () => {
    axios.get('/api/messages/unread-count', authHeader())
      .then(r => setUnreadMessages(r.data.unreadCount || 0))
      .catch(() => {});
  };

  const markNotifRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`, {}, authHeader());
      loadNotifications();
    } catch {}
  };

  const markAllNotifsRead = async () => {
    try {
      await axios.post('/api/notifications/mark-all-read', {}, authHeader());
      loadNotifications();
      showMsg('All notifications marked as read.');
    } catch {}
  };

  const clearAllNotifs = async () => {
    try {
      await axios.post('/api/notifications/clear-all', {}, authHeader());
      loadNotifications();
      showMsg('All notifications cleared.');
    } catch {}
  };

  const clearNotif = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await axios.delete(`/api/notifications/${id}`, authHeader());
      loadNotifications();
      showMsg('Notification cleared.');
    } catch {}
  };

  useEffect(() => {
    loadUnreadMessages();
    loadNotifications();
    const interval = setInterval(() => {
      loadUnreadMessages();
      loadNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGetGPS = () => {
    setGpsLoading(true);
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSupportForm(prev => ({
          ...prev,
          subject: prev.subject || 'Location Update Request',
          requestLat: latitude,
          requestLng: longitude,
          message: prev.message || `Please update my farm marker location to GPS coordinates: Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`
        }));
        setGpsLoading(false);
        showMsg('✅ Precise coordinates captured successfully!');
      },
      (error) => {
        setGpsLoading(false);
        if (error.code === 1) {
          setGpsError('Location access denied. Please click the 🔒 lock icon in address bar to allow location permissions.');
        } else {
          setGpsError('Could not detect location: ' + error.message);
        }
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  useEffect(() => {
    loadOrders();
    loadAnalytics();
    loadSupportQuota();
    axios.get('/api/admin/products').then(r => setProducts(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  useEffect(() => { 
    if (tab === 'orders') loadOrders(); 
    if (tab === 'ledger') loadTransactions();
    if (tab === 'support') loadSupportQuota();
    if (tab === 'seller_chat') loadGroupMessages();
  }, [tab]);

  const loadGroupMessages = async () => {
    try {
      const { data } = await axios.get('/api/messages/group', authHeader());
      setGroupMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load community chat:', err);
    }
  };

  const sendGroupMessage = async (e) => {
    e.preventDefault();
    if (!groupInput.trim()) return;
    try {
      setGroupLoading(true);
      const { data } = await axios.post('/api/messages/group', { message: groupInput }, authHeader());
      setGroupMessages(prev => Array.isArray(prev) ? [...prev, data] : [data]);
      setGroupInput('');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to send message to community chat.', 'error');
    } finally {
      setGroupLoading(false);
    }
  };

  const loadTransactions = () => {
    axios.get('/api/transactions/my', authHeader()).then(r => setTransactions(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };

  const loadOrders = () => {
    if (!user?._id) return;
    axios.get(`/api/orders/farmer/${user._id}`).then(r => setOrders(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };

  const handleFarmerStatusUpdate = async (e) => {
    if (e) e.preventDefault();
    if (!confirmPassword.trim()) {
      setModalError('Password is required.');
      return;
    }
    setModalLoading(true);
    setModalError('');
    try {
      await axios.post(
        '/api/orders/update-status', 
        { 
          orderId: showPasswordModal.orderId, 
          status: showPasswordModal.targetStatus, 
          password: confirmPassword 
        }, 
        authHeader()
      );
      loadOrders();
      loadAnalytics();
      loadTransactions();
      setShowPasswordModal(null);
      setConfirmPassword('');
      showMsg('✅ Tracking status updated successfully!');
    } catch (err) {
      setModalError(err.response?.data?.message || 'Verification failed. Incorrect password.');
    } finally {
      setModalLoading(false);
    }
  };

  const loadAnalytics = () => {
    if (!user?._id) return;
    axios.get(`/api/analytics/farmer/${user._id}`)
      .then(r => setAnalytics(r.data && typeof r.data === 'object' ? r.data : { error: true }))
      .catch(() => setAnalytics({ error: true }));
  };

  const loadChatThread = async () => {
    try {
      const { data } = await axios.get('/api/messages/unified/thread', authHeader());
      setChatMessages(data && Array.isArray(data.messages) ? data.messages : []);
      loadUnreadMessages();
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const sendDirectMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      setChatLoading(true);
      const { data } = await axios.post('/api/messages/unified/send', { message: chatInput }, authHeader());
      setChatMessages(prev => Array.isArray(prev) ? [...prev, data] : [data]);
      setChatInput('');
      loadSupportQuota();
    } catch {
      showMsg('Failed to send message to admin.', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  const loadSupportQuota = () => {
    if (!user?._id) return;
    axios.get('/api/messages/support/my', authHeader())
      .then(r => {
        setSupportQuota(r.data && typeof r.data === 'object' ? r.data : {});
        loadChatThread();
      }).catch(() => {});
  };

  const sendSupportMessage = async (e) => {
    e.preventDefault();
    if (supportQuota.activeCount >= supportQuota.limit) return;
    setSupportLoading(true);
    try {
      const { data } = await axios.post('/api/messages/support', supportForm, authHeader());
      setSupportForm({ subject: '', message: '', category: 'general', requestLat: '', requestLng: '', phone: user?.phone || '', email: user?.email || '' });
      setSupportQuota(q => ({ ...q, activeCount: data.activeCount, messages: [data.data, ...q.messages] }));
      showMsg('Support request submitted!');
      loadSupportQuota();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed.', 'error');
    }
    setSupportLoading(false);
  };

  const handleGalleryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('image', file);

    setUploading(true);
    try {
      const { data } = await axios.post(`/api/auth/gallery/${user._id}`, fd, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          ...authHeader().headers
        }
      });
      showMsg('Photo added to showcase!');
      const updatedUser = { ...user, gallery: data.gallery };
      localStorage.setItem('mm_user', JSON.stringify(updatedUser));
      window.location.reload(); 
    } catch {
      showMsg('Upload failed', 'error');
    }
    setUploading(false);
  };

  const pendingOrders = orders.filter(o => !['Delivered', 'Cancelled', 'Rejected', 'Refunded'].includes(o.status));
  const completedOrders = orders.filter(o => ['Delivered'].includes(o.status));

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
          {(sidebarOpen || isMobile) && <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden' }}>Mashroom Magic</span>}
        </div>
        <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
          {TAB.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); if (isMobile) setSidebarOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: (sidebarOpen || isMobile) ? '0.75rem 1.25rem' : '0.75rem', background: tab === t.id ? 'rgba(34,197,94,0.12)' : 'transparent', border: 'none', color: tab === t.id ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer', borderLeft: tab === t.id ? '3px solid var(--color-primary)' : '3px solid transparent', transition: 'all 0.2s', fontSize: '0.9rem', fontFamily: 'var(--font-body)', textAlign: 'left', position: 'relative' }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0, display: 'flex', alignItems: 'center', position: 'relative' }}>
                {t.icon}
                {t.id === 'orders' && pendingOrders.length > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-6px', background: 'var(--color-warning)', color: '#000', borderRadius: '50%', width: '14px', height: '14px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {pendingOrders.length}
                  </span>
                )}
                {t.id === 'support' && unreadMessages > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-6px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '14px', height: '14px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {unreadMessages}
                  </span>
                )}
                {t.id === 'notifications' && notifications.filter(n => !n.read).length > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-6px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '14px', height: '14px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </span>
              {(sidebarOpen || isMobile) && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{t.label}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={() => { logout(); navigate('/'); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>
            <span>🚪</span>{(sidebarOpen || isMobile) && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', width: '100%' }}>
        {/* Top bar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(7,26,14,0.85)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isMobile && (
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ☰
              </button>
            )}
            <h2 style={{ fontSize: '1.2rem', margin: 0, fontFamily: 'var(--font-heading)' }}>
              {TAB.find(t => t.id === tab)?.label}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {msg.text && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: '0.85rem', color: msg.type === 'error' ? '#ef4444' : 'var(--color-primary)' }}>{msg.text}</motion.span>}
            
            <div style={{ position: 'relative' }}>
              <div className="avatar" onClick={() => setShowDropdown(!showDropdown)}>
                {user?.avatar ? <img src={user.avatar} alt="Avatar" /> : user?.name?.[0]?.toUpperCase()}
              </div>
              
              <AnimatePresence>
                {showDropdown && (
                  <>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} onClick={() => setShowDropdown(false)} />
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="profile-dropdown">
                      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.25rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{user?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.sellerCode || 'Farmer Account'}</div>
                      </div>
                      <button className="dropdown-item" onClick={() => { setIsProfileOpen(true); setShowDropdown(false); }}>
                        <Settings size={16} /> Farm Settings
                      </button>
                      <button className="dropdown-item" style={{ color: '#fca5a5' }} onClick={() => { logout(); navigate('/'); }}>
                        <LogOut size={16} /> Logout
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <ProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

        {/* Content */}
        <div style={{ flex: 1, padding: '1.5rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* ORDERS */}
            {tab === 'orders' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ padding: '0.5rem 1rem', background: 'rgba(34,197,94,0.08)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Active: </span><strong style={{ color: 'var(--color-primary)' }}>{pendingOrders.length}</strong>
                    </div>
                    <div style={{ padding: '0.5rem 1rem', background: 'rgba(34,197,94,0.08)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Completed: </span><strong style={{ color: 'var(--color-accent)' }}>{completedOrders.length}</strong>
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={loadOrders}>🔄 Refresh</button>
                </div>

                {orders.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>No orders assigned to you yet.</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Make sure your farm location is set so the admin can assign you nearby orders.</p>
                    <button className="btn btn-outline btn-sm" style={{ marginTop: '1rem' }} onClick={() => setTab('location')}>Set My Location →</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {orders.map(o => (
                      <motion.div key={o._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <h4 style={{ marginBottom: '0.25rem' }}>🛒 Order from {o.buyerName}</h4>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{o.buyerPhone}</div>
                          </div>
                          <span className={`badge badge-${STATUS_COLORS[o.status] || 'blue'}`}>{o.status}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div className="stat-card" style={{ padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product</div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>🍄 {o.productName}</div>
                          </div>
                          <div className="stat-card" style={{ padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantity</div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{o.quantity} kg</div>
                          </div>
                          <div className="stat-card" style={{ padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approved Earnings</div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: o.isEarningApproved ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                              {o.status === 'Delivered' ? (
                                o.isEarningApproved ? `৳${o.approvedEarnings || 0}` : '⏳ Pending Review'
                              ) : (
                                '⏳ Pending Delivery'
                              )}
                            </div>
                          </div>
                          {o.deliveryAddress && (
                            <div className="stat-card" style={{ padding: '0.75rem', gridColumn: 'span 2' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery To</div>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>📍 {o.deliveryAddress}</div>
                            </div>
                          )}
                        </div>

                        {/* Order Tracking Actions */}
                        {o.status === 'Delivered' ? (
                          <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span>✅</span> Delivery Complete
                            </span>
                            <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>Permission Revoked</span>
                          </div>
                        ) : (
                          <div style={{ marginTop: '1rem', marginBottom: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span>📍</span> Update Tracking Status (Security Required):
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {['Preparing', 'Packed', 'Out for Delivery', 'Delivered'].map(status => {
                                const isCurrent = o.status === status;
                                return (
                                  <button 
                                    key={status} 
                                    className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setShowPasswordModal({ orderId: o._id, targetStatus: status })}
                                    disabled={isCurrent}
                                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                                  >
                                    {isCurrent ? `● ${status}` : status}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                          Ordered: {new Date(o.createdAt).toLocaleString()}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* LEDGER TAB */}
            {tab === 'ledger' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.8rem' }}>💰</span> Revenue Ledger
                  </h3>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>This ledger displays official revenue records and manually recorded transactions managed by the marketplace administrators.</p>
                  
                  {transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>No revenue records found.</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem' }}>Date</th>
                            <th style={{ padding: '1rem' }}>Amount</th>
                            <th style={{ padding: '1rem' }}>Note/Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map(txn => (
                            <tr key={txn._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-main)' }}>
                              <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>{new Date(txn.createdAt).toLocaleDateString()}</td>
                              <td style={{ padding: '1rem', fontWeight: 600, color: txn.amount >= 0 ? '#10b981' : '#ef4444' }}>{txn.amount >= 0 ? '+' : ''}৳{txn.amount}</td>
                              <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{txn.note || 'Manual Revenue Addition'} {txn.referenceId ? `(Ref: ${txn.referenceId})` : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ANALYTICS */}
            {tab === 'analytics' && (
              !analytics ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid rgba(34,197,94,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading Insights...</p>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              ) : analytics.error ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                  <p style={{ color: 'var(--text-muted)' }}>Could not load insights at this time.</p>
                  <button className="btn btn-outline btn-sm" style={{ marginTop: '1rem' }} onClick={loadAnalytics}>🔄 Retry</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                    <div className="stat-card">
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Sold</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>{analytics.totalSold} kg</div>
                    </div>
                    <div className="stat-card">
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Revenue</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>৳{analytics.totalRevenue}</div>
                    </div>
                    <div className="stat-card">
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Success Rate</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-accent)' }}>{analytics.deliverySuccessRate.toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Sales Performance</h3>
                    <div style={{ width: '100%', height: '300px' }}>
                      <ResponsiveContainer>
                        <AreaChart data={analytics.salesData}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                          <YAxis stroke="var(--text-muted)" fontSize={12} />
                          <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} />
                          <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* SUPPORT */}
            {tab === 'support' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem', alignItems: 'flex-start' }}>
                
                {/* INBOX SECTION */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '520px' }}>
                    <h3 style={{ marginBottom: '0.4rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>💬</span> Official Chat with Admin
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                      Send direct private messages and coordinate active support tickets with the administrator.
                    </p>

                    {/* Chat History Panel */}
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      maxHeight: '420px',
                      minHeight: '340px',
                      overflowY: 'auto',
                      padding: '1rem',
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      marginBottom: '1rem'
                    }}>
                      {chatMessages.length === 0 ? (
                        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💬</div>
                          <p style={{ fontSize: '0.85rem' }}>No direct messages yet. Send a message below to start chatting with the Admin!</p>
                        </div>
                      ) : (
                        chatMessages.map(m => {
                          const isAdmin = m.senderRole === 'admin';
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
                                    <strong style={{ color: '#f97316' }}>🆘 Support Ticket Ingested</strong>
                                    <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                                    Subject: {m.subject}
                                  </div>
                                  <div style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.15)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                                    {m.message}
                                  </div>
                                  {m.category === 'location_update' && m.requestLat && m.requestLng && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                                      📍 Coordinates requested: Lat {m.requestLat} · Lng {m.requestLng}
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.75rem', opacity: 0.8 }}>
                                    <span>Category: <span style={{ textTransform: 'capitalize' }}>{m.category?.replace('_', ' ')}</span></span>
                                    <span>•</span>
                                    <span>Phone: {m.phone}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={m._id} style={{
                              alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                              maxWidth: '75%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isAdmin ? 'flex-start' : 'flex-end'
                            }}>
                              {/* Sender Badge */}
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem', padding: '0 0.25rem' }}>
                                {isAdmin ? '👑 Admin' : 'You'} • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              {/* Chat Bubble */}
                              <div style={{
                                background: isAdmin ? 'rgba(255, 255, 255, 0.05)' : 'var(--color-primary)',
                                border: isAdmin ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                color: isAdmin ? 'var(--text-main)' : '#000000',
                                fontWeight: isAdmin ? 400 : 500,
                                padding: '0.75rem 1.1rem',
                                borderRadius: isAdmin ? '0px 12px 12px 12px' : '12px 0px 12px 12px',
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

                    {/* Quick Reply Form */}
                    <form onSubmit={sendDirectMessage} style={{ display: 'flex', gap: '0.75rem' }}>
                      <input
                        className="input-field"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Type your message to the administrator..."
                        required
                        style={{ flex: 1, margin: 0 }}
                        disabled={chatLoading}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={chatLoading}
                        style={{ padding: '0 1.25rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        {chatLoading ? 'Sending...' : '📤 Send'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* FORMS & LOCATION INFO SECTION */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {/* Location info — read-only */}
                  <div className="glass-panel" style={{ padding: '1.5rem', borderColor: 'rgba(251,146,60,0.2)' }}>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>📍 Farm Location</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.7 }}>
                      Your farm location is <strong>assigned by the admin</strong> and cannot be changed by you directly.
                      If your location needs to be updated, please submit a support request below.
                    </p>
                    {user?.locationSet ? (
                      <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.07)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>✅</span> Location assigned — you will receive nearby orders.
                      </div>
                    ) : (
                      <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        ⚠️ Location not yet assigned by admin. Contact support if needed.
                      </div>
                    )}
                  </div>

                  {/* Support Request Form */}
                  <div className="glass-panel" style={{ padding: '2rem', borderColor: 'rgba(251,146,60,0.25)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <h3 style={{ fontSize: '1.05rem' }}>🆘 Support Request</h3>
                      <span style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', background: supportQuota.activeCount >= supportQuota.limit ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: supportQuota.activeCount >= supportQuota.limit ? '#ef4444' : 'var(--color-primary)', borderRadius: '20px', border: `1px solid ${supportQuota.activeCount >= supportQuota.limit ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)'}` }}>
                        {supportQuota.activeCount}/{supportQuota.limit} active
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Need password help, location update, or other assistance?</p>
                    {supportQuota.activeCount >= supportQuota.limit ? (
                      <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        ⛔ Max {supportQuota.limit} active requests reached. Wait for admin to resolve them.
                      </div>
                    ) : (
                      <form onSubmit={sendSupportMessage}>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Category</label>
                          <select className="input-field" value={supportForm.category} onChange={e => setSupportForm({ ...supportForm, category: e.target.value })}>
                            <option value="password_recovery">🔑 Password Recovery</option>
                            <option value="location_update">📍 Location Update Request</option>
                            <option value="account_issue">👤 Account Issue</option>
                            <option value="general">💬 General Help</option>
                          </select>
                        </div>
                        
                        {supportForm.category === 'location_update' && (
                          <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(249,115,22,0.06)', border: '1px dashed rgba(249,115,22,0.25)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>📍 High-Precision Geolocation</span>
                              <button type="button" className="btn btn-outline btn-xs" onClick={handleGetGPS} disabled={gpsLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', height: '24px', fontSize: '0.72rem' }}>
                                {gpsLoading ? '⏳ Detecting GPS...' : '📡 Capture Current GPS'}
                              </button>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                              Provide exact coordinates so the administrator can visually plot your farm nodes on the interactive marketplace map.
                            </p>
                            
                            {gpsError && (
                              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                                ⚠️ {gpsError}
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latitude *</label>
                                <input className="input-field" type="number" step="any" value={supportForm.requestLat} onChange={e => setSupportForm({ ...supportForm, requestLat: e.target.value })} placeholder="e.g. 23.6850" required style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }} />
                              </div>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Longitude *</label>
                                <input className="input-field" type="number" step="any" value={supportForm.requestLng} onChange={e => setSupportForm({ ...supportForm, requestLng: e.target.value })} placeholder="e.g. 90.3563" required style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }} />
                              </div>
                            </div>
                          </div>
                        )}

                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered Phone Number *</label>
                          <input className="input-field" value={supportForm.phone} onChange={e => setSupportForm({ ...supportForm, phone: e.target.value })} required />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email Address *</label>
                          <input className="input-field" type="email" value={supportForm.email} onChange={e => setSupportForm({ ...supportForm, email: e.target.value })} placeholder="you@example.com" required />
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                            Admin will send feedback or updates using your provided email address.
                          </p>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Subject *</label>
                          <input className="input-field" value={supportForm.subject} onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })} placeholder="Briefly describe your issue" required />
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Message * (max 1000)</label>
                            <span style={{ fontSize: '0.75rem', color: supportForm.message.length > 900 ? '#ef4444' : 'var(--text-muted)' }}>{supportForm.message.length}/1000</span>
                          </div>
                          <textarea className="input-field" rows={4} maxLength={1000} value={supportForm.message} onChange={e => setSupportForm({ ...supportForm, message: e.target.value })} placeholder="Provide full details..." required style={{ resize: 'vertical' }} />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={supportLoading} style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', borderColor: 'transparent', marginTop: '0.75rem' }}>
                          {supportLoading ? 'Submitting...' : '🆘 Submit Request'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* SELLER CHAT */}
            {tab === 'seller_chat' && (
              <div>
                {user?.enrolledInGroupChat === false ? (
                  <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                    <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Access Restricted</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '460px', margin: '0 auto' }}>
                      You are not currently enrolled in the Seller Community Chat. Please submit a support ticket or contact the administrator to be enrolled.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '1.5rem', height: 'calc(100vh - 280px)', minHeight: '520px', alignItems: 'stretch' }}>
                    
                    {/* Main Chat Panel */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                      
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
                          gap: '0.5rem'
                        }}>
                          <span style={{ fontSize: '1.1rem' }}>📌</span>
                          <div>
                            <strong style={{ color: '#f97316' }}>Announcement: </strong>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {groupMessages.find(m => m.pinned)?.message}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Messages Flow */}
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem', marginBottom: '1rem' }}>
                        {groupMessages.map(m => {
                          const isMe = m.senderId === user?._id;
                          const isAdmin = m.senderRole === 'admin';

                          return (
                            <div key={m._id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                              {/* Avatar */}
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: isAdmin ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.08)',
                                border: isAdmin ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                                color: isAdmin ? '#000000' : 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.82rem',
                                flexShrink: 0
                              }}>
                                {isAdmin ? '👑' : m.senderName?.[0]?.toUpperCase() || 'S'}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                {/* Sender Info */}
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                  <strong style={{ color: isAdmin ? 'var(--color-primary)' : 'var(--text-main)' }}>{m.senderName}</strong>
                                  {m.senderDistrict && <span style={{ opacity: 0.7 }}>({m.senderDistrict})</span>}
                                  <span>•</span>
                                  <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💬</div>
                            <p style={{ fontSize: '0.85rem' }}>Welcome to the Seller Community! Send the first message to say hi.</p>
                          </div>
                        )}
                      </div>

                      {/* Message Input Footer */}
                      <form onSubmit={sendGroupMessage} style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                        <input
                          className="input-field"
                          value={groupInput}
                          onChange={e => setGroupInput(e.target.value)}
                          placeholder="Share updates, advice, or coordinate rates..."
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
                          {groupLoading ? 'Sending...' : '📤 Send'}
                        </button>
                      </form>
                    </div>

                    {/* Sidebar Community Members Info Panel */}
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>👥 Active Members</h4>
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* Unique member names derived from group messages */}
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
              </div>
            )}

            {/* GALLERY */}
            {tab === 'gallery' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-main)' }}>Farm Showcase</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload photos of your farm and harvest to attract buyers.</p>
                  </div>
                  <label className="btn btn-primary btn-sm" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
                    <Camera size={16} /> {uploading ? 'Uploading...' : 'Add Photo'}
                    <input type="file" hidden accept="image/*" onChange={handleGalleryUpload} disabled={uploading} />
                  </label>
                </div>

                {user?.gallery?.length > 0 ? (
                  <div className="gallery-grid">
                    {user.gallery.map((img, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="gallery-item">
                        <img src={img} alt={`Gallery ${idx}`} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', borderStyle: 'dashed' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📸</div>
                    <p style={{ color: 'var(--text-muted)' }}>No photos uploaded yet. Start building your showcase!</p>
                  </div>
                )}
              </div>
            )}

            {/* PRICES */}
            {tab === 'prices' && (
              <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-muted)' }}>Today's Market Prices (Admin Set)</h3>
                {products.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)' }}>No prices have been set today.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                    {products.map(p => (
                      <motion.div key={p._id} whileHover={{ y: -4 }} className="stat-card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🍄</div>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{p.name}</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}>৳{p.price}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>per kg</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                          {new Date(p.setAt || p.updatedAt).toLocaleDateString()}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NOTIFICATIONS */}
            {tab === 'notifications' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🔔 My Notifications
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="badge badge-red">{notifications.filter(n => !n.read).length} new</span>
                    )}
                  </h3>
                  {Array.isArray(notifications) && notifications.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={markAllNotifsRead} style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--color-primary)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}>Mark all read</button>
                      <button onClick={clearAllNotifs} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}>Clear all</button>
                    </div>
                  )}
                </div>

                {!Array.isArray(notifications) || notifications.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🔔</div>
                    <p style={{ color: 'var(--text-muted)' }}>No notifications yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {notifications.map(n => (
                      <div key={n._id} onClick={() => markNotifRead(n._id)}
                        style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '0.5rem' : '0', padding: '1rem 1.25rem', background: n.read ? 'transparent' : 'rgba(34,197,94,0.06)', border: '1px solid', borderColor: n.read ? 'rgba(255,255,255,0.04)' : 'rgba(34,197,94,0.15)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <div style={{ width: isMobile ? '100%' : 'auto' }}>
                          <div style={{ fontWeight: n.read ? 500 : 700, fontSize: '0.95rem', color: n.read ? 'var(--text-main)' : 'var(--color-primary)' }}>{n.title}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{n.message}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end', marginTop: isMobile ? '0.25rem' : '0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {!n.read && <div className="pulse-green" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }} />}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                          </div>
                          <button onClick={(e) => clearNotif(n._id, e)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.95rem', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }} title="Clear notification">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* PASSWORD CONFIRMATION MODAL */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '2rem', border: '1px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.75rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔒</span> Confirm Status Update
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              You are updating Order <strong>#{showPasswordModal.orderId.substring(0, 8)}...</strong> status to <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>{showPasswordModal.targetStatus}</span>. 
              Please verify your seller account password to submit.
            </p>
            
            <form onSubmit={handleFarmerStatusUpdate}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Your Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Enter your security password..." 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required
                  autoFocus
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)' }}
                />
              </div>

              {modalError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                  ❌ {modalError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm" 
                  onClick={() => {
                    setShowPasswordModal(null);
                    setConfirmPassword('');
                    setModalError('');
                  }}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Verifying...' : '🔑 Confirm & Save'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  </div>
  );
};

export default FarmerDashboard;
