const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../../middleware/userAuthMiddleware');
const Subscription = require('../../models/Subscription');

// GET /api/billing/subscription
router.get('/', authenticateUser, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user._id, status: 'ACTIVE' });
    res.json({ subscription: sub });
  } catch (err) {
    console.error('[Billing Subscription] getSub error:', err);
    res.status(500).json({ error: 'Failed to retrieve active subscription' });
  }
});

// GET /api/billing/status
router.get('/status', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    if (user.subscriptionStatus !== 'active' || !user.subscriptionId) {
      return res.json({
        plan: 'free',
        status: 'FREE',
        expires: null,
        daysRemaining: 0
      });
    }

    const sub = await Subscription.findById(user.subscriptionId);
    if (!sub || sub.status !== 'ACTIVE' || sub.endDate < new Date()) {
      return res.json({
        plan: 'free',
        status: 'EXPIRED',
        expires: sub ? sub.endDate : null,
        daysRemaining: 0
      });
    }

    const diffTime = Math.max(0, sub.endDate - new Date());
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    res.json({
      plan: sub.plan,
      status: sub.status,
      expires: sub.endDate,
      daysRemaining
    });
  } catch (err) {
    console.error('[Billing Status] getStatus error:', err);
    res.status(500).json({ error: 'Failed to retrieve billing status' });
  }
});

// GET /api/billing/device-status
router.get('/device-status', async (req, res) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) return res.status(400).json({ error: 'Device ID required' });

    const Device = require('../../models/Device');
    const device = await Device.findOne({ deviceId });
    if (!device || !device.owner) {
      return res.json({
        plan: 'free',
        status: 'FREE',
        expires: null,
        daysRemaining: 0
      });
    }

    const User = require('../../models/User');
    const user = await User.findById(device.owner);
    if (!user || user.subscriptionStatus !== 'active' || !user.subscriptionId) {
      return res.json({
        plan: 'free',
        status: user ? user.subscriptionStatus.toUpperCase() : 'FREE',
        expires: null,
        daysRemaining: 0
      });
    }

    const Subscription = require('../../models/Subscription');
    const sub = await Subscription.findById(user.subscriptionId);
    if (!sub || sub.status !== 'ACTIVE' || sub.endDate < new Date()) {
      return res.json({
        plan: 'free',
        status: 'EXPIRED',
        expires: sub ? sub.endDate : null,
        daysRemaining: 0
      });
    }

    const diffTime = Math.max(0, sub.endDate - new Date());
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    res.json({
      plan: sub.plan,
      status: sub.status,
      expires: sub.endDate,
      daysRemaining
    });
  } catch (err) {
    console.error('[Billing Device Status] error:', err);
    res.status(500).json({ error: 'Failed to retrieve device status' });
  }
});

module.exports = router;
