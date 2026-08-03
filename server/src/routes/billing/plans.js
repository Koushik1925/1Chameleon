const express = require('express');
const router = express.Router();
const plans = require('../../config/plans');

// GET /api/billing/plans
router.get('/', (req, res) => {
  res.json({ plans });
});

module.exports = router;
