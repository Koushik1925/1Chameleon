const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const Device = require('../models/Device');
const DeviceCode = require('../models/DeviceCode');
const Log = require('../models/Log');
const { authenticateUser } = require('../middleware/userAuthMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';
const JWT_EXPIRES_IN = '15m'; // Access Token lifetime
const REFRESH_EXPIRES_DAYS = 30;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper: Generate Access Token
function generateAccessToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Helper: Generate Refresh Token & Save to DB
async function generateRefreshToken(user, req) {
  const tokenString = crypto.randomBytes(40).toString('hex');
  const expires = new Date();
  expires.setDate(expires.getDate() + REFRESH_EXPIRES_DAYS);

  const refreshToken = new RefreshToken({
    token: tokenString,
    user: user._id,
    deviceInfo: {
      ip: req.ip,
      userAgent: req.headers['user-agent'] || ''
    },
    expires
  });

  await refreshToken.save();
  return tokenString;
}

// 1. Email + Password Register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      providers: { email: true, google: false },
      profile: { name: name || email.split('@')[0], avatar: '' }
    });

    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, req);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, profile: user.profile }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Email + Password Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check account locking
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(423).json({ error: 'Account temporarily locked due to failed attempts. Try again later.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      }
      await user.save();
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Reset failed login count
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    user.loginHistory.unshift({ ip: req.ip, userAgent: req.headers['user-agent'] || '', date: new Date() });
    if (user.loginHistory.length > 20) user.loginHistory.pop();
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, req);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, profile: user.profile, providers: user.providers }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Google OAuth ID Token Authentication
router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'Google ID token required' });

  try {
    let googleUser = null;
    if (GOOGLE_CLIENT_ID) {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID
      });
      googleUser = ticket.getPayload();
    } else {
      // Development mode fallback decoder if GOOGLE_CLIENT_ID not set yet
      const decoded = jwt.decode(idToken);
      googleUser = decoded || { sub: idToken, email: 'google_user@domain.com', name: 'Google User' };
    }

    const { sub: googleId, email, name, picture } = googleUser;
    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (!user) {
      user = new User({
        email: email.toLowerCase(),
        googleId,
        providers: { email: false, google: true },
        profile: { name: name || email.split('@')[0], avatar: picture || '' }
      });
    } else {
      user.googleId = googleId;
      user.providers.google = true;
      if (picture && !user.profile.avatar) user.profile.avatar = picture;
    }

    user.lastLogin = new Date();
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, req);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, profile: user.profile, providers: user.providers }
    });
  } catch (err) {
    res.status(401).json({ error: 'Google authentication failed: ' + err.message });
  }
});

// 4. Refresh Access Token
router.post('/refresh', async (req, res) => {
  const { refreshToken: tokenString } = req.body;
  if (!tokenString) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const refreshToken = await RefreshToken.findOne({ token: tokenString, revoked: false });
    if (!refreshToken || refreshToken.expires < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(refreshToken.user);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'User account not active' });
    }

    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Logout Single Session
router.post('/logout', async (req, res) => {
  const { refreshToken: tokenString } = req.body;
  if (tokenString) {
    await RefreshToken.updateOne({ token: tokenString }, { revoked: true });
  }
  res.json({ message: 'Logged out successfully' });
});

// 6. Logout Everywhere (Revoke All Refresh Tokens)
router.post('/logout-all', authenticateUser, async (req, res) => {
  try {
    await RefreshToken.updateMany({ user: req.user._id }, { revoked: true });
    res.json({ message: 'Logged out of all sessions successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Get Current User Profile & Devices
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const devices = await Device.find({ owner: req.user._id, status: { $ne: 'banned' } });
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email,
        profile: req.user.profile,
        providers: req.user.providers,
        settings: req.user.settings
      },
      devices
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DESKTOP DEVICE OAUTH FLOW ──

// A. Desktop requests Device Login Code
router.post('/device-code', async (req, res) => {
  const { deviceId, hostname } = req.body;
  
  const deviceCodeStr = crypto.randomBytes(24).toString('hex');
  const userCodeStr = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN e.g. 583920
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    const deviceCode = new DeviceCode({
      deviceCode: deviceCodeStr,
      userCode: userCodeStr,
      deviceId: deviceId || '',
      hostname: hostname || '',
      status: 'pending',
      expires
    });
    await deviceCode.save();

    res.json({
      deviceCode: deviceCodeStr,
      userCode: userCodeStr,
      verificationUri: `https://chameleon-jet.vercel.app/device?code=${userCodeStr}`,
      expiresIn: 600,
      interval: 3
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// B. User approves Device Code in Web Browser
router.post('/device-approve', authenticateUser, async (req, res) => {
  const { userCode, deviceId, hostname } = req.body;
  if (!userCode) return res.status(400).json({ error: 'User code required' });

  try {
    const record = await DeviceCode.findOne({ userCode, status: 'pending' });
    if (!record || record.expires < new Date()) {
      return res.status(404).json({ error: 'Invalid or expired authorization code' });
    }

    // Generate persistent Device Token for unattended access
    const deviceTokenStr = 'DEV_TOK_' + crypto.randomBytes(32).toString('hex');
    const deviceTokenHash = crypto.createHash('sha256').update(deviceTokenStr).digest('hex');

    // Register / Claim Device to User account
    const targetDeviceId = record.deviceId || deviceId;
    let deviceRecord = null;
    if (targetDeviceId) {
      deviceRecord = await Device.findOneAndUpdate(
        { deviceId: targetDeviceId },
        {
          $set: {
            owner: req.user._id,
            deviceTokenHash,
            claimedAt: new Date(),
            hostname: record.hostname || hostname || 'Desktop Host',
            lastSeen: new Date(),
            status: 'active'
          }
        },
        { upsert: true, new: true }
      );
    }

    record.status = 'approved';
    record.user = req.user._id;
    record.deviceToken = deviceTokenStr;
    await record.save();

    res.json({ message: 'Device authorized successfully!', device: deviceRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// C. Desktop Agent polls for Device Authorization Token
router.get('/device-poll', async (req, res) => {
  const { deviceCode } = req.query;
  if (!deviceCode) return res.status(400).json({ error: 'Device code required' });

  try {
    const record = await DeviceCode.findOne({ deviceCode });
    if (!record) return res.status(404).json({ error: 'Invalid code' });

    if (record.status === 'pending') {
      if (record.expires < new Date()) {
        record.status = 'expired';
        await record.save();
        return res.status(400).json({ error: 'Authorization code expired' });
      }
      return res.json({ status: 'pending' });
    }

    if (record.status === 'approved') {
      const user = await User.findById(record.user);
      const accessToken = generateAccessToken(user);
      const refreshToken = await generateRefreshToken(user, req);

      res.json({
        status: 'approved',
        deviceToken: record.deviceToken,
        accessToken,
        refreshToken,
        user: { id: user._id, email: user.email, profile: user.profile }
      });
    } else {
      res.status(400).json({ error: `Code is ${record.status}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Claim Device
router.post('/claim-device', authenticateUser, async (req, res) => {
  const { deviceId, hostname } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'Device ID required' });

  try {
    const device = await Device.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          owner: req.user._id,
          claimedAt: new Date(),
          hostname: hostname || undefined,
          status: 'active'
        }
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Device claimed successfully', device });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
