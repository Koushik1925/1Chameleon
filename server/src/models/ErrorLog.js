const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  errorType: { type: String, required: true }, // "Agent Crash", "WebRTC Failure", etc.
  description: String,
  deviceId: String,
  sessionId: String,
  severity: { type: String, default: 'error' }
});

module.exports = mongoose.model('ErrorLog', errorLogSchema);
