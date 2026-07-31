const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(app.getPath('userData'), 'chameleon-settings.json');

const DEFAULT_SETTINGS = {
    autoStart: true,
    hardwareAccel: true,
    targetFps: 60
};

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
        }
    } catch (e) {
        console.error('[Settings] Error loading settings:', e.message);
    }
    return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    } catch (e) {
        console.error('[Settings] Error saving settings:', e.message);
    }
}

function getSettings() {
    return loadSettings();
}

function updateSettings(updates) {
    const current = loadSettings();
    const updated = { ...current, ...updates };
    saveSettings(updated);
    return updated;
}

module.exports = {
    getSettings,
    updateSettings
};
