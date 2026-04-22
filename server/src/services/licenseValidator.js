const crypto = require('crypto');

/**
 * @typedef {'lifetime' | 'subscription'} LicenseType
 * @typedef {'active' | 'expired' | 'cancelled'} LicenseStatus
 * 
 * @typedef {Object} License
 * @property {string} id
 * @property {string} license_key
 * @property {string} email
 * @property {LicenseType} type
 * @property {LicenseStatus} status
 * @property {string|null} device_id
 * @property {number} activation_count
 * @property {Date|null} expires_at
 * @property {Date} created_at
 * @property {Date} updated_at
 */

class LicenseValidator {
  /**
   * UNIFIED VALIDATION LOGIC
   * Works for both lifetime and subscription licenses
   * @param {License} license
   * @param {string} deviceId
   */
  static validateLicense(license, deviceId) {
    const currentTime = new Date();

    // Check 1: Status must be 'active'
    if (license.status !== 'active') {
      return {
        valid: false,
        license_key: license.license_key,
        type: license.type,
        status: license.status,
        expires_at: license.expires_at,
        message: `License is ${license.status}`,
        device_id: license.device_id,
        days_remaining: null
      };
    }

    // Check 2: Device binding verification
    if (license.device_id !== null && license.device_id !== deviceId) {
      return {
        valid: false,
        license_key: license.license_key,
        type: license.type,
        status: license.status,
        expires_at: license.expires_at,
        message: 'Device ID does not match',
        device_id: license.device_id,
        days_remaining: null
      };
    }

    // Check 3: Expiration validation (unified for both types)
    if (license.type === 'subscription') {
      if (license.expires_at === null) {
        return {
          valid: false,
          license_key: license.license_key,
          type: license.type,
          status: license.status,
          expires_at: license.expires_at,
          message: 'Subscription missing expiration date',
          device_id: license.device_id,
          days_remaining: null
        };
      }

      if (license.expires_at < currentTime) {
        return {
          valid: false,
          license_key: license.license_key,
          type: license.type,
          status: license.status,
          expires_at: license.expires_at,
          message: 'Subscription has expired',
          device_id: license.device_id,
          days_remaining: 0
        };
      }
    }

    // Calculate days remaining for subscriptions
    let daysRemaining = null;
    if (license.type === 'subscription' && license.expires_at) {
      const diff = license.expires_at.getTime() - currentTime.getTime();
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    // All checks passed
    return {
      valid: true,
      license_key: license.license_key,
      type: license.type,
      status: license.status,
      expires_at: license.expires_at,
      message: 'License is valid',
      device_id: license.device_id,
      days_remaining: daysRemaining
    };
  }

  /**
   * Calculate exact expiration date based on a billing cycle
   * @param {number} [billingCycleDays=30] 
   * @returns {Date}
   */
  static calculateExpiration(billingCycleDays = 30) {
    const date = new Date();
    date.setDate(date.getDate() + billingCycleDays);
    return date;
  }

  /**
   * Generates a new unique license key in CHAM-XXXX-XXXX-XXXX format
   * @returns {string}
   */
  static generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'CHAM';
    for (let i = 0; i < 3; i++) {
      key += '-';
      for (let j = 0; j < 4; j++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    return key;
  }
}

module.exports = { LicenseValidator };
