const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Device = require('../models/Device');
const Log = require('../models/Log');
const adminAuth = require('../middleware/adminAuth');

router.use(adminAuth);

// 1. Get all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find().sort({ startTime: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Terminate active session
router.post('/:id/terminate', async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.id });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    session.status = 'terminated';
    session.endTime = new Date();
    session.duration = Math.floor((session.endTime - session.startTime) / 1000);
    await session.save();

    await Log.create({
      eventType: 'Session Force Terminated',
      deviceId: session.deviceId,
      sessionId: session.sessionId,
      description: `Session ${session.sessionId} was force terminated by admin ${req.admin.username}`,
      severity: 'warning'
    });

    // Queue disconnect command for the agent
    const activeCommands = req.app.get('activeCommands') || {};
    if (!activeCommands[session.deviceId]) activeCommands[session.deviceId] = [];
    activeCommands[session.deviceId].push({ type: 'disconnect_session', sessionId: session.sessionId });
    req.app.set('activeCommands', activeCommands);

    // Also trigger Socket.IO command push
    const io = req.app.get('io');
    if (io) {
      io.to(`device:${session.deviceId}`).emit('command', { type: 'disconnect_session', sessionId: session.sessionId });
      io.to(`session:${session.sessionId}`).emit('session:ended', { reason: 'Force terminated by Administrator' });
    }

    res.json({ message: 'Session successfully terminated', session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
