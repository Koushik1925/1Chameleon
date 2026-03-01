const { app, BrowserWindow, Tray, Menu, ipcMain, desktopCapturer, clipboard, powerSaveBlocker } = require('electron');
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
            } else if (data.type === 'key_down') {
                const nutKey = keyMap[data.code];
                if (nutKey !== undefined) {
                    await keyboard.pressKey(nutKey);
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
            console.error('Native Input Error:', e);
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
