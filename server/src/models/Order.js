const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan: { type: String, enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'], required: true },
  amount: { type: Number, required: true }, // in paise
  currency: { type: String, default: 'INR' },
  gatewayOrderId: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['CREATED', 'PAID', 'FAILED', 'EXPIRED'], default: 'CREATED', index: true },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
