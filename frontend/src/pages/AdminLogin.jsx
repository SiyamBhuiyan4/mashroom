import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/admin/verify-password', { password });
      adminLogin(data);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect admin password.');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '380px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🍄</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Mashroom<span style={{ color: 'var(--color-primary)' }}>Magic</span>
            </span>
          </Link>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1.2rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', fontSize: '0.85rem', color: '#fca5a5' }}>
            🔐 Admin Secure Access
          </div>
        </div>

        {/* Card */}
        <div className="glass-panel" style={{ padding: '2.5rem', border: '1px solid rgba(239,68,68,0.2)' }}>
          <h2 style={{ marginBottom: '0.4rem', fontSize: '1.4rem' }}>Admin Login</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '2rem' }}>Enter the admin password to access the panel.</p>

          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>Admin Password</label>
              <input
                className="input-field"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                autoFocus
                autoComplete="new-password"
                name="mm-admin-secret"
                style={{ borderColor: 'rgba(239,68,68,0.3)' }}
              />
            </div>
            <button
              type="submit"
              className="btn"
              style={{ width: '100%', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', boxShadow: '0 4px 15px rgba(220,38,38,0.3)' }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login to Admin Panel →'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>← Back to Home</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
