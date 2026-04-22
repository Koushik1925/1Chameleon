const { contextBridge, ipcRenderer } = require('electron');
console.log('[Preload] Initializing bridge...');

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

    license: {
      activate: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),
      getStatus: () => ipcRenderer.invoke('license:getStatus'),
      logout: () => ipcRenderer.invoke('license:logout'),
      getDeviceId: () => ipcRenderer.invoke('license:getDeviceId'),
      onActivateSuccess: () => ipcRenderer.invoke('license:activate_success')
    },
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
});
