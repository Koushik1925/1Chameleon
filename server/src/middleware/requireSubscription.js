const Subscription = require('../models/Subscription');

const requireSubscription = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    if (user.subscriptionStatus !== 'active' || !user.subscriptionId) {
      return res.status(402).json({ 
        error: 'Chameleon Pro Subscription required', 
        code: 'PAYMENT_REQUIRED' 
      });
    }

    const subscription = await Subscription.findById(user.subscriptionId);
    if (!subscription || subscription.status !== 'ACTIVE' || subscription.endDate < new Date()) {
      // Gracefully switch user status to expired in database
      user.subscriptionStatus = 'expired';
      await user.save();
      
      return res.status(402).json({ 
        error: 'Subscription expired. Please renew to continue remote access.', 
        code: 'PAYMENT_REQUIRED' 
      });
    }

    req.subscription = subscription;
    next();
  } catch (err) {
    console.error('[Middleware] requireSubscription error:', err);
    return res.status(500).json({ error: 'Subscription validation failed' });
  }
};

module.exports = requireSubscription;
