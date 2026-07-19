const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  hostname: String,
  publicIp: String,
  country: String,
  region: String,
  osName: String, // e.g. "Windows 11 Pro"
  osVersion: String,
  agentVersion: String,
  installDate: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
  
  // Fingerprinting
  machineGuid: String,
  installationId: String,
  fingerprintHash: String,
  
  // Health Metrics (latest from heartbeat)
  health: {
    cpuUsage: { type: Number, default: 0 },
    ramUsage: { type: Number, default: 0 },
    diskUsage: { type: Number, default: 0 },
    agentUptime: { type: Number, default: 0 } // seconds
  },
  
  // Ban Details
  ban: {
    reason: String,
    bannedAt: Date,
    bannedBy: String,
    expiresAt: Date // null for permanent
  },
  
  // History logs
  previousSuspensions: { type: Number, default: 0 },
  previousBans: { type: Number, default: 0 }
});

module.exports = mongoose.model('Device', deviceSchema);
