const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const Session = require('../models/Session');
const Log = require('../models/Log');
const adminAuth = require('../middleware/adminAuth');

// All device routes require admin authentication
router.use(adminAuth);

// 1. Get all devices
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find().sort({ lastSeen: -1 });
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get specific device details
router.get('/:id', async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: req.params.id });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    // Fetch active sessions and historical sessions for this device
    const sessions = await Session.find({ deviceId: req.params.id }).sort({ startTime: -1 });
    
    // Fetch logs relating to this device
    const logs = await Log.find({ deviceId: req.params.id }).sort({ timestamp: -1 }).limit(100);

    res.json({ device, sessions, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Ban device
router.post('/:id/ban', async (req, res) => {
  const { reason } = req.body;

  try {
    const device = await Device.findOne({ deviceId: req.params.id });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    device.status = 'banned';
    device.ban = {
      reason: reason || 'Banned by administrator',
      bannedAt: new Date(),
      bannedBy: req.admin.username
    };
    device.previousBans = (device.previousBans || 0) + 1;
    await device.save();

    // Log the ban event
    await Log.create({
      eventType: 'Device Banned',
      deviceId: req.params.id,
      description: `Device ${req.params.id} was banned by ${req.admin.username}. Reason: ${reason || 'N/A'}`,
      severity: 'critical'
    });

    // Terminate any active sessions for this device immediately
    const activeSessions = await Session.find({ deviceId: req.params.id, status: 'active' });
    for (const session of activeSessions) {
      session.status = 'terminated';
      session.endTime = new Date();
      session.duration = Math.floor((session.endTime - session.startTime) / 1000);
      await session.save();
    }

    // Queue disconnect/shutdown command for this device
    const activeCommands = req.app.get('activeCommands') || {};
    if (!activeCommands[device.deviceId]) activeCommands[device.deviceId] = [];
    activeCommands[device.deviceId].push({ type: 'disconnect', reason: 'device_banned' });
    req.app.set('activeCommands', activeCommands);

    // Also trigger Socket.IO command push
    const io = req.app.get('io');
    if (io) {
      io.to(`device:${device.deviceId}`).emit('command', { type: 'disconnect', reason: 'device_banned' });
    }

    res.json({ message: 'Device successfully banned', device });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Unban device
router.post('/:id/unban', async (req, res) => {
  try {
    const device = await Device.findOne({ deviceId: req.params.id });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    device.status = 'active';
    device.ban = undefined;
    await device.save();

    // Log the unban event
    await Log.create({
      eventType: 'Device Unbanned',
      deviceId: req.params.id,
      description: `Device ${req.params.id} was unbanned by ${req.admin.username}`,
      severity: 'info'
    });

    res.json({ message: 'Device successfully unbanned', device });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Send Remote Command
router.post('/:id/command', async (req, res) => {
  const { type, payload } = req.body; // e.g. type: 'restart', 'disconnect', 'refreshConfig', 'requestLogs'

  if (!type) return res.status(400).json({ error: 'Command type required' });

  try {
    const device = await Device.findOne({ deviceId: req.params.id });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    // Queue command for next heartbeat pull
    const activeCommands = req.app.get('activeCommands') || {};
    if (!activeCommands[device.deviceId]) activeCommands[device.deviceId] = [];
    activeCommands[device.deviceId].push({ type, payload, timestamp: Date.now() });
    req.app.set('activeCommands', activeCommands);

    // Push command immediately if agent is connected via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`device:${device.deviceId}`).emit('command', { type, payload });
    }

    await Log.create({
      eventType: 'Remote Command Sent',
      deviceId: req.params.id,
      description: `Remote command '${type}' sent to device ${req.params.id} by ${req.admin.username}`,
      severity: 'warning'
    });

    res.json({ message: `Command '${type}' queued successfully for device ${device.deviceId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
