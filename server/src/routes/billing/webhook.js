const express = require('express');
const router = express.Router();
const paymentService = require('../../services/PaymentService');
const Order = require('../../models/Order');

// POST /api/billing/webhook
router.post('/', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Razorpay signature header missing' });
    }

    // Retrieve raw body bytes (populated by global verify option in express.json)
    const rawBody = req.rawBody;
    if (!rawBody) {
      console.error('[Webhook] rawBody is missing. Verify global middleware parses raw body bytes.');
      return res.status(400).json({ error: 'Raw body required for signature verification' });
    }

    // Signature check
    const isValid = await paymentService.verifyWebhook(rawBody, signature);
    if (!isValid) {
      console.error('[Webhook] Webhook validation failed: Invalid signature match');
      return res.status(400).json({ error: 'Signature verification failed' });
    }

    const payload = JSON.parse(rawBody.toString());
    const event = payload.event;
    console.log(`[Webhook] Verified event payload successfully: ${event}`);

    if (event === 'order.paid' || event === 'payment.captured') {
      const paymentData = payload.payload.payment.entity;
      const orderId = paymentData.order_id;
      const paymentId = paymentData.id;

      // Find order to identify user
      const order = await Order.findOne({ gatewayOrderId: orderId });
      if (!order) {
        console.error(`[Webhook] Order ${orderId} not found in database`);
        return res.status(400).json({ error: 'Order not found' });
      }

      // Perform atomic activation (handles idempotency and subscription extension internally)
      const result = await paymentService.activateSubscription(
        order.userId,
        orderId,
        paymentId,
        signature,
        paymentData
      );

      // Notify User's Client and Desktop Agents instantly
      const io = req.app.get('io');
      if (io) {
        const roomName = `user:${order.userId}`;
        console.log(`[Webhook Socket] Notifying user room: ${roomName}`);
        
        io.to(roomName).emit('subscription_updated', {
          userId: order.userId,
          status: 'active',
          plan: order.plan,
          expiresAt: result.subscription.endDate
        });

        io.to(roomName).emit('payment_completed', {
          invoiceNumber: result.payment.invoiceNumber,
          amount: result.payment.amount
        });
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[Billing Webhook] Fatal webhook process exception:', err);
    // Returning 500 triggers Razorpay webhook retry delivery
    res.status(500).json({ error: err.message || 'Internal webhook error' });
  }
});

module.exports = router;
