const mongoose = require('mongoose');

const deviceCodeSchema = new mongoose.Schema({
  deviceCode: { type: String, required: true, unique: true, index: true },
  userCode: { type: String, required: true, unique: true, index: true }, // e.g. "CHAM-7890"
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'expired', 'denied'], 
    default: 'pending' 
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deviceToken: { type: String },
  expires: { type: Date, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('DeviceCode', deviceCodeSchema);
