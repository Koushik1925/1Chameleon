const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const Session = require('../models/Session');
const Log = require('../models/Log');
const Version = require('../models/Version');
const ErrorLog = require('../models/ErrorLog');

// Middleware to check if device is banned/suspended
const checkDeviceStatus = async (req, res, next) => {
  const { deviceId } = req.body;
  if (!deviceId) return next();

  try {
    const device = await Device.findOne({ deviceId });
    if (device && (device.status === 'banned' || device.status === 'suspended')) {
      return res.status(403).json({ 
        error: 'Access denied', 
        status: device.status,
        reason: device.ban ? device.ban.reason : 'Violation of terms'
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// 1. Register Agent
router.post('/register', async (req, res) => {
  const { 
    deviceId, hostname, publicIp, country, region, osName, osVersion, 
    agentVersion, machineGuid, installationId, fingerprintHash 
  } = req.body;

  if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });

  try {
    let device = await Device.findOne({ deviceId });

    // Fingerprint ban check: check if any banned device shares fingerprint
    const fingerprintMatch = await Device.findOne({
      $or: [
        { machineGuid: machineGuid, status: 'banned' },
        { installationId: installationId, status: 'banned' },
        { fingerprintHash: fingerprintHash, status: 'banned' }
      ]
    });

    if (fingerprintMatch) {
      // Auto-ban this new device ID if fingerprint matches a banned machine
      if (!device) {
        device = new Device({ 
          deviceId, hostname, publicIp, country, region, osName, osVersion, agentVersion,
          machineGuid, installationId, fingerprintHash,
          status: 'banned',
          ban: {
            reason: `Hardware Fingerprint Match (Banned Device: ${fingerprintMatch.deviceId})`,
            bannedAt: new Date(),
            bannedBy: 'System (Auto-Fingerprint)'
          }
        });
      } else {
        device.status = 'banned';
        device.ban = {
          reason: `Hardware Fingerprint Match (Banned Device: ${fingerprintMatch.deviceId})`,
          bannedAt: new Date(),
          bannedBy: 'System (Auto-Fingerprint)'
        };
      }
      await device.save();
      
      // Log fingerprint match
      await Log.create({
        eventType: 'Security Fingerprint Match',
        deviceId,
        description: `Fingerprint ban match detected for device ${deviceId}. Auto-banning.`,
        severity: 'critical'
      });

      return res.status(403).json({ 
        error: 'Access denied', 
        status: 'banned', 
        reason: device.ban.reason 
      });
    }

    if (device && (device.status === 'banned' || device.status === 'suspended')) {
      return res.status(403).json({ 
        error: 'Access denied', 
        status: device.status,
        reason: device.ban ? device.ban.reason : 'Device is restricted'
      });
    }

    const deviceData = {
      hostname, publicIp, country, region, osName, osVersion, agentVersion,
      machineGuid, installationId, fingerprintHash,
      lastSeen: new Date()
    };

    if (!device) {
      device = new Device({ deviceId, ...deviceData });
      await Log.create({
        eventType: 'Agent Registered',
        deviceId,
        description: `New agent registered: ${hostname} (${osName})`,
        severity: 'info'
      });
    } else {
      Object.assign(device, deviceData);
    }

    await device.save();
    
    // Update version installed count
    if (agentVersion) {
      await Version.updateOne(
        { version: agentVersion },
        { $inc: { installedCount: 1 } }
      );
    }

    res.json({ message: 'Registration successful', status: device.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Heartbeat API (collects metrics & returns commands)
router.post('/heartbeat', checkDeviceStatus, async (req, res) => {
  const { deviceId, cpuUsage, ramUsage, diskUsage, agentUptime } = req.body;

  if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });

  try {
    const device = await Device.findOne({ deviceId });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    device.lastSeen = new Date();
    device.health = {
      cpuUsage: cpuUsage || 0,
      ramUsage: ramUsage || 0,
      diskUsage: diskUsage || 0,
      agentUptime: agentUptime || 0
    };

    await device.save();

    // Check if there are any queued commands for this device (stored in the active socket/server state)
    // We will retrieve commands from the global active commands Map in server.js
    const activeCommands = req.app.get('activeCommands') || {};
    const deviceCommands = activeCommands[deviceId] || [];
    
    // Clear commands after delivering
    if (deviceCommands.length > 0) {
      activeCommands[deviceId] = [];
      req.app.set('activeCommands', activeCommands);
    }

    res.json({ 
      status: device.status,
      commands: deviceCommands // Array of commands (e.g. [{ type: 'disconnect', id: '123' }])
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Session Start
router.post('/session/start', checkDeviceStatus, async (req, res) => {
  const { sessionId, deviceId, sessionCode, clientLink, connectionType, resolution, codec } = req.body;

  if (!sessionId || !deviceId) {
    return res.status(400).json({ error: 'Missing sessionId or deviceId' });
  }

  try {
    const session = await Session.findOneAndUpdate(
      { sessionId },
      { 
        deviceId, 
        sessionCode, 
        clientLink, 
        connectionType, 
        resolution, 
        codec,
        startTime: new Date(),
        status: 'active'
      },
      { upsert: true, new: true }
    );

    await Log.create({
      eventType: 'Session Started',
      deviceId,
      sessionId,
      description: `Session ${sessionId} started with code ${sessionCode || 'N/A'}. Code link: ${clientLink || 'N/A'}`,
      severity: 'info'
    });

    res.json({ message: 'Session recorded successfully', session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Session End
router.post('/session/end', async (req, res) => {
  const { sessionId, duration, status } = req.body;

  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

  try {
    const session = await Session.findOne({ sessionId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    session.endTime = new Date();
    session.duration = duration || Math.floor((session.endTime - session.startTime) / 1000);
    session.status = status || 'completed';
    await session.save();

    await Log.create({
      eventType: 'Session Completed',
      deviceId: session.deviceId,
      sessionId,
      description: `Session ${sessionId} ended. Duration: ${session.duration} seconds. Status: ${session.status}`,
      severity: 'info'
    });

    res.json({ message: 'Session closed successfully', session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Submit Agent Logs
router.post('/logs', async (req, res) => {
  const { deviceId, sessionId, eventType, description, severity } = req.body;

  if (!eventType) return res.status(400).json({ error: 'Missing eventType' });

  try {
    const log = await Log.create({
      deviceId,
      sessionId,
      eventType,
      description,
      severity: severity || 'info'
    });

    res.json({ message: 'Log registered', log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Check for Version Updates
router.get('/version/check', async (req, res) => {
  const { version } = req.query;

  try {
    const stableVersion = await Version.findOne({ isStable: true });
    
    if (!stableVersion) {
      return res.json({ updateAvailable: false, message: 'No stable release defined' });
    }

    if (version !== stableVersion.version) {
      // Increment pending updates count
      await Version.updateOne(
        { version: stableVersion.version },
        { $inc: { pendingUpdateCount: 1 } }
      );

      return res.json({ 
        updateAvailable: true, 
        version: stableVersion.version, 
        downloadUrl: stableVersion.downloadUrl,
        isStable: true
      });
    }

    res.json({ updateAvailable: false, message: 'Running latest stable version' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
