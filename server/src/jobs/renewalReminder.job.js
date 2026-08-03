const Subscription = require('../models/Subscription');
const User = require('../models/User');

const checkRenewalReminders = async (io) => {
  try {
    const activeSubs = await Subscription.find({ status: 'ACTIVE' });
    const now = new Date();

    for (const sub of activeSubs) {
      const diffTime = sub.endDate - now;
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if ([7, 3, 1].includes(daysRemaining)) {
        const user = await User.findById(sub.userId);
        if (user) {
          console.log(`[Renewal Reminder] User ${user.email} subscription expires in ${daysRemaining} days.`);
          
          if (io) {
            io.to(`user:${sub.userId}`).emit('renewal_reminder', {
              daysRemaining,
              expiresAt: sub.endDate
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[Renewal Reminder Job] Exceeded check loop:', err);
  }
};

module.exports = checkRenewalReminders;
