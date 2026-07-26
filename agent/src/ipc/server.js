const net = require('net');
const { daemon } = require('../core/daemon');
const { getIPCPath } = require('../platform/ipc');

function startIPCServer() {
    const ipcPath = getIPCPath();
    const server = net.createServer((stream) => {
        console.log('[IPC] Client connected to local endpoint.');

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

    server.listen(ipcPath, () => {
        console.log(`[IPC] Local server listening on ${ipcPath}`);
    });
}

module.exports = { startIPCServer };
