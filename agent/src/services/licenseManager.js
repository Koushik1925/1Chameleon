const { ipcMain } = require('electron');
const { LicenseStorage } = require('./licenseStorage');
const { getDeviceId } = require('./deviceId');
const { LicenseApi } = require('./licenseApi');
const { saveTokens, getOrGenerateDeviceId } = require('../storage/identity');

class LicenseManager {
  constructor() {
    this.licenseApi = new LicenseApi(process.env.LICENSE_API_URL || 'http://127.0.0.1:3000');
    this.isValidating = false;
    this.setupIpcHandlers();
  }

  /**
   * Initialize license on app startup
   */
  async initialize() {
    try {
      const data = LicenseStorage.load();
      if (!data || !data.token) {
        console.log('[LicenseManager] No session token found');
        return false;
      }

      const deviceId = getDeviceId();
      const validation = await this.licenseApi.validate(data.token, deviceId);

      if (validation.valid) {
        console.log('[LicenseManager] ✅ License session is valid');
        // Update token (auto-refresh)
        if (validation.token) {
          LicenseStorage.updateToken(validation.token);
        }
        return true;
      } else {
        console.log('[LicenseManager] ❌ License session invalid:', validation.message);
        return false;
      }
    } catch (error) {
      console.error('[LicenseManager] Initialization error:', error.message);
      
      // Check timestamp for 2-hour offline grace period (if we want that)
      const data = LicenseStorage.load();
      if (data && data.timestamp) {
        const graceMs = 2 * 60 * 60 * 1000; // 2 hours
        if (Date.now() - data.timestamp < graceMs) {
          console.log('[LicenseManager] Using offline grace period.');
          return true;
        }
      }
      return false;
    }
  }

  /**
   * Activate a license (user enters key)
   */
  async activateLicense(licenseKey) {
    try {
      const deviceId = getDeviceId();
      const response = await this.licenseApi.activate(licenseKey, deviceId);

      if (response && response.token) {
        LicenseStorage.save(licenseKey, response.token);
        
        // Save persistent refresh token
        if (response.refresh_token) {
            const persistentId = getOrGenerateDeviceId();
            saveTokens(response.refresh_token, null);
            // Optionally restart daemon here if we had reference to it
        }

        return { success: true, message: 'License activated!' };
      }

      return { success: false, message: 'Activation failed (no token)' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Activation failed'
      };
    }
  }

  /**
   * Get current license status
   */
  async getStatus() {
    const data = LicenseStorage.load();
    if (!data) return null;

    const deviceId = getDeviceId();
    return this.licenseApi.validate(data.token, deviceId);
  }

  /**
   * Logout / remove license
   */
  logout() {
    LicenseStorage.clear();
    console.log('[LicenseManager] License cleared');
  }

  setupIpcHandlers() {
    ipcMain.handle('license:activate', (e, key) => this.activateLicense(key));
    ipcMain.handle('license:getStatus', () => this.getStatus());
    ipcMain.handle('license:logout', () => {
      this.logout();
      return { success: true };
    });
    ipcMain.handle('license:getDeviceId', () => getDeviceId());
  }
}

const licenseManager = new LicenseManager();
module.exports = { licenseManager };
