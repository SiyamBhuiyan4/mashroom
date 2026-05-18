import React, { useState, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { User, Mail, Phone, Lock, Camera, X, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const ProfilePanel = ({ isOpen, onClose }) => {
  const { user, setUser, authHeader } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    farmName: user?.farmName || '',
    district: user?.district || '',
    mushroomType: user?.mushroomType || '',
    capacity: user?.capacity || ''
  });

  // Password gate state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'profile' | 'avatar'

  // Avatar state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // When user picks an avatar file — show preview and open password modal
  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      showMsg('Only image files are allowed.', 'error');
      return;
    }
    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMsg('Image must be under 5MB.', 'error');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setPendingAction('avatar');
    setCurrentPassword('');
    setShowPasswordModal(true);
  };

  // When user clicks Save Profile — open password modal
  const handleSaveClick = (e) => {
    e.preventDefault();
    setPendingAction('profile');
    setCurrentPassword('');
    setShowPasswordModal(true);
  };

  // Confirm with password — execute the pending action
  const handlePasswordConfirm = async () => {
    if (!currentPassword.trim()) {
      showMsg('Please enter your current password.', 'error');
      return;
    }
    setLoading(true);
    try {
      if (pendingAction === 'avatar') {
        await executeAvatarUpload();
      } else {
        await executeProfileSave();
      }
    } finally {
      setLoading(false);
    }
  };

  const executeProfileSave = async () => {
    try {
      const payload = { ...formData, currentPassword };
      const { data } = await axios.put(
        `/api/auth/profile/${user._id}`,
        payload,
        authHeader()
      );
      setUser(data);
      setShowPasswordModal(false);
      setCurrentPassword('');
      showMsg('Profile updated successfully!');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Update failed.', 'error');
    }
  };

  const executeAvatarUpload = async () => {
    if (!avatarFile) return;
    try {
      const fd = new FormData();
      fd.append('image', avatarFile);
      fd.append('currentPassword', currentPassword);

      const { data } = await axios.put(
        `/api/auth/profile/${user._id}`,
        fd,
        { headers: { ...authHeader().headers, 'Content-Type': 'multipart/form-data' } }
      );
      setUser(data);
      setAvatarFile(null);
      setAvatarPreview(null);
      setShowPasswordModal(false);
      setCurrentPassword('');
      showMsg('Profile picture updated!');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to upload avatar.', 'error');
    }
  };

  const cancelPasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setPendingAction(null);
    if (pendingAction === 'avatar') {
      setAvatarFile(null);
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const displayAvatar = avatarPreview || user?.avatar;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: '100%', maxWidth: '460px', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', zIndex: 1001, overflowY: 'auto' }}
          >
            <div style={{ padding: '2rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>Profile Settings</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Password required to save any changes</p>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
              </div>

              {msg.text && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`}
                  style={{ marginBottom: '1.5rem' }}>
                  {msg.text}
                </motion.div>
              )}

              {/* Avatar Section */}
              <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="Avatar"
                      style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${avatarPreview ? '#f59e0b' : 'var(--color-primary)'}` }} />
                  ) : (
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'white' }}>
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <label style={{ position: 'absolute', bottom: 0, right: 0, background: avatarPreview ? '#f59e0b' : 'var(--color-primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--bg-secondary)', color: 'white' }}>
                    <Camera size={16} />
                    <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleAvatarSelect} />
                  </label>
                </div>
                {avatarPreview && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                    ⚠️ New photo selected — confirm with password to save
                  </motion.div>
                )}
                <h3 style={{ marginTop: '1rem', fontSize: '1.15rem' }}>{user?.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{user?.role?.toUpperCase()} • {user?.phone}</p>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleSaveClick} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}><User size={14} /> Full Name</label>
                  <input className="input-field" name="name" value={formData.name} onChange={handleChange} required />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}><Mail size={14} /> Email Address</label>
                  <input className="input-field" type="email" name="email" value={formData.email} onChange={handleChange} />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}><Phone size={14} /> Phone Number</label>
                  <input className="input-field" name="phone" value={formData.phone} onChange={handleChange} required />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>About Me / Bio</label>
                  <textarea className="input-field" name="bio" value={formData.bio} onChange={handleChange} rows={3} style={{ resize: 'none' }} placeholder="Tell us about yourself..." />
                </div>

                {user?.role === 'farmer' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Farm Name</label>
                        <input className="input-field" name="farmName" value={formData.farmName} onChange={handleChange} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>District</label>
                        <input className="input-field" name="district" value={formData.district} onChange={handleChange} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Mushroom Type</label>
                        <input className="input-field" name="mushroomType" value={formData.mushroomType} onChange={handleChange} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Daily Capacity (kg)</label>
                        <input className="input-field" name="capacity" value={formData.capacity} onChange={handleChange} />
                      </div>
                    </div>
                  </>
                )}

                {/* Security notice */}
                <div style={{ padding: '0.9rem 1rem', background: 'rgba(34,197,94,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={16} color="var(--color-primary)" />
                  Your current password will be required to confirm all changes.
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Verifying...' : '🔒 Save Profile Settings'}
                </button>
              </form>
            </div>
          </motion.div>

          {/* Password Confirmation Modal */}
          <AnimatePresence>
            {showPasswordModal && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 1100 }}
                  onClick={cancelPasswordModal}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                  style={{
                    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '100%', maxWidth: '400px', background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)',
                    padding: '2rem', zIndex: 1101, boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                      <ShieldCheck size={26} color="var(--color-primary)" />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>
                      {pendingAction === 'avatar' ? 'Confirm Photo Change' : 'Confirm Profile Changes'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                      {pendingAction === 'avatar'
                        ? 'Enter your current password to upload your new profile picture.'
                        : 'Enter your current password to save your profile changes.'}
                    </p>
                  </div>

                  {/* Avatar preview in modal */}
                  {pendingAction === 'avatar' && avatarPreview && (
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                      <img src={avatarPreview} alt="Preview"
                        style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)' }} />
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>New photo preview</div>
                    </div>
                  )}

                  {msg.text && (
                    <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                      {msg.text}
                    </div>
                  )}

                  <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      className="input-field"
                      type={showCurrentPw ? 'text' : 'password'}
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePasswordConfirm()}
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowCurrentPw(v => !v)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={cancelPasswordModal} disabled={loading}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handlePasswordConfirm} disabled={loading || !currentPassword.trim()}>
                      {loading ? 'Verifying...' : '✓ Confirm'}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfilePanel;
