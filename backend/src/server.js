import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import mapRoutes from './routes/mapRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests, please try again later.' }
});

app.set('trust proxy', 1);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow localhost dev, Vercel deployments, and custom domain
    const allowed = [
      /localhost/,
      /\.vercel\.app$/,
      /mashroom-magic/,
    ];
    if (process.env.FRONTEND_URL) allowed.push(new RegExp(process.env.FRONTEND_URL.replace(/https?:\/\//, '')));
    if (allowed.some(r => r.test(origin))) return callback(null, true);
    callback(null, true); // allow all for now — restrict after confirming domain
  },
  credentials: true
}));
app.use(express.json());
app.use('/api/', limiter);

import { pendingWrites, getInitPromise } from './config/fileDB.js';

// Database Initialization Gate Middleware for serverless environments (Vercel)
// This guarantees the database is fully preloaded from the cloud before processing ANY requests!
app.use(async (req, res, next) => {
  try {
    await getInitPromise();
    next();
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    res.status(500).json({ message: 'Database initialization failed. Please try again.' });
  }
});

// Response Interceptor Middleware to block Vercel container freezes
// until all pending background cloud database writes are 100% completed!
app.use(async (req, res, next) => {
  const originalJson = res.json;
  const originalSend = res.send;

  res.json = async function (body) {
    if (pendingWrites.length > 0) {
      try {
        console.log(`⏳ Awaiting ${pendingWrites.length} pending cloud writes before returning JSON response...`);
        await Promise.all(pendingWrites);
      } catch (err) {
        console.error('⚠️ Cloud write await error in res.json interceptor:', err.message);
      } finally {
        pendingWrites.length = 0; // Clear the array
      }
    }
    return originalJson.call(this, body);
  };

  res.send = async function (body) {
    if (pendingWrites.length > 0) {
      try {
        console.log(`⏳ Awaiting ${pendingWrites.length} pending cloud writes before returning SEND response...`);
        await Promise.all(pendingWrites);
      } catch (err) {
        console.error('⚠️ Cloud write await error in res.send interceptor:', err.message);
      } finally {
        pendingWrites.length = 0; // Clear the array
      }
    }
    return originalSend.call(this, body);
  };

  next();
});


app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '🍄 Mashroom Magic API running (JSON storage)' });
});

const PORT = process.env.PORT || 5000;

import { initDB } from './config/fileDB.js';

const startServer = async () => {
  await initDB();
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Mashroom Magic backend running on port ${PORT}`);
    console.log(`📁 Cloud-synced database is active`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${PORT} is in use. Attempting to free it...`);
      import('child_process').then(({ execSync }) => {
        try {
          // Kill whatever process is holding the port
          execSync(`lsof -ti :${PORT} | xargs kill -9`, { stdio: 'ignore' });
          console.log(`✅ Port ${PORT} freed. Restarting in 1 second...`);
          setTimeout(startServer, 1000);
        } catch (e) {
          console.error(`❌ Could not free port ${PORT}. Please close other server instances manually.`);
          process.exit(1);
        }
      });
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
};

startServer();
