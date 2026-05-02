const net = require('net');
const path = require('path');
const { daemon } = require('../core/daemon');

const PIPE_NAME = 'chameleon-agent';
const PIPE_PATH = `\\\\.\\pipe\\${PIPE_NAME}`;

function startIPCServer() {
    const server = net.createServer((stream) => {
        console.log('[IPC] Client connected to named pipe.');

        stream.on('data', (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (message.command === 'status') {
                    stream.write(JSON.stringify({ 
                        status: daemon.socket && daemon.socket.connected ? 'online' : 'offline',
                        deviceId: daemon.deviceId
                    }) + '\n');
                } else if (message.command === 'reconnect') {
                    daemon.start();
                    stream.write(JSON.stringify({ success: true }) + '\n');
                }
            } catch (e) {
                console.error('[IPC] Malformed message', e.message);
            }
        });

        stream.on('end', () => {
            console.log('[IPC] Client disconnected');
        });
    });

    server.on('error', (err) => {
        console.error('[IPC] Server Error:', err);
    });

    server.listen(PIPE_PATH, () => {
        console.log(`[IPC] Named pipe server listening on ${PIPE_PATH}`);
    });
}

module.exports = { startIPCServer };
