const axios = require('axios');

class LicenseApi {
  constructor(baseUrl = 'http://127.0.0.1:3000') {
    this.baseUrl = baseUrl;
    this.api = axios.create({
      baseURL: baseUrl,
      timeout: 10000
    });
  }

  /**
   * Activate license on a device
   * @returns {Promise<{token: string, status: string, type: string, expires_at: string}>}
   */
  async activate(licenseKey, deviceId) {
    // 1. Activate the license normally
    const response = await this.api.post('/activate', {
      license_key: licenseKey,
      device_id: deviceId
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error?.message || 'Activation failed');
    }

    // 2. Register the device persistently
    try {
        const regRes = await this.api.post('/devices/register', {
            license_key: licenseKey,
            device_id: deviceId
        });
        
        if (regRes.data && regRes.data.success) {
            response.data.data.refresh_token = regRes.data.data.refresh_token;
        }
    } catch (e) {
        console.warn('[LicenseApi] Device persistent registration failed:', e.message);
    }

    return response.data.data;
  }

  /**
   * Validate license using JWT
   * @param {string} token - Short-lived JWT
   * @param {string} deviceId 
   */
  async validate(token, deviceId) {
    try {
      const response = await this.api.post('/validate', {
        device_id: deviceId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.data || !response.data.success) {
        return { valid: false, message: response.data?.error || 'Validation failed' };
      }

      return response.data.data; // Includes refreshed { token, valid, status, ... }
    } catch (error) {
      // Handle 401/429 specifically if needed
      if (error.response) {
        return { 
          valid: false, 
          error: error.response.data?.error, 
          status: error.response.status 
        };
      }
      throw error;
    }
  }
}

module.exports = { LicenseApi };
