const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true,
    index: true 
  },
  passwordHash: { type: String }, // Optional for Google OAuth users
  providers: {
    email: { type: Boolean, default: true },
    google: { type: Boolean, default: false },
    microsoft: { type: Boolean, default: false }
  },
  googleId: { type: String, sparse: true, index: true },
  profile: {
    name: { type: String, default: 'Chameleon User' },
    avatar: { type: String, default: '' }
  },
  settings: {
    unattendedAccessDefault: { type: Boolean, default: true },
    mfaEnabled: { type: Boolean, default: false }
  },
  status: { 
    type: String, 
    enum: ['active', 'suspended', 'locked'], 
    default: 'active' 
  },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  lastLogin: { type: Date },
  loginHistory: [{
    ip: String,
    userAgent: String,
    date: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
