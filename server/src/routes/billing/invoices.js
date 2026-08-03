const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../../middleware/userAuthMiddleware');
const Payment = require('../../models/Payment');
const plans = require('../../config/plans');
const Subscription = require('../../models/Subscription');
const invoiceGenerator = require('../../services/InvoiceGenerator');
const Log = require('../../models/Log');

// GET /api/billing/invoices/:paymentId
router.get('/:paymentId', authenticateUser, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Invoice payment record not found' });
    }

    // Check ownership
    if (payment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    const subscription = await Subscription.findById(payment.subscriptionId);
    if (!subscription) {
      return res.status(400).json({ error: 'Subscription record not found' });
    }

    const planDetails = plans[subscription.plan];
    if (!planDetails) {
      return res.status(400).json({ error: 'Invalid plan config mapping' });
    }

    // PDF headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${payment.invoiceNumber}.pdf`);

    // Audit Log Downloaded
    await Log.create({
      eventType: 'Invoice Downloaded',
      description: `User ${req.user.email} downloaded Invoice PDF: ${payment.invoiceNumber}`,
      severity: 'info'
    }).catch(() => {});

    // Compile & pipe
    invoiceGenerator.generateInvoicePdf(payment, req.user, planDetails, res);
  } catch (err) {
    console.error('[Billing Invoices] generate-invoice error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate invoice PDF' });
    }
  }
});

module.exports = router;
