const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', index: true },
  gateway: { type: String, default: 'RAZORPAY' },
  gatewayOrderId: { type: String, required: true, unique: true, index: true },
  gatewayPaymentId: { type: String, unique: true, sparse: true, index: true },
  gatewaySignature: { type: String },
  amount: { type: Number, required: true }, // in paise
  currency: { type: String, default: 'INR' },
  paymentMethod: { type: String },
  invoiceNumber: { type: String, unique: true, sparse: true, index: true },
  status: { type: String, enum: ['CREATED', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED'], default: 'CREATED', index: true },
  paidAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
