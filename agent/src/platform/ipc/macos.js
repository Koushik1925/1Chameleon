'use strict';

const os = require('os');
const path = require('path');

const SOCKET_NAME = 'chameleon-agent.sock';

/**
 * Returns the Unix domain socket path used by node:net on macOS.
 *
 * @param {string} tempDirectory
 * @returns {string}
 */
function getIPCPath(tempDirectory = os.tmpdir()) {
    return path.join(tempDirectory, SOCKET_NAME);
}

module.exports = { getIPCPath };
