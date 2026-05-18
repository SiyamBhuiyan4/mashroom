import React, { useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import FarmerDashboard from './pages/FarmerDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="spinner"></div>
    </div>
  );
  if (!user) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const GlobalNoticebar = () => {
  const { user } = useContext(AuthContext);
  const [notice, setNotice] = useState({ enabled: false, text: '' });

  useEffect(() => {
    if (user) {
      axios.get('/api/admin/public-settings')
        .then(r => setNotice({ enabled: r.data.noticeEnabled, text: r.data.noticeText }))
        .catch(() => {});
    }
  }, [user]);

  if (!user || !notice.enabled || !notice.text) return null;

  return (
    <div style={{ background: 'linear-gradient(90deg, #f97316, #ea580c)', color: 'white', padding: '0.6rem 0', overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative', zIndex: 100, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'inline-block', paddingLeft: '100%', animation: 'marquee 20s linear infinite', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.02em' }}>
        🚀 {notice.text} 🚀
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-100%, 0); }
        }
      `}</style>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <div className="app-container">
        <GlobalNoticebar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['buyer']}>
              <BuyerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/farmer" element={
            <ProtectedRoute allowedRoles={['farmer']}>
              <FarmerDashboard />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
