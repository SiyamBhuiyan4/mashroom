import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import BangladeshMap from '../components/BangladeshMap';
import ProfilePanel from '../components/ProfilePanel';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { User, LogOut, Settings, BarChart3, Package, ShoppingCart, MessageSquare, Map as MapIcon, LifeBuoy, Bell } from 'lucide-react';

const TAB = [
  { id: 'market', icon: <ShoppingCart size={18} />, label: 'Market' },
  { id: 'orders', icon: <Package size={18} />, label: 'My Orders' },
  { id: 'ledger', icon: <BarChart3 size={18} />, label: 'Spending Ledger' },
  { id: 'analytics', icon: <BarChart3 size={18} />, label: 'Insights' },
  { id: 'map', icon: <MapIcon size={18} />, label: 'Find Farmers' },
  { id: 'contact', icon: <MessageSquare size={18} />, label: 'Contact' },
  { id: 'notifications', icon: <Bell size={18} />, label: 'Notifications' },
];

const STATUS_STEPS = ['Order Pending', 'Order Confirmed', 'Out for Delivery', 'Delivered'];
const STATUS_COLORS = {
  'Order Pending': 'yellow', 'Order Confirmed': 'blue', 'Out for Delivery': 'purple',
  'Delivered': 'green', 'Cancelled': 'red', 'Rejected': 'red', 'Refunded': 'yellow'
};

const MUSHROOM_EMOJI = {
  'Oyster Mushroom': '🍄',
  'Shiitake Mushroom': '🍄',
  'Button Mushroom': '⚪',
  'Milky Mushroom': '🤍',
  'Straw Mushroom': '🌾',
};

const BuyerDashboard = () => {
  const { user, logout, authHeader } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tab, setTab] = useState('market');
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
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [orderForm, setOrderForm] = useState({ productId: '', quantity: 1, deliveryAddress: '', preferredSellerId: '', preferenceMessage: '' });
  const [preferredSellerName, setPreferredSellerName] = useState('');
  const [contactForm, setContactForm] = useState({ subject: '', message: '' });
  const [supportForm, setSupportForm] = useState({ subject: '', message: '', category: 'general', phone: user?.phone || '', email: user?.email || '' });
  const [supportQuota, setSupportQuota] = useState({ activeCount: 0, limit: 5, messages: [] });
  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locPermission, setLocPermission] = useState('unknown');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

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

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3500);
  };

  useEffect(() => {
    axios.get('/api/admin/products').then(r => setProducts(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    loadOrders();
    loadAnalytics();
    loadSupportQuota();
    // Check location permission state
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(p => {
        setLocPermission(p.state);
        p.onchange = () => setLocPermission(p.state);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => { 
    if (tab === 'orders') loadOrders(); 
    if (tab === 'ledger') loadTransactions();
    if (tab === 'contact') loadSupportQuota();
  }, [tab]);

  const loadTransactions = () => {
    axios.get('/api/transactions/my', authHeader()).then(r => setTransactions(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };

  const loadOrders = () => {
    if (!user?._id) return;
    axios.get(`/api/orders/buyer/${user._id}`).then(r => setOrders(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };

  const loadAnalytics = () => {
    if (!user?._id) return;
    axios.get(`/api/analytics/buyer/${user._id}`)
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
      setChatMessages(prev => [...prev, data]);
      setChatInput('');
      loadSupportQuota();
    } catch {
      showMsg('Failed to send message to admin.', 'error');
    } finally {
      setChatLoading(false);
    }
  };

  const loadSupportQuota = async () => {
    if (!user?._id) return;
    try {
      const supportRes = await axios.get('/api/messages/support/my', authHeader());
      setSupportQuota(supportRes.data && typeof supportRes.data === 'object' ? supportRes.data : {});
      
      const generalRes = await axios.get('/api/messages');
      const generalData = Array.isArray(generalRes.data) ? generalRes.data : [];
      const filteredGeneral = generalData
        .filter(m => m.buyerId === user._id)
        .map(m => ({ ...m, isGeneral: true }));
      
      const supportMsgs = supportRes.data && Array.isArray(supportRes.data.messages) ? supportRes.data.messages : [];
      const supportMapped = supportMsgs.map(m => ({ ...m, isSupport: true }));
      
      const merged = [...supportMapped, ...filteredGeneral].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAllMessages(merged);
      
      await loadChatThread();
    } catch {}
  };

  const selectProduct = (p) => {
    setOrderForm(prev => ({ ...prev, productId: p._id }));
    document.getElementById('order-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const useMyLocation = async () => {
    if (!navigator.geolocation) return showMsg('Geolocation is not supported by your browser.', 'error');

    // Pre-check permission state
    if (locPermission === 'denied') {
      return showMsg('Location access is blocked. Please enable it in your browser settings (🔒 icon in address bar) and reload.', 'error');
    }

    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocPermission('granted');
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`
          );
          const data = await res.json();
          const addr = data.address;
          const parts = [
            addr.village || addr.suburb || addr.neighbourhood || addr.town,
            addr.county || addr.upazila || addr.state_district,
            addr.state || addr.city,
          ].filter(Boolean);
          const addressStr = parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',');
          setOrderForm(prev => ({ ...prev, deliveryAddress: addressStr }));
          showMsg('✅ Location detected and filled in!');
        } catch {
          setOrderForm(prev => ({ ...prev, deliveryAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
          showMsg('Location set (address name could not be resolved).', 'error');
        }
        setLocLoading(false);
      },
      (err) => {
        setLocLoading(false);
        if (err.code === 1) { // PERMISSION_DENIED
          setLocPermission('denied');
          showMsg('Location access denied. Enable it via browser settings (🔒 icon) and reload the page.', 'error');
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          showMsg('Location unavailable. Check your device\'s GPS or network.', 'error');
        } else { // TIMEOUT
          showMsg('Location request timed out. Please try again.', 'error');
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.productId) return showMsg('Please select a mushroom first.', 'error');
    if (!orderForm.deliveryAddress.trim()) return showMsg('Please enter a delivery address.', 'error');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/orders', {
        ...orderForm, buyerId: user._id, quantity: Number(orderForm.quantity)
      });
      setOrderSuccess(data);
      setOrderForm({ productId: '', quantity: 1, deliveryAddress: '', preferredSellerId: '', preferenceMessage: '' });
      setPreferredSellerName('');
      loadOrders();
    } catch (e) {
      showMsg(e.response?.data?.message || 'Order failed', 'error');
    }
    setLoading(false);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/messages', {
        buyerId: user._id, buyerName: user.name, buyerPhone: user.phone,
        subject: contactForm.subject, message: contactForm.message
      });
      setContactForm({ subject: '', message: '' });
      showMsg('Message sent to admin successfully!');
      loadSupportQuota();
    } catch {
      showMsg('Failed to send message', 'error');
    }
    setLoading(false);
  };

  const sendSupportMessage = async (e) => {
    e.preventDefault();
    if (supportQuota.activeCount >= supportQuota.limit) return;
    setSupportLoading(true);
    try {
      const { data } = await axios.post('/api/messages/support', supportForm, authHeader());
      setSupportForm({ subject: '', message: '', category: 'general', phone: user?.phone || '', email: user?.email || '' });
      setSupportQuota(q => ({ ...q, activeCount: data.activeCount, messages: [data.data, ...q.messages] }));
      showMsg('Support request submitted! Admin will review it.');
      loadSupportQuota();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to send support request.', 'error');
    }
    setSupportLoading(false);
  };

  const selectedProduct = products.find(p => p._id === orderForm.productId);
  const subtotal = selectedProduct ? selectedProduct.price * Number(orderForm.quantity) : 0;

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
                {t.id === 'contact' && unreadMessages > 0 && (
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
                {user?.avatar ? <img src={user.avatar} alt="Avatar" /> : <img src="https://upload.wikimedia.org/wikipedia/commons/f/f9/Flag_of_Bangladesh.svg" alt="Avatar" />}
              </div>
              
              <AnimatePresence>
                {showDropdown && (
                  <>
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} onClick={() => setShowDropdown(false)} />
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="profile-dropdown">
                      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.25rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{user?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Buyer Account</div>
                      </div>
                      <button className="dropdown-item" onClick={() => { setIsProfileOpen(true); setShowDropdown(false); }}>
                        <Settings size={16} /> Profile Settings
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
        <div style={{ flex: 1, padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* LEDGER TAB */}
            {tab === 'ledger' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.8rem' }}>💰</span> Financial Ledger
                  </h3>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>This ledger displays official spending records managed by the marketplace administrators.</p>
                  
                  {transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>No spending records found.</div>
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
                              <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{txn.note || 'Manual Adjustment'} {txn.referenceId ? `(Ref: ${txn.referenceId})` : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MARKET */}
            {tab === 'market' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                {/* Mushroom cards — click to select */}
                <div>
                  <h3 style={{ marginBottom: '0.4rem', fontSize: '1rem', color: 'var(--text-muted)' }}>Available Mushrooms</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.7 }}>Tap a mushroom to select and order it →</p>

                  {products.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🍄</div>
                      <p style={{ color: 'var(--text-muted)' }}>No mushrooms listed yet. Check back soon.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {products.map(p => {
                        const isSelected = orderForm.productId === p._id;
                        return (
                          <motion.div
                            key={p._id}
                            whileHover={{ x: 4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => selectProduct(p)}
                            style={{
                              padding: '1rem 1.25rem', cursor: 'pointer',
                              background: isSelected ? 'rgba(34,197,94,0.15)' : 'rgba(13,36,22,0.8)',
                              border: `2px solid ${isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.07)'}`,
                              borderRadius: 'var(--radius-lg)',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              transition: 'all 0.2s',
                              boxShadow: isSelected ? '0 0 16px rgba(34,197,94,0.2)' : 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '2rem' }}>{MUSHROOM_EMOJI[p.name] || '🍄'}</span>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? 'var(--color-primary)' : 'var(--text-main)' }}>{p.name}</div>
                                {p.nameBn && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.nameBn}</div>}
                                {p.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{p.description}</div>}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}>৳{p.price}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>per kg</div>
                              {isSelected && <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', marginTop: '0.2rem', fontWeight: 700 }}>✓ Selected</div>}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Order form */}
                <div id="order-form-panel">
                  <h3 style={{ marginBottom: '0.4rem', fontSize: '1rem', color: 'var(--text-muted)' }}>Place an Order</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.7 }}>← Select a mushroom from the list first</p>

                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    {orderSuccess ? (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
                        <h4 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Order Placed!</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                          Your order for {orderSuccess.quantity}kg of {orderSuccess.productName} has been submitted.
                        </p>
                        <div style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.08)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                          Total: <strong style={{ color: 'var(--color-primary)' }}>৳{orderSuccess.totalCost}</strong>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => { setOrderSuccess(null); setTab('orders'); }}>Track My Order →</button>
                        <button className="btn btn-outline btn-sm" style={{ marginLeft: '0.5rem' }} onClick={() => setOrderSuccess(null)}>Order Again</button>
                      </motion.div>
                    ) : (
                      <form onSubmit={placeOrder}>

                        {/* Selected mushroom display */}
                        <div style={{ marginBottom: '1.25rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Selected Mushroom</label>
                          {selectedProduct ? (
                            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                              style={{ padding: '0.85rem 1rem', background: 'rgba(34,197,94,0.1)', border: '1.5px solid var(--color-primary)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>{MUSHROOM_EMOJI[selectedProduct.name] || '🍄'}</span>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedProduct.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>৳{selectedProduct.price} / kg</div>
                                </div>
                              </div>
                              <button type="button" onClick={() => setOrderForm(f => ({ ...f, productId: '' }))}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                            </motion.div>
                          ) : (
                            <div style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.12)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center' }}>
                              ← Click any mushroom on the left to select
                            </div>
                          )}
                        </div>

                        {/* Quantity */}
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Quantity (kg) *</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button type="button" onClick={() => setOrderForm(f => ({ ...f, quantity: Math.max(1, Number(f.quantity) - 1) }))}
                              style={{ width: '36px', height: '36px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <input className="input-field" type="number" min="1" max="1000" value={orderForm.quantity}
                              onChange={e => setOrderForm(f => ({ ...f, quantity: e.target.value }))}
                              style={{ textAlign: 'center', flex: 1 }} required />
                            <button type="button" onClick={() => setOrderForm(f => ({ ...f, quantity: Math.min(1000, Number(f.quantity) + 1) }))}
                              style={{ width: '36px', height: '36px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                          </div>
                        </div>

                        {/* Delivery address with geolocation */}
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Delivery Address *</label>
                            <button type="button" onClick={useMyLocation} disabled={locLoading}
                              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: locLoading ? 'wait' : 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0, fontFamily: 'var(--font-body)' }}>
                              {locLoading ? '⏳ Getting location...' : '📍 Use my location'}
                            </button>
                          </div>
                          <input className="input-field" value={orderForm.deliveryAddress}
                            onChange={e => setOrderForm(f => ({ ...f, deliveryAddress: e.target.value }))}
                            placeholder="Village, Upazila, District" required />
                        </div>

                        {/* Marketplace Farm Preference */}
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Marketplace Farm Preference</label>
                          {orderForm.preferredSellerId ? (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                              style={{ padding: '0.75rem', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                  🎯 Preferred: {preferredSellerName}
                                </span>
                                <button type="button" onClick={() => { setOrderForm(f => ({ ...f, preferredSellerId: '' })); setPreferredSellerName(''); }}
                                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>Clear</button>
                              </div>
                              <input className="input-field" value={orderForm.preferenceMessage} 
                                onChange={e => setOrderForm(f => ({ ...f, preferenceMessage: e.target.value }))}
                                placeholder="Add custom delivery/farm preference note..." style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem' }} />
                            </motion.div>
                          ) : (
                            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                              💡 Tip: Go to <strong>Find Farmers</strong> map tab, click any marker, and choose a preferred farm to auto-apply priority dispatch!
                            </div>
                          )}
                        </div>

                        {/* Subtotal */}
                        {selectedProduct && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.06)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{orderForm.quantity} kg × ৳{selectedProduct.price}</span>
                              <strong style={{ color: 'var(--color-primary)' }}>৳{subtotal}</strong>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              + Delivery charge added by admin after review
                            </div>
                          </motion.div>
                        )}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || !orderForm.productId}>
                          {loading ? 'Placing Order...' : '🛒 Place Order'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ORDERS */}
            {tab === 'orders' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>My Orders ({orders.length})</h3>
                  <button className="btn btn-outline btn-sm" onClick={loadOrders}>🔄 Refresh</button>
                </div>
                {orders.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>You haven't placed any orders yet.</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setTab('market')}>Browse Market →</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {orders.map(o => {
                      const stepIdx = STATUS_STEPS.indexOf(o.status);
                      const isCancelled = ['Cancelled', 'Rejected', 'Refunded'].includes(o.status);
                      return (
                        <motion.div key={o._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '1.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                            <div>
                              <h4 style={{ marginBottom: '0.25rem' }}>🍄 {o.productName}</h4>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{o.quantity} kg · ৳{o.totalCost}{o.deliveryCharge > 0 ? ` + ৳${o.deliveryCharge} delivery` : ''}</div>
                              {o.deliveryAddress && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 {o.deliveryAddress}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span className={`badge badge-${STATUS_COLORS[o.status] || 'blue'}`}>{o.status}</span>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                          {!isCancelled && (
                            <div style={{ position: 'relative' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                                {STATUS_STEPS.map((s, i) => (
                                  <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: i <= stepIdx ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)', border: i === stepIdx ? '3px solid var(--color-accent)' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: i <= stepIdx ? '#fff' : 'var(--text-muted)', transition: 'all 0.3s', boxShadow: i === stepIdx ? '0 0 12px rgba(34,197,94,0.5)' : 'none' }}>
                                      {i < stepIdx ? '✓' : i + 1}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: i <= stepIdx ? 'var(--text-main)' : 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center', lineHeight: 1.2 }}>{s.replace('Order ', '')}</div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ position: 'absolute', top: '13px', left: '14px', right: '14px', height: '2px', background: 'rgba(255,255,255,0.06)', zIndex: 0 }}>
                                <div style={{ width: `${stepIdx > 0 ? (stepIdx / (STATUS_STEPS.length - 1)) * 100 : 0}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.5s', borderRadius: '2px' }} />
                              </div>
                            </div>
                          )}
                          {o.farmerName && (
                            <div style={{ marginTop: '1rem', padding: '0.6rem 0.75rem', background: 'rgba(34,197,94,0.06)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                              Assigned Farmer: <strong style={{ color: 'var(--color-primary)' }}>{o.farmerName}</strong>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
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
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Orders</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>{analytics.totalOrders}</div>
                    </div>
                    <div className="stat-card">
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Spent</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>৳{analytics.totalSpent}</div>
                    </div>
                    <div className="stat-card">
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Completed</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-accent)' }}>{analytics.completedOrders}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Order Activity</h3>
                      <div style={{ width: '100%', height: '250px' }}>
                        <ResponsiveContainer>
                          <LineChart data={analytics.activityData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} />
                            <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} />
                            <Line type="monotone" dataKey="orders" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Purchase History</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {analytics.recentOrders.map(o => (
                          <div key={o._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{o.productName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>৳{o.totalCost}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* MAP */}
            {tab === 'map' && (
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>🗺️ Mushroom Farmers Near You</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Browse verified mushroom farmers across Bangladesh. Click any marker for details and choose a preferred seller.
                  </p>
                </div>
                <BangladeshMap 
                  height="500px" 
                  selectedPreferredSellerId={orderForm.preferredSellerId}
                  onSelectPreferredSeller={(seller) => {
                    setOrderForm(f => ({ ...f, preferredSellerId: seller._id }));
                    setPreferredSellerName(seller.farmName || seller.name);
                    showMsg(`🎯 Pre-selected: ${seller.farmName || seller.name}. Go to 'Market' tab to order!`);
                  }}
                />
              </div>
            )}

            {/* CONTACT */}
            {tab === 'contact' && (
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

                {/* FORMS SECTION */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* General Message */}
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '0.4rem', fontSize: '1.05rem' }}>💬 General Message</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>For bulk orders, custom requests, or general inquiries.</p>
                    {msg.text && msg.type !== 'error' && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{msg.text}</div>}
                    <form onSubmit={sendMessage}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Subject *</label>
                        <input className="input-field" value={contactForm.subject} onChange={e => setContactForm({ ...contactForm, subject: e.target.value })} placeholder="e.g. Bulk order inquiry" required />
                      </div>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Message *</label>
                        <textarea className="input-field" rows={4} value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} placeholder="Describe your requirement..." required style={{ resize: 'vertical' }} />
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Sending...' : '📤 Send Message'}</button>
                    </form>
                  </div>

                  {/* Support / Password Recovery Queue */}
                  <div className="glass-panel" style={{ padding: '2rem', borderColor: 'rgba(251,146,60,0.25)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <h3 style={{ fontSize: '1.05rem' }}>🆘 Support Request</h3>
                      <span style={{ fontSize: '0.78rem', padding: '0.25rem 0.65rem', background: supportQuota.activeCount >= supportQuota.limit ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: supportQuota.activeCount >= supportQuota.limit ? '#ef4444' : 'var(--color-primary)', borderRadius: '20px', border: `1px solid ${supportQuota.activeCount >= supportQuota.limit ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.2)'}` }}>
                        {supportQuota.activeCount}/{supportQuota.limit} active
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                      Forgot your password or need account help? Submit a request — admin will assist you.
                    </p>
                    {supportQuota.activeCount >= supportQuota.limit ? (
                      <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        ⛔ You have reached the maximum of <strong>{supportQuota.limit} active</strong> support requests. Wait for the admin to resolve them before sending more.
                      </div>
                    ) : (
                      <form onSubmit={sendSupportMessage}>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Category</label>
                          <select className="input-field" value={supportForm.category} onChange={e => setSupportForm({ ...supportForm, category: e.target.value })}>
                            <option value="password_recovery">🔑 Password Recovery</option>
                            <option value="account_issue">👤 Account Issue</option>
                            <option value="general">💬 General Help</option>
                          </select>
                        </div>
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
                          <input className="input-field" value={supportForm.subject} onChange={e => setSupportForm({ ...supportForm, subject: e.target.value })} placeholder="e.g. Cannot log in to my account" required />
                        </div>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Message * (max 1000 chars)</label>
                            <span style={{ fontSize: '0.75rem', color: supportForm.message.length > 900 ? '#ef4444' : 'var(--text-muted)' }}>{supportForm.message.length}/1000</span>
                          </div>
                          <textarea className="input-field" rows={4} maxLength={1000} value={supportForm.message} onChange={e => setSupportForm({ ...supportForm, message: e.target.value })} placeholder="Describe your issue in detail. Include your phone number and account info." required style={{ resize: 'vertical' }} />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={supportLoading} style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', borderColor: 'transparent', marginTop: '0.75rem' }}>
                          {supportLoading ? 'Submitting...' : '🆘 Submit Support Request'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

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
    </div>
  </div>
  );
};

export default BuyerDashboard;
