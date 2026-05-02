const { execSync } = require('child_process');
const crypto = require('crypto');
const { safeStorage } = require('electron');
const Store = require('electron-store');
const os = require('os');

const store = new Store({ name: 'chameleon-identity' });

function getHardwareIds() {
    let machineGuid = '';
    let boardSerial = '';
    try {
        if (os.platform() === 'win32') {
            machineGuid = execSync('powershell.exe -Command "(Get-ItemProperty -Path \'HKLM:\\SOFTWARE\\Microsoft\\Cryptography\').MachineGuid"').toString().trim();
            boardSerial = execSync('powershell.exe -Command "(Get-WmiObject win32_baseboard | Select-Object -ExpandProperty SerialNumber)"').toString().trim();
        } else {
            // Fallbacks for other OS (if applicable, though user requested Windows-only)
            machineGuid = os.hostname();
            boardSerial = 'unknown-board';
        }
    } catch (e) {
        console.warn('[Identity] Failed to read hardware IDs, using fallback');
        machineGuid = os.hostname();
        boardSerial = os.cpus()[0].model;
    }
    return { machineGuid, boardSerial };
}

function getOrGenerateDeviceId() {
    let savedId = store.get('device_id');
    if (savedId) {
        return savedId;
    }

    const { machineGuid, boardSerial } = getHardwareIds();
    const installationSalt = crypto.randomBytes(16).toString('hex');
    
    const deviceId = crypto.createHash('sha256')
        .update(`${machineGuid}-${boardSerial}-${installationSalt}`)
        .digest('hex');

    store.set('device_id', deviceId);
    store.set('installation_salt', installationSalt);
    
    return deviceId;
}

function saveTokens(refreshToken, licenseId) {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const encryptedToken = safeStorage.encryptString(refreshToken);
        store.set('refresh_token_encrypted', encryptedToken);
    } else {
        store.set('refresh_token_plain', refreshToken);
    }
    store.set('license_id', licenseId);
}

function getRefreshToken() {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const encrypted = store.get('refresh_token_encrypted');
        if (encrypted) {
            try {
                return safeStorage.decryptString(Buffer.from(encrypted));
            } catch (e) {
                console.error('[Identity] Failed to decrypt refresh token');
                return null;
            }
        }
    }
    return store.get('refresh_token_plain');
}

function clearTokens() {
    store.delete('refresh_token_encrypted');
    store.delete('refresh_token_plain');
    store.delete('license_id');
}

module.exports = {
    getOrGenerateDeviceId,
    saveTokens,
    getRefreshToken,
    clearTokens
};
