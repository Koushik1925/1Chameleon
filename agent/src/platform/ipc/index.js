'use strict';

const os = require('os');
const macosIPC = require('./macos');
const windowsIPC = require('./windows');

/**
 * Returns the local IPC endpoint for the requested platform.
 * Windows uses its existing named pipe; POSIX platforms use a Unix socket.
 *
 * @param {NodeJS.Platform} platform
 * @param {string} tempDirectory
 * @returns {string}
 */
function getIPCPath(platform = process.platform, tempDirectory = os.tmpdir()) {
    if (platform === 'win32') {
        return windowsIPC.getIPCPath();
    }

    return macosIPC.getIPCPath(tempDirectory);
}

module.exports = { getIPCPath };
