const { app, BrowserWindow, ipcMain, shell, desktopCapturer, clipboard, powerSaveBlocker, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { execSync } = require('child_process');
const { mouse, Point, Button, screen: nutScreen, keyboard, Key } = require('@nut-tree-fork/nut-js');

// Initialize the persistent daemon
const { daemon } = require('./core/daemon');
const { getOrGenerateDeviceId } = require('./storage/identity');

console.log(`[Main] Process starting. PID: ${process.pid}`);

process.on('uncaughtException', (err) => console.error('[Main] ❌ Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => console.error('[Main] ❌ Unhandled Rejection:', reason));

const keyMap = { /* ... omitted for brevity but keeping standard ... */
    'Escape': Key.Escape, 'Enter': Key.Return, 'Space': Key.Space,
    'ArrowUp': Key.Up, 'ArrowDown': Key.Down, 'ArrowLeft': Key.Left, 'ArrowRight': Key.Right
};

let tray = null;
let uiWindow = null;
let hiddenWebRtcWindow = null;
let powerBlockerId = null;

app.disableHardwareAcceleration();

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        showUIWindow();
    });
}

function setupAutoLaunch() {
    app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true
    });

    // Fallback registry
    try {
        const exePath = app.getPath('exe');
        execSync(`powershell.exe -Command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'ChameleonAgent' -Value '${exePath} --hidden'"`);
    } catch (e) {
        console.error('[Main] Failed to set registry auto-launch', e);
    }
}

function createHiddenWebRTCWindow() {
    if (hiddenWebRtcWindow) return;
    console.log('[Main] Creating hidden WebRTC window...');
    hiddenWebRtcWindow = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    hiddenWebRtcWindow.loadFile(path.join(__dirname, 'webrtc.html'));

    // Route signaling from Daemon to Renderer
    ipcMain.on('daemon:signal:sdp', (data) => hiddenWebRtcWindow.webContents.send('signal:sdp', data));
    ipcMain.on('daemon:signal:ice', (data) => hiddenWebRtcWindow.webContents.send('signal:ice', data));
    ipcMain.on('daemon:client_joined', (data) => hiddenWebRtcWindow.webContents.send('agent:client_joined', data));

    // Route signaling from Renderer to Daemon
    ipcMain.on('webrtc:signal:sdp', (e, data) => {
        if (daemon.socket) daemon.socket.emit('signal:sdp', data);
    });
    ipcMain.on('webrtc:signal:ice', (e, data) => {
        if (daemon.socket) daemon.socket.emit('signal:ice', data);
    });

    ipcMain.on('tray:update_status', (event, status) => {
        updateTrayIcon(status);
        if (status === 'connected') {
            if (powerBlockerId === null) powerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
        } else {
            if (powerBlockerId !== null) {
                powerSaveBlocker.stop(powerBlockerId);
                powerBlockerId = null;
            }
        }
        if (uiWindow) uiWindow.webContents.send('connection:status', status);
    });

    // Remote input execution
    ipcMain.on('webrtc:remote_input', async (event, data) => {
        try {
            if (data.type === 'mouse_move') {
                const screenWidth = await nutScreen.width();
                const screenHeight = await nutScreen.height();
                const targetX = Math.max(0, Math.min(Math.floor(data.x * screenWidth), screenWidth - 1));
                const targetY = Math.max(0, Math.min(Math.floor(data.y * screenHeight), screenHeight - 1));
                await mouse.setPosition(new Point(targetX, targetY));
            } else if (data.type === 'mouse_down') {
                const btn = data.button === 2 ? Button.RIGHT : (data.button === 1 ? Button.MIDDLE : Button.LEFT);
                await mouse.pressButton(btn);
            } else if (data.type === 'mouse_up') {
                const btn = data.button === 2 ? Button.RIGHT : (data.button === 1 ? Button.MIDDLE : Button.LEFT);
                await mouse.releaseButton(btn);
            } else if (data.type === 'key_down') {
                const nutKey = keyMap[data.code];
                if (nutKey) await keyboard.pressKey(nutKey);
                else if (data.key && data.key.length === 1) await keyboard.type(data.key);
            } else if (data.type === 'key_up') {
                const nutKey = keyMap[data.code];
                if (nutKey) await keyboard.releaseKey(nutKey);
            } else if (data.type === 'clipboard_push') {
                clipboard.writeText(data.text);
            }
        } catch (e) {
            console.error('[Main] Input Error:', e);
        }
    });

    ipcMain.handle('webrtc:clipboard_pull', () => clipboard.readText());
    ipcMain.handle('get-desktop-sources', async () => desktopCapturer.getSources({ types: ['screen'] }));
}

function showUIWindow() {
    if (uiWindow) {
        if (uiWindow.isMinimized()) uiWindow.restore();
        uiWindow.show();
        uiWindow.focus();
        return;
    }
    
    uiWindow = new BrowserWindow({
        width: 400, height: 600,
        show: true,
        frame: false,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Currently, license.html acts as the dashboard
    uiWindow.loadFile(path.join(__dirname, 'license.html'));

    uiWindow.on('close', (e) => {
        // Hide instead of quit
        e.preventDefault();
        uiWindow.hide();
    });
}

function createTray() {
    const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon-gray.bmp'));
    tray = new Tray(icon);
    tray.setToolTip(`Chameleon Device: ${getOrGenerateDeviceId().substring(0,8)}`);
    
    const menu = Menu.buildFromTemplate([
        { label: 'Open Dashboard', click: showUIWindow },
        { type: 'separator' },
        { label: 'Exit', click: () => {
            app.quit();
        }}
    ]);
    tray.setContextMenu(menu);
    
    tray.on('double-click', showUIWindow);
}

function updateTrayIcon(status) {
    if (!tray) return;
    let iconName = 'icon-gray.bmp';
    if (status === 'connected') iconName = 'icon-green.bmp';
    else if (status === 'pairing') iconName = 'icon-yellow.bmp';
    tray.setImage(nativeImage.createFromPath(path.join(__dirname, '..', 'assets', iconName)));
}

function continueStartup() {
    console.log('[Main] 🚀 Continuing startup...');
    createTray();
    daemon.start();
    createHiddenWebRTCWindow();
    
    const isHidden = process.argv.includes('--hidden');
    if (!isHidden) {
        showUIWindow();
    }
}

ipcMain.handle('shell:openExternal', async (e, url) => shell.openExternal(url));
ipcMain.handle('license:activate_success', () => {
    // If user activated via UI, trigger daemon reconnect
    daemon.start();
    showUIWindow();
});

// For IPC named pipes, we can set up a local server, but Electron IPC covers renderer<->main.
// The user requested: "Implement named pipes OR localhost secured IPC server"
// Since we have Electron, we could use native ipcMain. If external processes need it, we'd use net.createServer.
// We'll stick to electron IPC for internal, but let's implement the named pipe if requested by test script.

const { startIPCServer } = require('./ipc/server');

app.whenReady().then(async () => {
    console.log('[Main] App Ready');
    setupAutoLaunch();
    startIPCServer();

    const { licenseManager } = require('./services/licenseManager');
    // Using initialize to check if we have a valid token (or we can just check DPAPI storage)
    const valid = await licenseManager.initialize();
    
    continueStartup();
});

// App lifecycle
app.on('window-all-closed', () => {
    // Keep alive for tray/background
});

// Handle forceful exit
app.on('before-quit', () => {
    if (uiWindow) uiWindow.removeAllListeners('close');
});
