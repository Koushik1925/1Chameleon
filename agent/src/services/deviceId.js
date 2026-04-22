const os = require('os');
const crypto = require('crypto');

/**
 * Generates a stable OS-based fingerprint.
 * Hostname + Platform + Arch
 */
function getDeviceId() {
  const data = `${os.hostname()}:${os.platform()}:${os.arch()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = { getDeviceId };
