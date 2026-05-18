import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [prices, setPrices] = useState([]);
  
  // Guest Support Modal States
  const [showSupport, setShowSupport] = useState(false);
  const [supportForm, setSupportForm] = useState({ phone: '', email: '', message: '' });
  const [supportLoad, setSupportLoad] = useState(false);
  const [supportMsg, setSupportMsg] = useState({ text: '', error: false });

  const handleGuestSupport = async (e) => {
    e.preventDefault();
    setSupportLoad(true);
    setSupportMsg({ text: '', error: false });
    try {
      const { data } = await axios.post('/api/messages/support/general', supportForm);
      setSupportMsg({ text: data.message || 'Support request sent!', error: false });
      setSupportForm({ phone: '', email: '', message: '' });
    } catch (err) {
      setSupportMsg({ text: err.response?.data?.message || 'Failed to send request.', error: true });
    }
    setSupportLoad(false);
  };

  useEffect(() => {
    if (user && user.role !== 'admin') {
      if (user.role === 'farmer') navigate('/farmer');
      else navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    axios.get('/api/admin/products').then(r => setPrices(r.data)).catch(() => {});
  }, []);

  const CARDS = [
    {
      icon: '🛒',
      title: 'Login as Buyer',
      desc: 'Browse fresh mushrooms, place orders, and track your deliveries in real-time.',
      btnLabel: 'Enter as Buyer',
      btnClass: 'btn-primary',
      border: 'rgba(34,197,94,0.35)',
      glow: 'rgba(34,197,94,0.12)',
      onClick: () => navigate('/login?role=buyer'),
    },
    {
      icon: '👨‍🌾',
      title: 'Login as Seller',
      desc: 'Manage your farm, receive orders, and grow your mushroom business across Bangladesh.',
      btnLabel: 'Enter as Seller',
      btnClass: 'btn-outline',
      btnStyle: { borderColor: 'rgba(132,204,22,0.5)', color: '#84cc16' },
      border: 'rgba(132,204,22,0.3)',
      glow: 'rgba(132,204,22,0.08)',
      onClick: () => navigate('/login?role=farmer'),
    },
    {
      icon: '🔐',
      title: 'Admin Panel',
      desc: 'System administration — manage approvals, pricing, orders, and platform settings.',
      btnLabel: 'Admin Login',
      btnClass: 'btn-outline',
      btnStyle: { borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' },
      border: 'rgba(239,68,68,0.25)',
      glow: 'rgba(239,68,68,0.06)',
      onClick: () => navigate('/admin-login'),
    },
    {
      icon: '🆘',
      title: 'Contact Support',
      desc: 'Need help? Submit a general visitor inquiry directly to our administration team.',
      btnLabel: 'Get Help →',
      btnClass: 'btn-outline',
      btnStyle: { borderColor: 'rgba(249,115,22,0.45)', color: '#f97316' },
      border: 'rgba(249,115,22,0.25)',
      glow: 'rgba(249,115,22,0.06)',
      onClick: () => { setSupportMsg({text:'',error:false}); setShowSupport(true); },
    },
  ];

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar — logo only */}
      <nav style={{
        display: 'flex', alignItems: 'center',
        padding: '1.25rem 2rem', borderBottom: '1px solid var(--border-color)',
        backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(7, 26, 14, 0.85)'
      }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span style={{ fontSize: '1.8rem' }}>🍄</span>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Mashroom<span style={{ color: 'var(--color-primary)' }}>Magic</span>
          </span>
        </motion.div>
      </nav>

      {/* Hero */}
      <section style={{ flex: 1, padding: '4rem 2rem 3rem', textAlign: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: '700px', height: '350px',
          background: 'radial-gradient(ellipse, rgba(34,197,94,0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1.2rem', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--border-color)', borderRadius: '20px', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            🇧🇩 Bangladesh's Premier Mushroom Marketplace
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', marginBottom: '1rem', background: 'linear-gradient(135deg, #f0fdf4, #86efac, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Farm to Table,<br />Fresh Every Day
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 2rem' }}>
            Connect with verified mushroom farmers across Bangladesh. Real-time prices, live order tracking, and direct farm delivery.
          </p>
        </motion.div>

        {/* Today's Prices Banner */}
        {Array.isArray(prices) && prices.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            style={{ display: 'inline-flex', gap: '1.5rem', padding: '0.65rem 1.75rem', background: 'rgba(34,197,94,0.07)', border: '1px solid var(--border-color)', borderRadius: '50px', marginBottom: '3rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>📊 Today's Rates:</span>
            {prices.slice(0, 4).map(p => (
              <span key={p._id} style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                {p.name} <strong style={{ color: 'var(--color-primary)' }}>৳{p.price}/kg</strong>
              </span>
            ))}
          </motion.div>
        )}

        {/* Three Role Cards */}
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', padding: '0 1rem' }}>
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.12, type: 'spring', stiffness: 120 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              onClick={card.onClick}
              style={{
                width: '280px', padding: '2.5rem 1.75rem', cursor: 'pointer', textAlign: 'center',
                background: `rgba(13, 36, 22, 0.92)`,
                border: `1px solid ${card.border}`,
                borderRadius: 'var(--radius-xl)',
                boxShadow: '0 6px 28px rgba(0,0,0,0.45)',
                position: 'relative', overflow: 'hidden'
              }}
            >
              {/* card glow */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at top, ${card.glow}, transparent 70%)`, pointerEvents: 'none' }} />

              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>{card.icon}</div>
              <h2 style={{ fontSize: '1.35rem', marginBottom: '0.65rem', color: 'var(--text-main)', position: 'relative' }}>{card.title}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.75rem', lineHeight: 1.65, position: 'relative' }}>
                {card.desc}
              </p>
              <div className={`btn ${card.btnClass}`} style={{ width: '100%', position: 'relative', ...(card.btnStyle || {}) }}>
                {card.btnLabel} →
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features strip */}
      <section style={{ padding: '3rem 2rem', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {[
            { icon: '📍', title: 'Interactive Map', desc: 'Locate verified farms across Bangladesh on a live map.' },
            { icon: '💰', title: 'Real-time Prices', desc: 'Admin-controlled daily pricing for fair market rates.' },
            { icon: '🚚', title: 'Live Tracking', desc: 'Track your order from farm to doorstep, step by step.' },
            { icon: '✅', title: 'Verified Farmers', desc: 'Every seller is admin-approved before going live.' },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="stat-card" style={{ textAlign: 'center', padding: '1.5rem 1.25rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>{f.icon}</div>
              <h3 style={{ marginBottom: '0.4rem', fontSize: '1rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '1.5rem 2rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        🍄 Mashroom Magic — Bangladesh Mushroom Marketplace
      </footer>

      {/* Guest Support Modal */}
      {showSupport && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000 }} onClick={() => setShowSupport(false)} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '90%', maxWidth: '450px', background: 'var(--bg-secondary)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 'var(--radius-xl)', padding: '2rem', zIndex: 1001, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0 }}>🆘 Contact Support</h3>
              <button onClick={() => setShowSupport(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Submit a general support request to our team without logging in.
            </p>

            {supportMsg.text && (
              <div style={{ padding: '0.75rem', marginBottom: '1rem', background: supportMsg.error ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${supportMsg.error ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, color: supportMsg.error ? '#f87171' : '#4ade80', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                {supportMsg.text}
              </div>
            )}

            {!supportMsg.text || supportMsg.error ? (
              <form onSubmit={handleGuestSupport}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Phone Number *</label>
                  <input className="input-field" type="text" required placeholder="01XXXXXXXXX" value={supportForm.phone} onChange={e => setSupportForm({ ...supportForm, phone: e.target.value })} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email Address *</label>
                  <input className="input-field" type="email" required placeholder="you@example.com" value={supportForm.email} onChange={e => setSupportForm({ ...supportForm, email: e.target.value })} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                    Admin will send feedback or updates using your provided email address.
                  </p>
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Message *</label>
                  <textarea className="input-field" rows={4} required placeholder="How can we help you?" value={supportForm.message} onChange={e => setSupportForm({ ...supportForm, message: e.target.value })} style={{ resize: 'vertical' }} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg,#f97316,#ea580c)' }} disabled={supportLoad}>
                  {supportLoad ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            ) : (
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setShowSupport(false)}>Close</button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
