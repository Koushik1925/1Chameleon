const Subscription = require('../models/Subscription');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const User = require('../models/User');
const Log = require('../models/Log');

const checkSubscriptionExpiry = async (io) => {
  try {
    const expiredSubs = await Subscription.find({
      status: 'ACTIVE',
      endDate: { $lt: new Date() }
    });

    if (expiredSubs.length > 0) {
      console.log(`[Expiry Job] Expiring ${expiredSubs.length} subscription records.`);
    }

    for (const sub of expiredSubs) {
      sub.status = 'EXPIRED';
      await sub.save();

      // Update User profile
      const user = await User.findById(sub.userId);
      if (user) {
        user.subscriptionStatus = 'expired';
        await user.save();

        // Audit log
        await Log.create({
          eventType: 'Payment Failed', // Log categories or custom
          description: `Chameleon Pro expired for user: ${user.email}`,
          severity: 'info'
        }).catch(() => {});
      }

      // Add audit history
      await SubscriptionHistory.create({
        userId: sub.userId,
        subscriptionId: sub._id,
        oldPlan: sub.plan,
        newPlan: 'free',
        startedAt: sub.startDate,
        endedAt: sub.endDate,
        reason: 'EXPIRATION'
      });

      // Notify clients
      if (io) {
        io.to(`user:${sub.userId}`).emit('subscription_expired', {
          userId: sub.userId,
          status: 'expired',
          expiresAt: sub.endDate
        });
      }
    }
  } catch (err) {
    console.error('[Expiry Job] Scheduler loop exception:', err);
  }
};

module.exports = checkSubscriptionExpiry;
