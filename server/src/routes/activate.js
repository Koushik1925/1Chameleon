const express = require('express');
const db = require('../db');
const { LicenseRepository } = require('../repositories/licenseRepository');
const { activateSchema } = require('../middleware/validation');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/activate', async (req, res) => {
  try {
    // 1. Zod Validation
    const validation = activateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Invalid request body', details: validation.error.format() }
      });
    }

    const { license_key, device_id } = validation.data;

    // 2. Find license (getLicenseByKey handles hashing internally)
    const license = await LicenseRepository.getLicenseByKey(license_key);

    if (!license) {
      return res.status(404).json({
        success: false,
        error: { code: 'LICENSE_NOT_FOUND', message: 'License not found' }
      });
    }

    // 3. Check if device can be bound (Bypass for test keys)
    const isTestKey = license_key.startsWith('CHAM-TEST-');
    if (!isTestKey && license.device_id !== null && license.device_id !== device_id) {
      return res.status(403).json({
        success: false,
        error: { code: 'DEVICE_MISMATCH', message: 'License is bound to a different device' }
      });
    }

    // 4. Bind device and increment activation count
    const updatedLicense = await LicenseRepository.bindDevice(license_key, device_id);

    if (!updatedLicense) {
      return res.status(500).json({
        success: false,
        error: { code: 'ACTIVATION_FAILED', message: 'Failed to activate license' }
      });
    }

    // 5. Issue short-lived JWT (15 mins)
    const token = jwt.sign(
      { 
        license_id: updatedLicense.id,
        device_id: updatedLicense.device_id,
        type: updatedLicense.type
      },
      process.env.JWT_SECRET || 'chameleon-default-secret-change-me',
      { expiresIn: '15m' }
    );

    // 6. Record activation in audit log
    await db.query(
      `INSERT INTO activations (license_id, device_id, activation_type, ip_address, activated_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [updatedLicense.id, device_id, 'initial', req.ip || 'unknown']
    );

    // 7. Return success with token
    res.json({
      success: true,
      data: {
        token,
        status: updatedLicense.status,
        expires_at: updatedLicense.expires_at,
        type: updatedLicense.type
      }
    });
  } catch (error) {
    console.error('Activation error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Internal server error' }
    });
  }
});

module.exports = router;
