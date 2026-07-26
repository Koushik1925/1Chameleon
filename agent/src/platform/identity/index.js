const os = require('os');
const windowsIdentity = require('./windows');
const macosIdentity = require('./macos');

/**
 * Cross-platform hardware identity abstraction interface.
 * Delegates to platform-specific identity providers.
 * @returns {{ machineGuid: string, boardSerial: string }}
 */
function getHardwareIds() {
    const platform = os.platform();
    if (platform === 'win32') {
        return windowsIdentity.getHardwareIds();
    } else if (platform === 'darwin') {
        return macosIdentity.getHardwareIds();
    } else {
        console.warn(`[Platform] [Identity] Unsupported platform '${platform}', using default fallback.`);
        return {
            machineGuid: os.hostname(),
            boardSerial: (os.cpus()[0] && os.cpus()[0].model) ? os.cpus()[0].model : 'generic-posix'
        };
    }
}

module.exports = { getHardwareIds };
