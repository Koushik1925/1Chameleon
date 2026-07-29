'use strict';

/**
 * agent/src/platform/ipc/windows.js
 *
 * Windows IPC path provider.
 * Returns the Win32 Named Pipe path used by node:net on Windows.
 *
 * Named Pipes on Windows:
 *   - Path format: \\.\pipe\<name>
 *   - node:net.Server.listen() accepts this string directly on win32.
 *   - There is no filesystem object; the kernel handles routing.
 */

const PIPE_NAME = 'chameleon-agent';

/**
 * Returns the platform-appropriate IPC socket/pipe path.
 * @returns {string}  Win32 Named Pipe path.
 */
function getIPCPath() {
    return `\\\\.\\pipe\\${PIPE_NAME}`;
}

module.exports = { getIPCPath };
