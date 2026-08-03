const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const Counter = require('../models/Counter');
const Log = require('../models/Log');
const plans = require('../config/plans');
const billingConfig = require('../config/billing');

class PaymentService {
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_TLHGJLmvnkWgC7';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'WX7mJ0yOQuqZYrgMTCRa4TQc';
    this.rzp = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret
    });
  }

  async createOrder(userId, planKey) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const plan = plans[planKey];
    if (!plan) throw new Error('Invalid plan selection');

    // Create order on Razorpay
    const options = {
      amount: plan.amount, // in paise
      currency: billingConfig.currency,
      receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };

    const gatewayOrder = await this.rzp.orders.create(options);

    // Save order in database
    const expiresAt = new Date(Date.now() + billingConfig.orderExpirySeconds * 1000);
    const order = await Order.create({
      userId,
      plan: planKey,
      amount: plan.amount,
      currency: billingConfig.currency,
      gatewayOrderId: gatewayOrder.id,
      status: 'CREATED',
      expiresAt
    });

    // Save pending payment record
    const payment = await Payment.create({
      userId,
      gatewayOrderId: gatewayOrder.id,
      amount: plan.amount,
      currency: billingConfig.currency,
      status: 'CREATED'
    });

    // Write audit log
    await Log.create({
      eventType: 'Payment Created',
      description: `Pending payment order created for user ${user.email} for plan ${planKey}. Order ID: ${gatewayOrder.id}`,
      severity: 'info'
    }).catch(() => {});

    return {
      orderId: gatewayOrder.id,
      amount: plan.amount,
      currency: billingConfig.currency,
      expiresAt
    };
  }

  async verifyWebhook(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'chameleon_webhook_8Fj2KxL9mNpQ7vRtYzX4';
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(rawBody);
    const digest = shasum.digest('hex');
    return digest === signature;
  }

  async capturePayment(paymentId, details) {
    // Expose capture functionality (usually auto-captured by Razorpay Standard Checkout)
    const payment = await Payment.findById(paymentId);
    if (payment) {
      payment.status = 'PROCESSING';
      await payment.save();
    }
    return payment;
  }

  async activateSubscription(userId, gatewayOrderId, gatewayPaymentId, gatewaySignature, details = {}) {
    // 1. Idempotency Check
    let payment = await Payment.findOne({ gatewayPaymentId });
    if (payment && payment.status === 'PAID') {
      console.log(`[Idempotency] Webhook payment ${gatewayPaymentId} already processed.`);
      const sub = await Subscription.findById(payment.subscriptionId);
      return { subscription: sub, payment };
    }

    // 2. Find Order
    const order = await Order.findOne({ gatewayOrderId });
    if (!order) throw new Error(`Associated Order ${gatewayOrderId} not found`);

    // 3. Find/Create Payment
    payment = await Payment.findOne({ gatewayOrderId });
    if (!payment) {
      payment = new Payment({
        userId,
        gatewayOrderId,
        amount: order.amount,
        currency: order.currency
      });
    }

    payment.gatewayPaymentId = gatewayPaymentId;
    payment.gatewaySignature = gatewaySignature;
    payment.status = 'PAID';
    payment.paidAt = new Date();
    payment.paymentMethod = details.method || 'card';

    // 4. Generate Invoice Atomically
    const counter = await Counter.findOneAndUpdate(
      { name: 'invoice' },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    const currentYear = new Date().getFullYear();
    const invoiceNumber = `${billingConfig.invoicePrefix}-${currentYear}-${String(counter.value).padStart(6, '0')}`;
    payment.invoiceNumber = invoiceNumber;

    // 5. Update Order Status
    order.status = 'PAID';
    await order.save();

    const planConfig = plans[order.plan];
    
    // 6. Subscription Extension Logic
    let currentSub = await Subscription.findOne({ userId, status: 'ACTIVE' });
    let startDate, endDate;
    let oldPlan = null;
    let reason = 'NEW_PURCHASE';

    if (currentSub && currentSub.endDate > new Date()) {
      // Extend current ACTIVE subscription
      oldPlan = currentSub.plan;
      startDate = currentSub.endDate;
      endDate = new Date(startDate.getTime() + planConfig.duration * 24 * 60 * 60 * 1000);
      reason = 'RENEWAL';

      currentSub.endDate = endDate;
      currentSub.amountPaid += planConfig.amount;
      currentSub.plan = order.plan;
      currentSub.paymentId = payment._id;
      await currentSub.save();
    } else {
      // Create new subscription
      startDate = new Date();
      endDate = new Date(startDate.getTime() + planConfig.duration * 24 * 60 * 60 * 1000);

      if (currentSub) {
        currentSub.status = 'EXPIRED';
        await currentSub.save();
      }

      currentSub = new Subscription({
        userId,
        plan: order.plan,
        status: 'ACTIVE',
        startDate,
        endDate,
        amountPaid: planConfig.amount,
        paymentId: payment._id
      });
      await currentSub.save();
    }

    // 7. Save Payment Sub reference
    payment.subscriptionId = currentSub._id;
    await payment.save();

    // 8. Create SubscriptionHistory Record
    await SubscriptionHistory.create({
      userId,
      subscriptionId: currentSub._id,
      oldPlan,
      newPlan: order.plan,
      paymentId: payment._id,
      startedAt: startDate,
      endedAt: endDate,
      reason
    });

    // 9. Update User Model
    const user = await User.findById(userId);
    if (user) {
      user.subscriptionId = currentSub._id;
      user.subscriptionStatus = 'active';
      user.currentPlan = order.plan;
      await user.save();
    }

    // 10. Audit Logging
    await Log.create({
      eventType: 'Payment Completed',
      description: `Payment ${gatewayPaymentId} verified successfully for ${user ? user.email : userId}. Invoice: ${invoiceNumber}`,
      severity: 'info'
    }).catch(() => {});

    await Log.create({
      eventType: 'Subscription Activated',
      description: `Subscription ${currentSub._id} set to ACTIVE until ${endDate.toDateString()} for user ${userId}`,
      severity: 'info'
    }).catch(() => {});

    await Log.create({
      eventType: 'Invoice Generated',
      description: `Generated Invoice number ${invoiceNumber} for payment ${payment._id}`,
      severity: 'info'
    }).catch(() => {});

    return { subscription: currentSub, payment };
  }

  async getPaymentHistory(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const items = await Payment.find({ userId, status: 'PAID' })
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Payment.countDocuments({ userId, status: 'PAID' });
    return { items, total, page, limit };
  }

  async getSubscription(userId) {
    return Subscription.findOne({ userId, status: 'ACTIVE' });
  }

  async refund(paymentId, amount) {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');
    
    payment.status = 'REFUNDED';
    await payment.save();

    await Log.create({
      eventType: 'Payment Refunded',
      description: `Refunded payment ${paymentId} for amount ${amount}`,
      severity: 'info'
    }).catch(() => {});

    return payment;
  }

  async cancelOrder(orderId) {
    const order = await Order.findOne({ gatewayOrderId: orderId });
    if (order) {
      order.status = 'FAILED';
      await order.save();
    }
    return order;
  }
}

module.exports = new PaymentService();
