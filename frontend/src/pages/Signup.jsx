import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const DISTRICTS = ['Dhaka','Chittagong','Rajshahi','Khulna','Barisal','Sylhet','Rangpur','Mymensingh','Comilla','Narayanganj','Gazipur','Tangail','Jamalpur','Bogura','Dinajpur','Jessore','Faridpur','Pabna','Sirajganj','Noakhali'];
const MUSHROOM_TYPES = ['Oyster','Button','Shiitake','Portobello','King Oyster','Enoki','Chanterelle','Lion\'s Mane','Mixed Varieties'];

const Signup = () => {
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPassword: '', farmName: '', district: '', mushroomType: '', capacity: '', nationalId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const { user, register, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const role = new URLSearchParams(location.search).get('role') || 'buyer';
  const isFarmer = role === 'farmer';

  useEffect(() => {
    if (user) {
      if (user.role !== role) {
        logout();
      } else {
        if (user.role === 'admin') navigate('/admin');
        else if (user.role === 'farmer') navigate('/farmer');
        else navigate('/dashboard');
      }
    }
  }, [user, role, logout, navigate]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submitHandler = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    const userData = { ...form, role: isFarmer ? 'farmer' : 'buyer' };
    delete userData.confirmPassword;
    const res = await register(userData);
    setLoading(false);
    if (res.success) {
      if (res.pending) {
        setSuccess(res.message || 'Application submitted! Awaiting admin approval.');
      } else {
        navigate(isFarmer ? '/farmer' : '/dashboard');
      }
    } else {
      setError(res.message);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⏳</div>
          <h2 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Application Submitted!</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>{success}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Home</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '540px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🍄</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Mashroom<span style={{ color: 'var(--color-primary)' }}>Magic</span>
            </span>
          </Link>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1.2rem', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--border-color)', borderRadius: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isFarmer ? '👨‍🌾 Seller Registration' : '🛒 Buyer Registration'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{isFarmer ? 'Apply as Seller' : 'Create Account'}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            {isFarmer ? 'Submit your application for admin review. Approval may take up to 24 hours.' : 'Join Mashroom Magic as a buyer today.'}
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={submitHandler}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Full Name *</label>
                <input className="input-field" name="name" value={form.name} onChange={handleChange} placeholder="Your full name" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Phone Number *</label>
                <input className="input-field" name="phone" value={form.phone} onChange={handleChange} placeholder="01XXXXXXXXX" required />
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email {isFarmer ? '*' : '(optional)'}</label>
              <input className="input-field" name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com" required={isFarmer} />
            </div>

            {isFarmer && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Farm Name *</label>
                      <input className="input-field" name="farmName" value={form.farmName} onChange={handleChange} placeholder="My Mushroom Farm" required />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>District *</label>
                      <select className="input-field" name="district" value={form.district} onChange={handleChange} required>
                        <option value="">Select district</option>
                        {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mushroom Type *</label>
                      <select className="input-field" name="mushroomType" value={form.mushroomType} onChange={handleChange} required>
                        <option value="">Select type</option>
                        {MUSHROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Daily Capacity (kg)</label>
                      <input className="input-field" name="capacity" value={form.capacity} onChange={handleChange} placeholder="e.g. 50" type="number" />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>National ID (optional)</label>
                    <input className="input-field" name="nationalId" value={form.nationalId} onChange={handleChange} placeholder="NID number" />
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Password *</label>
                <input className="input-field" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Confirm Password *</label>
                <input className="input-field" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Repeat password" required />
              </div>
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Submitting...' : (isFarmer ? 'Submit Application' : 'Create Account')}
            </motion.button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to={`/login?role=${role}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Sign in</Link>
          </div>
          <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
            <Link to={isFarmer ? '/signup?role=buyer' : '/signup?role=farmer'} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {isFarmer ? 'Register as Buyer instead →' : 'Apply as Seller instead →'}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
