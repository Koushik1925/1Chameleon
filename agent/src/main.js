const { app, BrowserWindow, Tray, Menu, ipcMain, desktopCapturer, clipboard, powerSaveBlocker, globalShortcut } = require('electron');
const path = require('path');
const { mouse, Point, Button, screen: nutScreen, keyboard, Key } = require('@nut-tree-fork/nut-js');

const keyMap = {
    'Escape': Key.Escape, 'Tab': Key.Tab, 'ShiftLeft': Key.LeftShift, 'ShiftRight': Key.RightShift,
    'ControlLeft': Key.LeftControl, 'ControlRight': Key.RightControl, 'AltLeft': Key.LeftAlt, 'AltRight': Key.RightAlt,
    'MetaLeft': Key.LeftSuper, 'MetaRight': Key.RightSuper, 'Enter': Key.Return, 'NumpadEnter': Key.Return,
    'Backspace': Key.Backspace, 'Space': Key.Space, 'ArrowUp': Key.Up, 'ArrowDown': Key.Down,
    'ArrowLeft': Key.Left, 'ArrowRight': Key.Right, 'Home': Key.Home, 'End': Key.End,
    'PageUp': Key.PageUp, 'PageDown': Key.PageDown, 'Delete': Key.Delete, 'Insert': Key.Insert, 'CapsLock': Key.CapsLock,

    'KeyA': Key.A, 'KeyB': Key.B, 'KeyC': Key.C, 'KeyD': Key.D, 'KeyE': Key.E, 'KeyF': Key.F, 'KeyG': Key.G,
    'KeyH': Key.H, 'KeyI': Key.I, 'KeyJ': Key.J, 'KeyK': Key.K, 'KeyL': Key.L, 'KeyM': Key.M, 'KeyN': Key.N,
    'KeyO': Key.O, 'KeyP': Key.P, 'KeyQ': Key.Q, 'KeyR': Key.R, 'KeyS': Key.S, 'KeyT': Key.T, 'KeyU': Key.U,
    'KeyV': Key.V, 'KeyW': Key.W, 'KeyX': Key.X, 'KeyY': Key.Y, 'KeyZ': Key.Z,

    'Digit1': Key.Num1, 'Digit2': Key.Num2, 'Digit3': Key.Num3, 'Digit4': Key.Num4, 'Digit5': Key.Num5,
    'Digit6': Key.Num6, 'Digit7': Key.Num7, 'Digit8': Key.Num8, 'Digit9': Key.Num9, 'Digit0': Key.Num0,

    'Numpad1': Key.Num1, 'Numpad2': Key.Num2, 'Numpad3': Key.Num3, 'Numpad4': Key.Num4, 'Numpad5': Key.Num5,
    'Numpad6': Key.Num6, 'Numpad7': Key.Num7, 'Numpad8': Key.Num8, 'Numpad9': Key.Num9, 'Numpad0': Key.Num0,

    'Minus': Key.Minus, 'Equal': Key.Equal, 'BracketLeft': Key.BracketLeft, 'BracketRight': Key.BracketRight,
    'Backslash': Key.Backslash, 'Semicolon': Key.Semicolon, 'Quote': Key.Quote, 'Comma': Key.Comma,
    'Period': Key.Period, 'Slash': Key.Slash, 'Backquote': Key.Grave
};

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
try {
    // Allow Chromium's hardware video encoder to use the GPU
    app.commandLine.appendSwitch('enable-accelerated-video-encode');
    // Use the GPU process for video decode on the viewer side too
    app.commandLine.appendSwitch('enable-accelerated-video-decode');
    // Prefer H.264 hardware encode path in WebRTC (overrides VP8 default)
    app.commandLine.appendSwitch('enable-features', 'WebRtcHideLocalIpsWithMdns,PlatformHEVCEncoderSupport');
    // Ignore self-signed cert errors for the dev signaling server
    app.commandLine.appendSwitch('ignore-certificate-errors');
    // Prevent shader cache permission errors on Windows
    app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
} catch (e) {
    console.error('[GPU] Flag error:', e);
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
            if (data.type === 'mouse_move') {
                const screenWidth = await nutScreen.width();
                const screenHeight = await nutScreen.height();
                const targetX = Math.max(0, Math.min(Math.floor(data.x * screenWidth), screenWidth - 1));
                const targetY = Math.max(0, Math.min(Math.floor(data.y * screenHeight), screenHeight - 1));
                // FIRE-AND-FORGET: do NOT await mouse.setPosition().
                // Awaiting blocks the IPC handler for 1-3ms on each mouse event.
                // Since we only care about the LATEST position (not acknowledgment),
                // fire the OS call and immediately return to handle the next event.
                mouse.setPosition(new Point(targetX, targetY)).catch(() => {});

            } else if (data.type === 'mouse_down') {
                const btn = data.button === 2 ? Button.RIGHT : (data.button === 1 ? Button.MIDDLE : Button.LEFT);
                await mouse.pressButton(btn);

            } else if (data.type === 'mouse_up') {
                const btn = data.button === 2 ? Button.RIGHT : (data.button === 1 ? Button.MIDDLE : Button.LEFT);
                await mouse.releaseButton(btn);

            } else if (data.type === 'mouse_wheel') {
                // Scroll wheel support — deltaY positive = scroll down
                // nut-js scroll unit is 'lines', so divide pixels by a sensitivity factor
                const lines = Math.round(data.deltaY / 100);
                if (lines !== 0) {
                    await mouse.scrollDown(Math.abs(lines) * (lines > 0 ? 1 : -1));
                }

            } else if (data.type === 'key_down') {
                const nutKey = keyMap[data.code];
                if (nutKey !== undefined) {
                    await keyboard.pressKey(nutKey);
                } else if (data.key && data.key.length === 1) {
                    // Printable character not in keyMap (e.g. shifted symbols like : " { } [ ] < > ?)
                    // Use keyboard.type() so nut-js handles the Shift modifier automatically
                    await keyboard.type(data.key);
                }

            } else if (data.type === 'key_up') {
                const nutKey = keyMap[data.code];
                if (nutKey !== undefined) {
                    await keyboard.releaseKey(nutKey);
                }

            } else if (data.type === 'clipboard_push') {
                clipboard.writeText(data.text);
            }
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
    const { nativeImage } = require('electron');
    let tooltip = 'Service Host';
    let iconPath = 'icon-gray.bmp';

    // Update icon colors based on status
    if (isControlPaused && status === 'connected') {
        tooltip = 'Service Host (Paused by Host)';
        iconPath = 'icon-yellow.bmp'; // Using yellow to denote paused
    } else if (status === 'connected') {
        tooltip = 'Service Host (Connected)';
        iconPath = 'icon-green.bmp';
    } else if (status === 'pairing') {
        tooltip = 'Service Host (Pairing...)';
        iconPath = 'icon-yellow.bmp';
    } else {
        tooltip = 'Service Host (Idle)';
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
