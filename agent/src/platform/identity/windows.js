const { execSync } = require('child_process');
const os = require('os');

/**
 * Windows hardware identity provider.
 * Extracts MachineGuid from Windows Registry & motherboard serial number via WMI.
 * @returns {{ machineGuid: string, boardSerial: string }}
 */
function getHardwareIds() {
    let machineGuid = '';
    let boardSerial = '';
    try {
        machineGuid = execSync('powershell.exe -Command "(Get-ItemProperty -Path \'HKLM:\\SOFTWARE\\Microsoft\\Cryptography\').MachineGuid"').toString().trim();
        boardSerial = execSync('powershell.exe -Command "(Get-WmiObject win32_baseboard | Select-Object -ExpandProperty SerialNumber)"').toString().trim();
        console.log('[Platform] [Identity] Retrieved Windows hardware IDs successfully.');
    } catch (e) {
        console.warn('[Platform] [Identity] Failed to read Windows hardware IDs, using fallback:', e.message);
        machineGuid = os.hostname();
        boardSerial = (os.cpus()[0] && os.cpus()[0].model) ? os.cpus()[0].model : 'unknown-board';
    }
    return { machineGuid, boardSerial };
}

module.exports = { getHardwareIds };
