const { app, BrowserWindow, Tray, Menu, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const { mouse, Point, Button, screen: nutScreen, keyboard, Key } = require('@nut-tree-fork/nut-js');

let tray = null;
let qrWindow = null;
let backgroundWindow = null;

// Allow self-signed certs for testing signaling server if HTTPS
try {
    app.disableHardwareAcceleration(); // Prevent GPU crash
    app.commandLine.appendSwitch('disable-gpu-shader-disk-cache'); // Prevent Access Denied on cache
    app.commandLine.appendSwitch('ignore-certificate-errors');
} catch (e) {
    console.error(e);
}

// Prevent multiple instances
try {
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
        console.log("Failed to get single instance lock. Exiting.");
        app.quit();
    } else {
        console.log("Got single instance lock successfully.");
    }
} catch (e) {
    console.error(e);
}

function createBackgroundWindow() {
    backgroundWindow = new BrowserWindow({
        show: false, // Keep hidden!
        webPreferences: {
            nodeIntegration: true, // Needed for simple MVP, better to use preload in prod
            contextIsolation: false, // Needed to use desktopCapturer directly in renderer easily for MVP
        }
    });

    backgroundWindow.loadFile(path.join(__dirname, 'webrtc.html'));

    // Forward tray status updates from background process
    ipcMain.on('tray:update_status', (event, status) => {
        updateTrayIcon(status);
        // Also notify QR window if it's open
        if (qrWindow) {
            qrWindow.webContents.send('connection:status', status);
        }
    });

    // Forward QR payload from background to main, to show in UI
    ipcMain.on('webrtc:qr_payload', (event, payload) => {
        if (qrWindow) {
            qrWindow.webContents.send('qr:data', payload);
        }
    });

    // Execute remote input via native driver
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
            }
        } catch (e) {
            console.error('Native Input Error:', e);
        }
    });
}

function createQRWindow() {
    if (qrWindow) {
        qrWindow.focus();
        return;
    }

    qrWindow = new BrowserWindow({
        width: 320,
        height: 480,
        show: false,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    qrWindow.loadFile(path.join(__dirname, 'qr.html'));

    qrWindow.once('ready-to-show', () => {
        qrWindow.show();
        // Ask background process to start pairing
        if (backgroundWindow) {
            backgroundWindow.webContents.send('session:request_pairing');
        }
    });

    qrWindow.on('closed', () => {
        qrWindow = null;
    });
}

// Tray Management
function createTray() {
    const { nativeImage } = require('electron');
    const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon-gray.bmp'));

    tray = new Tray(icon);
    tray.setToolTip('Chameleon Agent (Idle)');

    updateContext_menu();
}

function updateContext_menu() {
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show QR Code', click: () => createQRWindow() },
        { type: 'separator' },
        {
            label: 'Disconnect', click: () => {
                if (backgroundWindow) {
                    backgroundWindow.webContents.send('session:disconnect');
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Quit', click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
}

function updateTrayIcon(status) {
    const { nativeImage } = require('electron');
    let tooltip = 'Chameleon Agent';
    let iconPath = 'icon-gray.bmp';

    // Update icon colors based on status
    if (status === 'connected') {
        tooltip = 'Chameleon Agent (Connected)';
        iconPath = 'icon-green.bmp';
    } else if (status === 'pairing') {
        tooltip = 'Chameleon Agent (Pairing...)';
        iconPath = 'icon-yellow.bmp';
    } else {
        tooltip = 'Chameleon Agent (Idle)';
    }

    if (tray) {
        tray.setToolTip(tooltip);
        tray.setImage(nativeImage.createFromPath(path.join(__dirname, '..', 'assets', iconPath)));
    }
}

app.whenReady().then(() => {
    // Basic Auto-start Logic
    if (app.isPackaged) {
        app.setLoginItemSettings({
            openAtLogin: true,
            path: app.getPath('exe')
        });
    }

    createTray();
    createBackgroundWindow();

    // Handle IPC for getting screen sources
    ipcMain.handle('get-desktop-sources', async () => {
        return await desktopCapturer.getSources({ types: ['screen'] });
    });

    ipcMain.on('qr:close', () => {
        if (qrWindow) {
            qrWindow.close();
        }
    });
});

app.on('window-all-closed', () => {
    // Overriding default behavior to keep app running in tray
});
