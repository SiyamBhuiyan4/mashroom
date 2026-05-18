import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } }
  };

  return (
    <motion.div 
      className="dashboard-container" 
      style={{ padding: '2rem' }}
      initial="hidden"
      animate="show"
      variants={containerVariants}
    >
      <motion.div 
        variants={itemVariants}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', backdropFilter: 'blur(10px)' }}
      >
        <h2 style={{ margin: 0, background: 'linear-gradient(90deg, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Welcome back, {user.name} 🍄
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <motion.span 
            initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2 }}
            style={{ padding: '0.4rem 1rem', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid var(--color-primary)', borderRadius: '20px', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}
          >
            {user.role.toUpperCase()}
          </motion.span>
          <motion.button 
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout} 
            className="btn btn-outline"
            style={{ borderColor: 'rgba(255,255,255,0.2)' }}
          >
            Logout
          </motion.button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle decorative glow */}
        <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '300px', height: '300px', background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)', opacity: 0.15, filter: 'blur(40px)', zIndex: -1 }}></div>

        {user.role === 'admin' && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h3 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Admin Command Center</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Manage approvals, configure pricing, and oversee logistics.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <motion.div whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4>👨‍🌾 Farmer Approvals</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Review and approve new farmer registrations.</p>
                  <button className="btn btn-outline" style={{ marginTop: '1rem', width: '100%', fontSize: '0.9rem' }}>View Applications</button>
                </motion.div>
                
                <motion.div whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4>💰 Daily Pricing</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Set strictly fixed daily prices for mushrooms.</p>
                  <button className="btn btn-outline" style={{ marginTop: '1rem', width: '100%', fontSize: '0.9rem' }}>Manage Prices</button>
                </motion.div>

                <motion.div whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4>📦 Order Logistics</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Set delivery charges and dispatch via Dijkstra.</p>
                  <button className="btn btn-outline" style={{ marginTop: '1rem', width: '100%', fontSize: '0.9rem' }}>View Orders</button>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {user.role === 'farmer' && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h3 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Farmer Dashboard</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Review assigned orders. Your location remains securely hidden from buyers.</p>
              
              <motion.div whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4>📦 Incoming Orders</h4>
                <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2rem', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ color: 'var(--text-muted)' }}>No pending orders assigned to you yet.</p>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}

        {user.role === 'buyer' && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h3 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Buyer Dashboard</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Browse daily prices and track your mushroom deliveries in real-time.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <motion.div whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4>🛒 Today's Market</h4>
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                      <span>Premium Shiitake</span>
                      <span style={{ color: 'var(--color-accent)' }}>৳ 120 / কেজি</span>
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Place Order</button>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4>🚚 Order Tracking</h4>
                  <div style={{ marginTop: '1rem' }}>
                    {/* Simulated tracker */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
                      <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: 'var(--color-accent)' }}></div>
                      <span style={{ color: 'white' }}>Pending Admin Approval</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0', opacity: 0.5 }}>
                      <div style={{ width: '15px', height: '15px', borderRadius: '50%', border: '2px solid var(--text-muted)' }}></div>
                      <span style={{ color: 'var(--text-muted)' }}>Ready to Deliver</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
