import React, { createContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

// In production (Vercel), use the deployed backend URL.
// In development, use the Vite proxy (relative /api path).
if (import.meta.env.VITE_API_BASE_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
}


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef(null);

  // Helper: build auth header from stored token
  const authHeader = (u = user) => ({
    headers: { Authorization: `Bearer ${u?.token}` }
  });

  // Start heartbeat to keep lastActive fresh (every 60s)
  const startHeartbeat = (u) => {
    stopHeartbeat();
    if (!u?.token || u?.role === 'admin') return; // admin has no DB record
    heartbeatRef.current = setInterval(async () => {
      try {
        await axios.post('/api/auth/heartbeat', {}, { headers: { Authorization: `Bearer ${u.token}` } });
      } catch { /* silent fail */ }
    }, 60 * 1000);
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  useEffect(() => {
    // 1. Restore session state
    const stored = localStorage.getItem('mm_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        startHeartbeat(parsed);
      } catch {}
    }
    setLoading(false);

    // 2. Install Global Axios Request Interceptor
    // This absolutely guarantees every request will automatically receive the Authorization header if available.
    const interceptor = axios.interceptors.request.use((config) => {
      const currentStored = localStorage.getItem('mm_user');
      if (currentStored) {
        try {
          const parsed = JSON.parse(currentStored);
          if (parsed?.token) {
            if (config.headers && typeof config.headers.set === 'function') {
              config.headers.set('Authorization', `Bearer ${parsed.token}`);
            } else {
              config.headers.Authorization = `Bearer ${parsed.token}`;
            }
          }
        } catch {}
      }
      return config;
    }, (error) => {
      return Promise.reject(error);
    });

    return () => {
      stopHeartbeat();
      axios.interceptors.request.eject(interceptor);
    };
  }, []);

  const login = async (phone, password) => {
    try {
      const { data } = await axios.post('/api/auth/login', { phone, password });
      setUser(data);
      localStorage.setItem('mm_user', JSON.stringify(data));
      startHeartbeat(data);
      return { success: true, role: data.role };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const adminLogin = (tokenData) => {
    const adminUser = { ...tokenData, role: 'admin' };
    setUser(adminUser);
    localStorage.setItem('mm_user', JSON.stringify(adminUser));
    // No heartbeat for admin (no DB user record)
  };

  const register = async (userData) => {
    try {
      const { data } = await axios.post('/api/auth/register', userData);
      if (data.pendingApproval) {
        return { success: true, pending: true, message: data.message };
      }
      setUser(data);
      localStorage.setItem('mm_user', JSON.stringify(data));
      startHeartbeat(data);
      return { success: true, pending: false };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = () => {
    stopHeartbeat();
    setUser(null);
    localStorage.removeItem('mm_user');
  };

  // Update user in state & localStorage (e.g. after profile edit)
  const updateUser = (updatedData) => {
    const merged = { ...user, ...updatedData };
    setUser(merged);
    localStorage.setItem('mm_user', JSON.stringify(merged));
  };

  return (
    <AuthContext.Provider value={{ user, setUser: updateUser, loading, login, adminLogin, register, logout, authHeader }}>
      {children}
    </AuthContext.Provider>
  );
};
