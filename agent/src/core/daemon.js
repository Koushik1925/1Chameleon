const { io } = require('socket.io-client');
const { getOrGenerateDeviceId, getRefreshToken } = require('../storage/identity');
const { ipcMain } = require('electron');

const SIGNALING_URL = process.env.SIGNALING_URL || 'https://onechameleon.onrender.com';

class Daemon {
    constructor() {
        this.socket = null;
        this.deviceId = getOrGenerateDeviceId();
        this.reconnectAttempts = 0;
        this.maxReconnectDelay = 30000; // 30s
        this.heartbeatInterval = null;
    }

    start() {
        if (this.socket) {
            this.socket.disconnect();
        }

        console.log('[Daemon] Starting persistent background daemon...');
        
        // Disable socket.io's auto-reconnect, we'll use custom exp backoff with jitter
        this.socket = io(SIGNALING_URL, {
            reconnection: false
        });

        this.setupListeners();
    }

    setupListeners() {
        this.socket.on('connect', () => {
            console.log('[Daemon] Connected to signaling server');
            this.reconnectAttempts = 0;
            
            // Authenticate persistently
            const refreshToken = getRefreshToken();
            if (refreshToken) {
                this.socket.emit('agent:authenticate', {
                    device_id: this.deviceId,
                    refresh_token: refreshToken
                });
            } else {
                console.log('[Daemon] No refresh token found. Waiting for pairing.');
                // We just maintain the connection for when the user pairs.
            }
            
            this.startHeartbeat();
        });

        this.socket.on('agent:authenticated', () => {
            console.log('[Daemon] Successfully authenticated persistent identity.');
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`[Daemon] Disconnected: ${reason}`);
            this.stopHeartbeat();
            
            if (reason === 'io server disconnect') {
                // Server explicitly closed connection, maybe token revoked.
                // Don't auto-reconnect immediately.
            } else {
                this.scheduleReconnect();
            }
        });

        this.socket.on('error', async (err) => {
            console.error('[Daemon] Socket error:', err.message);
            if (err.message === 'Invalid credentials or revoked device') {
                console.log('[Daemon] Credentials rejected by server. Clearing tokens and re-registering.');
                const { clearTokens } = require('../storage/identity');
                clearTokens();
                
                // Re-register in background
                const { registrationManager } = require('../services/registrationManager');
                await registrationManager.registerBackground();
                
                // Now retry authentication
                const newRefreshToken = require('../storage/identity').getRefreshToken();
                if (newRefreshToken) {
                    this.socket.emit('agent:authenticate', {
                        device_id: this.deviceId,
                        refresh_token: newRefreshToken
                    });
                }
            }
        });

        // Delegate WebRTC signaling to IPC (so Hidden Renderer can handle it)
        this.socket.on('signal:sdp', (data) => {
            ipcMain.emit('daemon:signal:sdp', data);
        });
        
        this.socket.on('signal:ice', (data) => {
            ipcMain.emit('daemon:signal:ice', data);
        });

        this.socket.on('agent:client_joined', (data) => {
            ipcMain.emit('daemon:client_joined', data);
        });
    }

    scheduleReconnect() {
        // Exponential backoff: 1s, 2s, 5s, 10s, 20s, 30s max + jitter
        let delay = 1000;
        if (this.reconnectAttempts === 1) delay = 2000;
        else if (this.reconnectAttempts === 2) delay = 5000;
        else if (this.reconnectAttempts === 3) delay = 10000;
        else if (this.reconnectAttempts === 4) delay = 20000;
        else if (this.reconnectAttempts >= 5) delay = this.maxReconnectDelay;
        
        // Add up to 20% jitter
        const jitter = Math.random() * 0.2 * delay;
        delay = delay + jitter;

        console.log(`[Daemon] Scheduling reconnect in ${Math.round(delay)}ms...`);
        this.reconnectAttempts++;

        setTimeout(() => {
            if (!this.socket.connected) {
                console.log('[Daemon] Attempting reconnect...');
                this.socket.connect();
            }
        }, delay);
    }

    startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.connected) {
                // We use HTTP for heartbeat as requested, or socket event.
                // The user's spec asked for `POST /devices/heartbeat` API, but since we have a socket, we can use both or either.
                // We will just do a fetch to the REST API.
                fetch(`${SIGNALING_URL}/devices/heartbeat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        device_id: this.deviceId,
                        status: 'online'
                    })
                }).catch(() => {});
            }
        }, 30000); // 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
}

const daemon = new Daemon();
module.exports = { daemon };
