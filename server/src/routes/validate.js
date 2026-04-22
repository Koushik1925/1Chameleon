const express = require('express');
const { LicenseRepository } = require('../repositories/licenseRepository');
const { LicenseValidator } = require('../services/licenseValidator');
const { validateSchema } = require('../middleware/validation');
const jwt = require('jsonwebtoken');
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');

const router = express.Router();

// 1. Per-License/Device Rate Limiter (30 req/min)
const { createClient } = require('redis');
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

let validateRedisLogOnce = false;
redisClient.on('error', (err) => {
  if (!validateRedisLogOnce) {
    console.warn('[Redis/Validate] Connection Error (Per-device limiting will use memory fallback):', err.message);
    validateRedisLogOnce = true;
  }
});

redisClient.connect().catch(() => {});

const deviceRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'device_limit',
  points: 30,
  duration: 60,
  insuranceLimiter: new RateLimiterMemory({
    points: 30,
    duration: 60,
  })
});

router.post('/validate', async (req, res) => {
  try {
    // 1. Extract and Verify JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'chameleon-default-secret-change-me');
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
    }

    // 2. Zod Validation for device_id consistency
    const validation = validateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const { device_id } = validation.data;
    if (decoded.device_id !== device_id) {
      return res.status(403).json({ success: false, error: 'Forbidden: Device mismatch' });
    }

    // 3. Per-License/Device Rate Limiting
    const rateLimitKey = `${decoded.license_id}:${device_id}`;
    try {
      await deviceRateLimiter.consume(rateLimitKey);
    } catch (rejRes) {
      return res.status(429).set('Retry-After', Math.round(rejRes.msBeforeNext / 1000) || 1).json({
        success: false,
        error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded for this device' }
      });
    }

    // 4. Retrieve and Validate License
    const license = await LicenseRepository.getLicenseById(decoded.license_id);
    if (!license) {
      return res.status(404).json({ success: false, error: 'License not found' });
    }

    const validationResult = LicenseValidator.validateLicense(license, device_id);

    // 5. Token Refresh
    const newToken = jwt.sign(
      { 
        license_id: license.id,
        device_id: license.device_id,
        type: license.type
      },
      process.env.JWT_SECRET || 'chameleon-default-secret-change-me',
      { expiresIn: '15m' }
    );

    res.json({
      success: validationResult.valid,
      data: {
        ...validationResult,
        token: newToken // Return fresh token
      }
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Internal server error' }
    });
  }
});

module.exports = router;
