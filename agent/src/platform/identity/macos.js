const { execSync } = require('child_process');
const os = require('os');

/**
 * macOS hardware identity provider.
 * Extracts IOPlatformUUID & IOPlatformSerialNumber via ioreg.
 * Falls back gracefully to sysctl / os.hostname if commands fail.
 * @returns {{ machineGuid: string, boardSerial: string }}
 */
function getHardwareIds() {
    let machineGuid = '';
    let boardSerial = '';

    // 1. Try IOPlatformUUID via ioreg
    try {
        machineGuid = execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { print $3 }' | tr -d '\"'")
            .toString()
            .trim();
    } catch (e) {
        console.warn('[Platform] [Identity] Failed to read macOS IOPlatformUUID via ioreg:', e.message);
    }

    // Fallback 1 for machineGuid: sysctl hw.uuid
    if (!machineGuid) {
        try {
            machineGuid = execSync('sysctl -n hw.uuid').toString().trim();
        } catch (e) {
            console.warn('[Platform] [Identity] Failed to read macOS hw.uuid via sysctl:', e.message);
        }
    }

    // Fallback 2 for machineGuid: os.hostname
    if (!machineGuid) {
        machineGuid = os.hostname();
    }

    // 2. Try IOPlatformSerialNumber via ioreg
    try {
        boardSerial = execSync("ioreg -l | grep IOPlatformSerialNumber | awk '{print $4}' | tr -d '\"'")
            .toString()
            .trim();
    } catch (e) {
        console.warn('[Platform] [Identity] Failed to read macOS SerialNumber via ioreg:', e.message);
    }

    // Fallback 1 for boardSerial: sysctl hw.model
    if (!boardSerial) {
        try {
            boardSerial = execSync('sysctl -n hw.model').toString().trim();
        } catch (e) {
            boardSerial = (os.cpus()[0] && os.cpus()[0].model) ? os.cpus()[0].model : 'apple-silicon';
        }
    }

    console.log('[Platform] [Identity] Retrieved macOS hardware IDs successfully.');
    return { machineGuid, boardSerial };
}

module.exports = { getHardwareIds };
