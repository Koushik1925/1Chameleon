const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const ErrorLog = require('../models/ErrorLog');
const adminAuth = require('../middleware/adminAuth');

router.use(adminAuth);

// 1. Get system event logs (with filters and pagination)
router.get('/', async (req, res) => {
  const { severity, deviceId, eventType, limit, page } = req.query;

  const query = {};
  if (severity) query.severity = severity;
  if (deviceId) query.deviceId = deviceId;
  if (eventType) query.eventType = eventType;

  const parsedLimit = parseInt(limit, 10) || 50;
  const parsedPage = parseInt(page, 10) || 1;
  const skip = (parsedPage - 1) * parsedLimit;

  try {
    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parsedLimit);

    const total = await Log.countDocuments(query);

    res.json({
      logs,
      total,
      pages: Math.ceil(total / parsedLimit),
      currentPage: parsedPage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get error logs
router.get('/errors', async (req, res) => {
  const { limit, page } = req.query;
  const parsedLimit = parseInt(limit, 10) || 50;
  const parsedPage = parseInt(page, 10) || 1;
  const skip = (parsedPage - 1) * parsedLimit;

  try {
    const errors = await ErrorLog.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parsedLimit);

    const total = await ErrorLog.countDocuments();

    res.json({
      errors,
      total,
      pages: Math.ceil(total / parsedLimit),
      currentPage: parsedPage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Clear logs older than custom interval (retention)
router.post('/clear', async (req, res) => {
  const { days } = req.body;
  const parsedDays = parseInt(days, 10) || 30; // default 30 days

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parsedDays);

  try {
    const deletedEvents = await Log.deleteMany({ timestamp: { $lt: cutoff } });
    const deletedErrors = await ErrorLog.deleteMany({ timestamp: { $lt: cutoff } });

    await Log.create({
      eventType: 'Logs Purged',
      description: `Logs older than ${parsedDays} days were manually purged by ${req.admin.username}`,
      severity: 'warning'
    });

    res.json({ 
      message: `Puged logs older than ${parsedDays} days`, 
      eventsDeleted: deletedEvents.deletedCount,
      errorsDeleted: deletedErrors.deletedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
