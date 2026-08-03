const express = require('express');
const router = express.Router();

const plansRouter = require('./plans');
const checkoutRouter = require('./checkout');
const webhookRouter = require('./webhook');
const paymentsRouter = require('./payments');
const invoicesRouter = require('./invoices');
const subscriptionRouter = require('./subscription');

router.use('/plans', plansRouter);
router.use('/payments', paymentsRouter);
router.use('/invoices', invoicesRouter);
router.use('/webhook', webhookRouter);
router.use('/', checkoutRouter);      // mounts /create-order
router.use('/', subscriptionRouter);  // mounts /subscription & /status

module.exports = router;
