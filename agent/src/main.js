const { app, BrowserWindow, Tray, Menu, ipcMain, clipboard, powerSaveBlocker, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const { createNativeInputController } = require('./platform/input');
const runtimeService = require('./platform/runtime');
const screenService = require('./platform/screen');
const startupService = require('./platform/startup');
const trayService = require('./platform/tray');
require('./services/authManager');

const nativeInput = createNativeInputController(clipboard);
const trayAssetsDirectory = trayService.getAssetsDirectory(app.isPackaged);

let tray = null;
let qrWindow = null;
let backgroundWindow = null;
let powerBlockerId = null;
let isControlPaused = false;
let currentConnectionStatus = 'idle';

// ── GPU / ENCODER FLAGS ───────────────────────────────────────────────────────
// IMPORTANT: Do NOT call app.disableHardwareAcceleration().
// Doing so kills NVENC / QuickSync H.264 encoding and forces the CPU to
// encode every frame in software — the #1 cause of high CPU and encode latency.
runtimeService.configure(app.commandLine);

// Prevent multiple instances
try {
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
        console.log("Failed to get single instance lock. Exiting.");
        app.quit();
    } else {
        console.log("Got single instance lock successfully.");
        app.on('second-instance', () => {
            if (qrWindow) {
                if (qrWindow.isMinimized()) qrWindow.restore();
                qrWindow.show();
                qrWindow.focus();
            } else {
                createQRWindow();
            }
        });
    }
} catch (e) {
    console.error(e);
}

function createBackgroundWindow() {
    backgroundWindow = new BrowserWindow({
        show: false, // Keep hidden!
        webPreferences: {
            nodeIntegration: true, // Preserve the existing hidden-renderer module contract
            contextIsolation: false, // Preserve the existing hidden-renderer runtime contract
        }
    });

    backgroundWindow.loadFile(path.join(__dirname, 'webrtc.html'));

    // Forward tray status updates from background process
    ipcMain.on('tray:update_status', (event, status) => {
        currentConnectionStatus = status;
        updateTrayIcon(status);

        // Manage OS Sleep/Suspend behavior
        if (status === 'connected') {
            if (powerBlockerId === null || !powerSaveBlocker.isStarted(powerBlockerId)) {
                console.log("[INFO] Starting powerSaveBlocker to prevent display sleep.");
                powerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
            }
        } else if (status === 'idle') {
            if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) {
                console.log("[INFO] Stopping powerSaveBlocker. System can now sleep.");
                powerSaveBlocker.stop(powerBlockerId);
                powerBlockerId = null;
            }
        }

        // Also notify QR window if it's open
        if (qrWindow) {
            qrWindow.webContents.send('connection:status', status);
        }
    });

    ipcMain.on('session:request_pause_state', (event) => {
        if (backgroundWindow) {
            backgroundWindow.webContents.send('session:pause_state', isControlPaused);
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
        if (isControlPaused) return; // FINAL INJECTION GUARD
        try {
            await nativeInput.handleRemoteInput(data);
        } catch (e) {
            console.error('[INPUT] Native driver error:', e);
        }
    });

    // Handle pulling clipboard from agent to send to client
    ipcMain.handle('webrtc:clipboard_pull', () => {
        return clipboard.readText();
    });
}

function createQRWindow() {
    if (qrWindow) {
        qrWindow.focus();
        return;
    }

    qrWindow = new BrowserWindow({
        width: 380,
        height: 600,
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
    const icon = trayService.createIcon(
        nativeImage,
        trayAssetsDirectory,
        'icon-gray'
    );

    tray = new Tray(icon);
    tray.setToolTip('Service Host (Idle)');

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
    let tooltip = 'Service Host';
    let iconBase = 'icon-gray';

    // Update icon colors based on status
    if (isControlPaused && status === 'connected') {
        tooltip = 'Service Host (Paused by Host)';
        iconBase = 'icon-yellow';
    } else if (status === 'connected') {
        tooltip = 'Service Host (Connected)';
        iconBase = 'icon-green';
    } else if (status === 'pairing') {
        tooltip = 'Service Host (Pairing...)';
        iconBase = 'icon-yellow';
    } else {
        tooltip = 'Service Host (Idle)';
    }

    if (tray) {
        tray.setToolTip(tooltip);
        tray.setImage(
            trayService.createIcon(
                nativeImage,
                trayAssetsDirectory,
                iconBase
            )
        );
    }
}

app.whenReady().then(async () => {
    startupService.configureAutoStart(app);

    createTray();
    createBackgroundWindow();

    // Register emergency pause global shortcut
    globalShortcut.register('CommandOrControl+Alt+P', () => {
        isControlPaused = !isControlPaused;
        console.log(`[PAUSE] Control is now ${isControlPaused ? 'PAUSED' : 'RESUMED'}`);
        updateTrayIcon(currentConnectionStatus);
        if (backgroundWindow) {
            backgroundWindow.webContents.send('session:pause_state', isControlPaused);
        }
    });

    // Handle IPC for getting screen sources
    ipcMain.handle(
        'get-desktop-sources',
        () => screenService.getDesktopSources()
    );

    ipcMain.on('qr:close', () => {
        if (qrWindow) {
            qrWindow.close();
        }
    });

    await startupService.runPostReady(createQRWindow);
});

app.on('window-all-closed', () => {
    // Overriding default behavior to keep app running in tray
});

app.on('activate', () => {
    startupService.handleActivate(createQRWindow);
});
