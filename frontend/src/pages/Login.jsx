import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const role = new URLSearchParams(location.search).get('role') || 'buyer';

  const isFarmer = role === 'farmer';

  // Forgot Password Modal States
  const [showModal, setShowModal] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState(null); // { name, role, supportTokens }
  const [subject, setSubject] = useState('Password Recovery Request');
  const [message, setMessage] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const getWordCount = (str) => {
    if (!str) return 0;
    return str.trim().split(/\s+/).filter(Boolean).length;
  };

  const wordCount = getWordCount(message);

  const submitHandler = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(phone, password);
    setLoading(false);
    if (res.success) {
      if (res.role === 'admin') navigate('/admin');
      else if (res.role === 'farmer') navigate('/farmer');
      else navigate('/dashboard');
    } else {
      setError(res.message);
    }
  };

  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);
    try {
      const { data } = await axios.post('/api/auth/support/check-phone', { phone: recoveryPhone });
      setVerifiedUser(data);
      setIsVerified(true);
    } catch (err) {
      setModalError(err.response?.data?.message || 'Phone verification failed.');
    }
    setModalLoading(false);
  };

  const handleSubmitRecoveryTicket = async (e) => {
    e.preventDefault();
    if (wordCount > 1000) return setModalError('Message exceeds the limit of 1000 words.');
    setModalError('');
    setModalLoading(true);
    try {
      const { data } = await axios.post('/api/messages/support/recovery', {
        phone: recoveryPhone,
        email: recoveryEmail,
        subject,
        message
      });
      setModalSuccess(data.message || 'Support request submitted successfully!');
      // Update token display
      setVerifiedUser(prev => ({ ...prev, supportTokens: data.supportTokens }));
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to submit recovery ticket.');
    }
    setModalLoading(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setRecoveryPhone('');
    setRecoveryEmail('');
    setIsVerified(false);
    setVerifiedUser(null);
    setSubject('Password Recovery Request');
    setMessage('');
    setModalError('');
    setModalSuccess('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🍄</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Mashroom<span style={{ color: 'var(--color-primary)' }}>Magic</span>
            </span>
          </Link>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1.2rem', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--border-color)', borderRadius: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isFarmer ? '👨‍🌾 Seller / Farmer Login' : '🛒 Buyer Login'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Welcome back</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            {isFarmer ? 'Sign in to your farm account' : 'Sign in to your buyer account'}
          </p>

          {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

          <form onSubmit={submitHandler}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Phone Number</label>
              <input className="input-field" type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" required />
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Password</label>
              <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
            </div>
            
            {/* Forgot Password Trigger */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <button 
                type="button" 
                onClick={() => setShowModal(true)} 
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 500, padding: 0 }}
              >
                Forgot Password?
              </button>
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </motion.button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to={`/signup?role=${role}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              {isFarmer ? 'Apply as Seller' : 'Register as Buyer'}
            </Link>
          </div>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link to={isFarmer ? '/login?role=buyer' : '/login?role=farmer'} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {isFarmer ? 'Switch to Buyer login →' : 'Switch to Seller login →'}
            </Link>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>← Back to Home</Link>
        </div>
      </motion.div>

      {/* Forgot Password popup/modal */}
      <AnimatePresence>
        {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel" 
              style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', border: '1px solid rgba(34, 197, 94, 0.25)', position: 'relative' }}
            >
              {/* Close Button */}
              <button 
                type="button" 
                onClick={handleCloseModal}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
              >
                &times;
              </button>

              <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>🆘 Recovery Support Request</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Verify your registered phone number to view your support tokens and send a direct recovery request to our admin queue.
              </p>

              {modalError && <div className="alert alert-error" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem' }}>{modalError}</div>}
              {modalSuccess && <div className="alert alert-success" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem' }}>{modalSuccess}</div>}

              {!isVerified ? (
                /* Step 1: Phone Verification */
                <form onSubmit={handleVerifyPhone}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>Registered Phone Number</label>
                    <input 
                      className="input-field" 
                      type="text" 
                      value={recoveryPhone} 
                      onChange={e => setRecoveryPhone(e.target.value)} 
                      placeholder="01XXXXXXXXX" 
                      required 
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    disabled={modalLoading}
                  >
                    {modalLoading ? 'Checking Database...' : 'Verify Phone Number →'}
                  </button>
                </form>
              ) : (
                /* Step 2: Display User & Support Form */
                <div>
                  {/* User Badge Info */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Account Name:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{verifiedUser?.name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Role:</span>
                      <span style={{ textTransform: 'capitalize', color: 'var(--color-primary)', fontWeight: 600 }}>{verifiedUser?.role}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Support Tokens Remaining:</span>
                      <strong style={{ color: verifiedUser?.supportTokens > 0 ? 'var(--color-primary)' : '#ef4444' }}>
                        {verifiedUser?.supportTokens} Tokens
                      </strong>
                    </div>
                  </div>

                  {verifiedUser?.supportTokens <= 0 ? (
                    /* Blocked State */
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <p style={{ color: '#f87171', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                        ❌ You have run out of support tokens. You cannot submit password recovery tickets. Please contact admin directly at <strong>siyambhuiyan444@gmail.com</strong>.
                      </p>
                      <button type="button" onClick={handleCloseModal} className="btn" style={{ width: '100%' }}>Close Modal</button>
                    </div>
                  ) : modalSuccess ? (
                    /* Success Close State */
                    <button type="button" onClick={handleCloseModal} className="btn btn-primary" style={{ width: '100%' }}>Got it!</button>
                  ) : (
                    /* Active Support Submission Form */
                    <form onSubmit={handleSubmitRecoveryTicket}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email Address (for admin to contact you)</label>
                        <input 
                          className="input-field" 
                          type="email" 
                          value={recoveryEmail} 
                          onChange={e => setRecoveryEmail(e.target.value)} 
                          placeholder="you@example.com"
                          required 
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                          Admin will send feedback or updates using your provided email address.
                        </p>
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Subject</label>
                        <input 
                          className="input-field" 
                          type="text" 
                          value={subject} 
                          onChange={e => setSubject(e.target.value)} 
                          required 
                        />
                      </div>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                          <label style={{ color: 'var(--text-muted)' }}>Support Message (recovery details)</label>
                          <span style={{ color: wordCount > 1000 ? '#ef4444' : 'var(--text-muted)' }}>
                            {wordCount} / 1000 words
                          </span>
                        </div>
                        <textarea 
                          className="input-field" 
                          rows={4} 
                          value={message} 
                          onChange={e => setMessage(e.target.value)} 
                          placeholder="Please provide details (e.g. your email or account registration info) so the admin can verify your identity."
                          required 
                          style={{ resize: 'none', lineHeight: 1.5 }}
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ width: '100%' }}
                        disabled={modalLoading || wordCount > 1000}
                      >
                        {modalLoading ? 'Sending Ticket...' : 'Submit Recovery Ticket (-1 Token) →'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
