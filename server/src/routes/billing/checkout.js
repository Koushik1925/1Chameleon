const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../../middleware/userAuthMiddleware');
const paymentService = require('../../services/PaymentService');

// POST /api/billing/create-order
router.post('/create-order', authenticateUser, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan) {
      return res.status(400).json({ error: 'Plan type (e.g., YEARLY) is required' });
    }

    const orderData = await paymentService.createOrder(req.user._id, plan);
    res.json(orderData);
  } catch (err) {
    console.error('[Billing Checkout] create-order error:', err);
    res.status(400).json({ error: err.message || 'Failed to initialize payment order' });
  }
});

module.exports = router;
