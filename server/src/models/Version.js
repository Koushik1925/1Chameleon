const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  downloadUrl: String,
  releaseDate: { type: Date, default: Date.now },
  isStable: { type: Boolean, default: false },
  isDeprecated: { type: Boolean, default: false },
  
  // Rollout Metrics
  installedCount: { type: Number, default: 0 },
  pendingUpdateCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('Version', versionSchema);
