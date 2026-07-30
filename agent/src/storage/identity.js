const crypto = require('crypto');
const { safeStorage, app } = require('electron');
const os = require('os');
const fs = require('fs');
const path = require('path');

const IDENTITY_FILE = path.join(app.getPath('userData'), 'chameleon-identity.json');

function loadStore() {
    try {
        if (fs.existsSync(IDENTITY_FILE)) {
            return JSON.parse(fs.readFileSync(IDENTITY_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[Identity] Error loading store:', e.message);
    }
    return {};
}

function saveStore(data) {
    try {
        fs.writeFileSync(IDENTITY_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('[Identity] Error saving store:', e.message);
    }
}

const { getHardwareIds } = require('../platform/identity');

function getOrGenerateDeviceId() {
    const store = loadStore();
    if (store.device_id) {
        // Automatically shorten legacy long IDs
        if (store.device_id.length > 12) {
            store.device_id = store.device_id.substring(0, 12);
            saveStore(store);
        }
        return store.device_id;
    }

    const { machineGuid, boardSerial } = getHardwareIds();
    const installationSalt = crypto.randomBytes(16).toString('hex');
    
    const deviceId = crypto.createHash('sha256')
        .update(`${machineGuid}-${boardSerial}-${installationSalt}`)
        .digest('hex')
        .substring(0, 12);

    store.device_id = deviceId;
    store.installation_salt = installationSalt;
    saveStore(store);
    
    return deviceId;
}

function saveTokens(refreshToken, licenseId, user = null) {
    const store = loadStore();
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const encryptedToken = safeStorage.encryptString(refreshToken).toString('base64');
        store.refresh_token_encrypted = encryptedToken;
    } else {
        store.refresh_token_plain = refreshToken;
    }
    store.license_id = licenseId;
    if (user) {
        store.user_email = user.email;
        store.user_name = user.profile?.name || user.email;
    }
    saveStore(store);
}

function getUserInfo() {
    const store = loadStore();
    if (store.user_email || store.refresh_token_encrypted || store.refresh_token_plain) {
        return {
            email: store.user_email || 'Account User',
            name: store.user_name || store.user_email || 'Account User'
        };
    }
    return null;
}

function getRefreshToken() {
    const store = loadStore();
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
        const encrypted = store.refresh_token_encrypted;
        if (encrypted) {
            try {
                return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
            } catch (e) {
                console.error('[Identity] Failed to decrypt refresh token');
                return null;
            }
        }
    }
    return store.refresh_token_plain;
}

function clearTokens() {
    const store = loadStore();
    delete store.refresh_token_encrypted;
    delete store.refresh_token_plain;
    delete store.license_id;
    delete store.user_email;
    delete store.user_name;
    saveStore(store);
}

module.exports = {
    getOrGenerateDeviceId,
    saveTokens,
    getRefreshToken,
    getUserInfo,
    clearTokens
};
