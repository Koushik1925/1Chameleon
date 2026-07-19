const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  deviceId: { type: String, required: true },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  duration: Number, // seconds
  status: { type: String, enum: ['active', 'paused', 'terminated', 'completed'], default: 'active' },
  
  // Connection Code & Link Tracking
  sessionCode: String, // numeric pairing code
  clientLink: String, // vercel client link generated
  
  // Connection Metrics
  connectionType: String, // e.g. "WebRTC Direct", "WebRTC TURN"
  bitrate: Number, // kbps
  fps: Number,
  resolution: String,
  latency: Number, // ms
  packetLoss: Number, // percentage
  codec: String,
  
  // Recordings
  recording: {
    recordingEnabled: { type: Boolean, default: false },
    recordingPath: String,
    recordingDuration: Number // seconds
  }
});

module.exports = mongoose.model('Session', sessionSchema);
