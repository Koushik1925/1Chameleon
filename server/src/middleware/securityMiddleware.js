const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Strict Rate Limiter for Authentication Endpoints (prevents brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth requests per windowMs
  message: { error: 'Too many login attempts from this IP. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Standard API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Rate limit exceeded. Please slow down your requests.' }
});

module.exports = {
  authLimiter,
  apiLimiter,
  helmetMiddleware: helmet({
    contentSecurityPolicy: false // Disable CSP for API backend
  })
};
