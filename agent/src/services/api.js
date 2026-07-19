const axios = require('axios');

class Api {
  constructor(baseUrl = 'https://chameleon-1.onrender.com') {
    this.baseUrl = baseUrl;
    this.api = axios.create({
      baseURL: baseUrl,
      timeout: 10000
    });
  }

  async registerDevice(email, deviceId) {
    try {
        const response = await this.api.post('/devices/register', {
            email: email,
            device_id: deviceId
        });
        
        if (!response.data || !response.data.success) {
            throw new Error(response.data?.error || 'Registration failed');
        }

        return response.data.data;
    } catch (error) {
        if (error.response) {
            throw new Error(error.response.data?.error || 'Registration failed');
        }
        throw error;
    }
  }
}

module.exports = { Api };
