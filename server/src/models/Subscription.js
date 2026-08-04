const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'], required: true },
  status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'PENDING', 'CANCELLED'], default: 'PENDING', index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  renewalDate: { type: Date },
  amountPaid: { type: Number, required: true }, // in paise
  currency: { type: String, default: 'INR' },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
