const { safeStorage, app } = require('electron');
const fs = require('fs');
const path = require('path');

const STORAGE_PATH = path.join(app.getPath('userData'), '.license_data');

class LicenseStorage {
  /**
   * Save both raw key and JWT securely
   */
  static save(licenseKey, token) {
    const data = JSON.stringify({ licenseKey, token, timestamp: Date.now() });
    const encrypted = safeStorage.encryptString(data);
    fs.writeFileSync(STORAGE_PATH, encrypted);
  }

  /**
   * Load decrypted license data
   */
  static load() {
    if (!fs.existsSync(STORAGE_PATH)) return null;
    try {
      const encrypted = fs.readFileSync(STORAGE_PATH);
      const decrypted = safeStorage.decryptString(encrypted);
      return JSON.parse(decrypted);
    } catch (e) {
      console.error('[LicenseStorage] Failed to load data:', e);
      return null;
    }
  }

  /**
   * Update only the token (used during refresh)
   */
  static updateToken(newToken) {
    const current = this.load();
    if (current) {
      this.save(current.licenseKey, newToken);
    }
  }

  /**
   * Wipe all local license data
   */
  static clear() {
    if (fs.existsSync(STORAGE_PATH)) {
      fs.unlinkSync(STORAGE_PATH);
    }
  }
}

module.exports = { LicenseStorage };
