const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  eventType: { type: String, required: true }, // e.g. "Agent Connected", "Device Banned", etc.
  deviceId: String,
  sessionId: String,
  description: String,
  severity: { type: String, enum: ['info', 'warning', 'error', 'critical'], default: 'info' }
});

module.exports = mongoose.model('Log', logSchema);
