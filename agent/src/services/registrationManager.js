const { ipcMain } = require('electron');
const { getOrGenerateDeviceId, saveTokens, getRefreshToken } = require('../storage/identity');
const { Api } = require('./api');

class RegistrationManager {
  constructor() {
    // Determine the base URL dynamically based on environment or fallback to production
    const baseUrl = process.env.SIGNALING_URL || 'https://chameleon-j5wf.onrender.com';
    this.api = new Api(baseUrl);
    this.setupIpcHandlers();
  }

  isLinked() {
    // If we have a refresh token, we are linked
    return !!getRefreshToken();
  }

  async registerBackground() {
    try {
      const deviceId = getOrGenerateDeviceId();
      console.log(`[Registration] Registering device: ${deviceId}`);
      // Passing null for email since we just link via device id now
      const response = await this.api.registerDevice(null, deviceId);

      if (response && response.refresh_token) {
        saveTokens(response.refresh_token, null);
        console.log('[Registration] Successfully registered device with server.');
        return { success: true };
      }

      return { success: false, message: 'Registration failed (no token)' };
    } catch (error) {
      console.error('[Registration] Error registering:', error.message);
      return {
        success: false,
        message: error.message || 'Registration failed'
      };
    }
  }

  setupIpcHandlers() {
    ipcMain.handle('device:getId', () => getOrGenerateDeviceId());
    ipcMain.handle('device:isLinked', () => this.isLinked());
  }
}

const registrationManager = new RegistrationManager();
module.exports = { registrationManager };
