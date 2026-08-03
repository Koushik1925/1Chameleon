const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../../middleware/userAuthMiddleware');
const paymentService = require('../../services/PaymentService');

// GET /api/billing/payments?page=1&limit=10
router.get('/', authenticateUser, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const data = await paymentService.getPaymentHistory(req.user._id, page, limit);
    res.json(data);
  } catch (err) {
    console.error('[Billing Payments] getPayments error:', err);
    res.status(500).json({ error: 'Failed to retrieve payment history' });
  }
});

module.exports = router;
