const mongoose = require('mongoose');

const subscriptionHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  oldPlan: { type: String },
  newPlan: { type: String, required: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, required: true },
  reason: { type: String, enum: ['NEW_PURCHASE', 'RENEWAL', 'UPGRADE', 'EXPIRATION'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
