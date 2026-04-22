const db = require('../db');
const { LicenseValidator } = require('../services/licenseValidator');
const crypto = require('crypto');

class LicenseRepository {
  /**
   * Helper to hash a raw license key with SHA-256
   */
  static hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Find license by ID
   */
  static async getLicenseById(id) {
    const res = await db.query('SELECT * FROM licenses WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  /**
   * Create a new license
   * @param {string} email
   * @param {'lifetime'|'subscription'} type
   * @param {number} [billingCycleDays=30]
   */
  static async createLicense(email, type, billingCycleDays = 30) {
    const rawKey = LicenseValidator.generateLicenseKey();
    const hashedKey = this.hashKey(rawKey);
    const expiresAt = type === 'subscription' ? LicenseValidator.calculateExpiration(billingCycleDays) : null;

    const res = await db.query(
      `INSERT INTO licenses (license_key_hash, email, type, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [hashedKey, email, type, expiresAt]
    );

    const license = res.rows[0];
    // IMPORTANT: Return the rawKey to the caller once (for email/UI), but it is never saved.
    return { ...license, license_key: rawKey };
  }

  /**
   * Find license by key (hashes before lookup)
   * @param {string} licenseKey 
   */
  static async getLicenseByKey(licenseKey) {
    const hashedKey = this.hashKey(licenseKey);
    const res = await db.query('SELECT * FROM licenses WHERE license_key_hash = $1', [hashedKey]);
    return res.rows[0] || null;
  }

  /**
   * Get active license by email and type
   */
  static async getActiveLicenseByEmailAndType(email, type) {
    const res = await db.query(
      "SELECT * FROM licenses WHERE email = $1 AND type = $2 AND status = 'active'",
      [email, type]
    );
    return res.rows[0] || null;
  }

  /**
   * Get license by ID
   * @param {string} licenseId 
   */
  static async getLicenseById(licenseId) {
    const result = await db.query(
      'SELECT * FROM licenses WHERE id = $1',
      [licenseId]
    );

    return result.rows[0] || null;
  }

  /**
   * Bind a device to a license
   */
  static async bindDevice(licenseKey, deviceId) {
    const hashedKey = this.hashKey(licenseKey);
    const res = await db.query(
      `UPDATE licenses 
       SET device_id = $1, activation_count = activation_count + 1, updated_at = NOW()
       WHERE license_key_hash = $2 RETURNING *`,
      [deviceId, hashedKey]
    );
    return res.rows[0];
  }

  /**
   * Update license status
   */
  static async updateStatus(licenseId, status) {
    if (!license || license.type !== 'subscription') {
      return null;
    }

    const now = new Date();
    let newExpiresAt;

    // If already expired, extend from now; otherwise extend from current expiration
    if (license.expires_at && new Date(license.expires_at) > now) {
      newExpiresAt = new Date(license.expires_at);
      newExpiresAt.setDate(newExpiresAt.getDate() + billingCycleDays);
    } else {
      newExpiresAt = LicenseValidator.calculateExpiration(billingCycleDays);
    }

    const result = await db.query(
      `UPDATE licenses
       SET expires_at = $1, status = $2, updated_at = $3
       WHERE id = $4
       RETURNING *`,
      [newExpiresAt, 'active', now, licenseId]
    );

    return result.rows[0] || null;
  }

  /**
   * Record payment for audit trail
   * @param {string} licenseId 
   * @param {string} paypalTransactionId 
   * @param {number} amount 
   * @param {string} paymentType 
   * @param {string} [webhookEventType] 
   * @param {any} [webhookPayload] 
   */
  static async recordPayment(
    licenseId,
    paypalTransactionId,
    amount,
    paymentType,
    webhookEventType = null,
    webhookPayload = null
  ) {
    const now = new Date();

    const result = await db.query(
      `INSERT INTO payments 
       (license_id, paypal_transaction_id, amount, payment_type, status, webhook_event_type, webhook_payload, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        licenseId,
        paypalTransactionId,
        amount,
        paymentType,
        'completed',
        webhookEventType,
        webhookPayload ? JSON.stringify(webhookPayload) : null,
        now,
        now
      ]
    );

    return result.rows[0];
  }
}

module.exports = { LicenseRepository };
