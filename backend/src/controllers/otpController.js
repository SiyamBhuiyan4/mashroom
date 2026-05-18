import nodemailer from 'nodemailer';
import { db } from '../config/fileDB.js';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Gmail App Password
    }
  });
};

export const sendAdminOTP = async (req, res) => {
  try {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

    // Save OTP to log
    db.create('otplog', { otp, expiresAt, used: false, type: 'admin_login' });

    const adminEmail = process.env.ADMIN_OTP_EMAIL || 'siyambhuiyan444@gmail.com';

    // Always log to terminal for dev fallback
    console.log(`\n🔐 [ADMIN OTP] Code: ${otp} | Expires: ${expiresAt}\n`);

    // Send via email if configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = getTransporter();
      await transporter.sendMail({
        from: `"Mashroom Magic System" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: '🍄 Mashroom Magic - Admin Login OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 12px;">
            <h2 style="color: #16a34a;">🍄 Mashroom Magic</h2>
            <p>Your Admin Login OTP is:</p>
            <div style="font-size: 36px; font-weight: bold; color: #16a34a; text-align: center; letter-spacing: 8px; padding: 20px; background: #dcfce7; border-radius: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #666;">This code expires in <strong>5 minutes</strong>.</p>
            <p style="color: #999; font-size: 12px;">If you didn't request this, ignore this email.</p>
          </div>
        `
      });
      return res.json({ message: 'OTP sent to admin email' });
    }

    res.json({ message: 'OTP generated (email not configured — check server terminal)', devMode: true });
  } catch (error) {
    console.error('OTP send error:', error.message);
    res.status(500).json({ message: 'Failed to send OTP: ' + error.message });
  }
};

export const verifyAdminOTP = (req, res) => {
  const { otp } = req.body;
  try {
    const logs = db.findAll('otplog');
    const now = new Date();

    const validEntry = logs.find(l =>
      l.otp === otp &&
      !l.used &&
      l.type === 'admin_login' &&
      new Date(l.expiresAt) > now
    );

    if (!validEntry) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    db.updateById('otplog', validEntry._id, { used: true });

    // Generate admin JWT
    import('jsonwebtoken').then(({ default: jwt }) => {
      const token = jwt.sign({ role: 'admin', id: 'admin' }, process.env.JWT_SECRET || 'mashroom_magic_secret_2024', { expiresIn: '8h' });
      res.json({ token, role: 'admin', name: 'System Admin' });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
