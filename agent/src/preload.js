const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Methods for QR Window
    onQRCodeData: (callback) => ipcRenderer.on('qr:data', (_event, value) => callback(value)),
    onConnectionStatus: (callback) => ipcRenderer.on('connection:status', (_event, value) => callback(value)),
    closeQRWindow: () => ipcRenderer.send('qr:close'),

    // Methods for WebRTC Hidden Window
    startPairing: () => ipcRenderer.send('webrtc:start_pairing'), // Optional manual trigger from tray
    onStartSession: (callback) => ipcRenderer.on('webrtc:start_session', (_event, url) => callback(url)),
    sendQRPayload: (payload) => ipcRenderer.send('webrtc:qr_payload', payload),
    updateTrayStatus: (status) => ipcRenderer.send('tray:update_status', status),
    startDeviceLogin: () => ipcRenderer.invoke('auth:startDeviceLogin')
});
