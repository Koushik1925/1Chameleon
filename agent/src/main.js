const { app, BrowserWindow, Tray, Menu, ipcMain, clipboard, powerSaveBlocker, globalShortcut, nativeImage, shell } = require('electron');
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
        width: 980,
        height: 680,
        minWidth: 880,
        minHeight: 620,
        show: false,
        frame: false,
        resizable: true,
        alwaysOnTop: false,
        skipTaskbar: true,
        icon: path.join(trayAssetsDirectory, 'icon-gray.png'),
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

    qrWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            qrWindow.hide();
            return false;
        }
    });

    qrWindow.on('minimize', (event) => {
        event.preventDefault();
        qrWindow.hide();
    });

    qrWindow.on('closed', () => {
        qrWindow = null;
    });
}

ipcMain.on('window:minimize', () => {
    if (qrWindow) qrWindow.hide();
});
ipcMain.on('window:maximize', () => {
    if (qrWindow) {
        if (qrWindow.isMaximized()) qrWindow.unmaximize();
        else qrWindow.maximize();
    }
});
ipcMain.on('window:close', () => {
    if (qrWindow) qrWindow.hide();
});

// Tray Management
function toggleWindowVisibility() {
    if (!qrWindow) {
        createQRWindow();
        return;
    }
    if (qrWindow.isVisible() && !qrWindow.isMinimized()) {
        qrWindow.hide();
    } else {
        qrWindow.show();
        qrWindow.focus();
    }
}

function createTray() {
    let icon = trayService.createIcon(
        nativeImage,
        trayAssetsDirectory,
        'icon-gray'
    );
    if (!icon || (typeof icon.isEmpty === 'function' && icon.isEmpty())) {
        icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);
    tray.setToolTip('Service Host (Idle)');

    tray.on('click', () => toggleWindowVisibility());
    tray.on('double-click', () => toggleWindowVisibility());

    updateContext_menu();
}

function updateContext_menu() {
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Open Service Host', click: () => toggleWindowVisibility() },
        { type: 'separator' },
        {
            label: 'Disconnect Session', click: () => {
                if (backgroundWindow) {
                    backgroundWindow.webContents.send('session:disconnect');
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Exit', click: () => {
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
    try {
        startupService.configureAutoStart(app);
    } catch (e) {
        console.error('[Startup] AutoStart error:', e);
    }

    const hideTray = process.env.CHAMELEON_HIDE_TRAY === 'true' ||
                     process.env.CHAMELEON_HIDE_TRAY === '1' ||
                     process.argv.includes('--hide-tray') ||
                     process.argv.includes('--no-tray');
    if (!hideTray) {
        try {
            createTray();
        } catch (e) {
            console.error('[Tray] Tray creation error:', e);
        }
    }

    try {
        createBackgroundWindow();
    } catch (e) {
        console.error('[Background] BackgroundWindow error:', e);
    }

    // Always create and present the UI pairing window immediately!
    createQRWindow();

    // Register emergency pause global shortcut
    try {
        globalShortcut.register('CommandOrControl+Alt+P', () => {
            isControlPaused = !isControlPaused;
            console.log(`[PAUSE] Control is now ${isControlPaused ? 'PAUSED' : 'RESUMED'}`);
            updateTrayIcon(currentConnectionStatus);
            if (backgroundWindow) {
                backgroundWindow.webContents.send('session:pause_state', isControlPaused);
            }
        });
    } catch (e) {}

    // Handle IPC for getting screen sources
    ipcMain.handle(
        'get-desktop-sources',
        () => screenService.getDesktopSources()
    );

    ipcMain.on('get-hardware-ids-sync', (event) => {
        try {
            const { getHardwareIds } = require('./platform/identity');
            event.returnValue = getHardwareIds();
        } catch (e) {
            console.error('[IPC] Failed to get hardware IDs in main:', e);
            event.returnValue = { machineGuid: '', boardSerial: '' };
        }
    });

    ipcMain.on('qr:close', () => {
        if (qrWindow) {
            qrWindow.close();
        }
    });

    // Settings IPC Handlers
    const { getSettings, updateSettings } = require('./storage/settings');
    ipcMain.handle('settings:get', () => getSettings());
    ipcMain.handle('settings:update', (_event, updates) => {
        const updated = updateSettings(updates);
        if (updates.autoStart !== undefined) {
            try {
                app.setLoginItemSettings({
                    openAtLogin: updates.autoStart,
                    path: app.getPath('exe')
                });
            } catch (e) {}
        }
        if (updates.targetFps !== undefined && backgroundWindow) {
            try {
                backgroundWindow.webContents.send('settings:fps_changed', updates.targetFps);
            } catch (e) {}
        }
        return updated;
    });

    ipcMain.on('system:open_url', (_event, url) => {
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            shell.openExternal(url);
        }
    });

    ipcMain.on('system:open_billing', () => {
        const billingUrl = process.env.BILLING_PORTAL_URL || 'http://localhost:5173/billing';
        shell.openExternal(billingUrl);
    });

    ipcMain.on('subscription:updated', (_event, data) => {
        if (qrWindow && !qrWindow.isDestroyed()) {
            qrWindow.webContents.send('subscription:updated', data);
        }
    });

    ipcMain.on('subscription:expired', (_event, data) => {
        if (qrWindow && !qrWindow.isDestroyed()) {
            qrWindow.webContents.send('subscription:expired', data);
        }
    });
});

app.on('window-all-closed', () => {
    // Overriding default behavior to keep app running in tray
});

app.on('activate', () => {
    startupService.handleActivate(createQRWindow);
});
