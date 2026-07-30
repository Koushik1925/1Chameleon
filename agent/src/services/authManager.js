const { shell, ipcMain } = require('electron');
const { getOrGenerateDeviceId, saveTokens, getRefreshToken, getUserInfo, clearTokens } = require('../storage/identity');
const { Api } = require('./api');

function getPermanentDeviceId() {
  try {
    const os = require('os');
    const identifier = os.hostname() + '-' + os.arch() + '-' + os.platform();
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = (hash * 31 + identifier.charCodeAt(i)) & 0xffffffff;
    }
    const code = Math.abs(hash) % 900000 + 100000;
    return 'DEV-REAL-' + code.toString();
  } catch (e) {
    return 'DEV-REAL-100000';
  }
}

class AuthManager {
  constructor() {
    const baseUrl = process.env.SIGNALING_URL || 'https://chameleon-1.onrender.com';
    this.api = new Api(baseUrl);
    this.pollInterval = null;
    this.setupIpcHandlers();
  }

  async startDeviceAuthFlow() {
    try {
      const deviceId = getPermanentDeviceId();
      const hostname = require('os').hostname();

      // 1. Request device login code from server
      const response = await fetch(`${this.api.baseUrl}/api/auth/device-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, hostname })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate auth code');

      const { deviceCode, userCode, verificationUri } = data;

      // 2. Open default web browser for user authorization
      shell.openExternal(verificationUri);

      // 3. Start polling for approval
      this.pollForDeviceApproval(deviceCode, deviceId);

      return { success: true, userCode, verificationUri };
    } catch (err) {
      console.error('[AuthManager] Error starting device auth:', err.message);
      return { success: false, error: err.message };
    }
  }

  pollForDeviceApproval(deviceCode, deviceId) {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${this.api.baseUrl}/api/auth/device-poll?deviceCode=${deviceCode}`);
        const data = await response.json();

        if (response.ok && data.status === 'approved') {
          clearInterval(this.pollInterval);
          this.pollInterval = null;

          // Save Device Token and User Refresh Token securely
          if (data.deviceToken && data.refreshToken) {
            saveTokens(data.refreshToken, data.deviceToken, data.user);
            console.log('[AuthManager] Device successfully authorized and claimed by user:', data.user.email);
            const { BrowserWindow } = require('electron');
            BrowserWindow.getAllWindows().forEach(win => {
              try { win.webContents.send('auth:approved', { user: data.user, hostname: require('os').hostname() }); } catch (e) {}
            });
            ipcMain.emit('auth:status-changed', { loggedIn: true, user: data.user });
          }
        } else if (data.error && data.error.includes('expired')) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
          console.log('[AuthManager] Device login code expired.');
        }
      } catch (err) {
        console.error('[AuthManager] Polling error:', err.message);
      }
    }, 3000);
  }

  setupIpcHandlers() {
    ipcMain.handle('auth:startDeviceLogin', () => this.startDeviceAuthFlow());
    ipcMain.handle('auth:getAuthState', () => {
      const user = getUserInfo();
      const token = getRefreshToken();
      const isLinked = !!(token || user);
      return {
        isLinked,
        user: user || (isLinked ? { email: 'Account User' } : null),
        hostname: require('os').hostname()
      };
    });
    ipcMain.handle('auth:logout', () => {
      clearTokens();
      ipcMain.emit('auth:status-changed', { loggedIn: false });
      return { success: true };
    });
  }
}

const authManager = new AuthManager();
module.exports = { authManager };
