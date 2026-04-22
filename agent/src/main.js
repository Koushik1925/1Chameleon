const { app, BrowserWindow, ipcMain, shell, desktopCapturer, clipboard, powerSaveBlocker, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { mouse, Point, Button, screen: nutScreen, keyboard, Key } = require('@nut-tree-fork/nut-js');

console.log(`[Main] Process starting. PID: ${process.pid}`);

// Global error handlers
process.on('uncaughtException', (err) => console.error('[Main] ❌ Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => console.error('[Main] ❌ Unhandled Rejection:', reason));

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
let licenseWindow = null;
let powerBlockerId = null;

// Core setup
app.disableHardwareAcceleration();

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (licenseWindow) {
            if (licenseWindow.isMinimized()) licenseWindow.restore();
            licenseWindow.focus();
        }
        if (qrWindow) {
            if (qrWindow.isMinimized()) qrWindow.restore();
            qrWindow.focus();
        }
    });
}

function createBackgroundWindow() {
    console.log('[Main] Creating background WebRTC window...');
    backgroundWindow = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    backgroundWindow.loadFile(path.join(__dirname, 'webrtc.html'));
    
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
        if (qrWindow) qrWindow.webContents.send('connection:status', status);
    });

    ipcMain.on('webrtc:qr_payload', (event, payload) => {
        if (qrWindow) qrWindow.webContents.send('qr:data', payload);
    });

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

function createLicenseWindow() {
    if (licenseWindow) { licenseWindow.focus(); return; }
    
    licenseWindow = new BrowserWindow({
        width: 400, height: 600,
        show: false,
        frame: false, // Cleaner UI
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    licenseWindow.loadFile(path.join(__dirname, 'license.html'));
    
    licenseWindow.once('ready-to-show', () => {
        licenseWindow.show();
    });

    licenseWindow.on('closed', () => {
        licenseWindow = null;
    });
}

function createQRWindow() {
    if (qrWindow) { qrWindow.focus(); return; }
    qrWindow = new BrowserWindow({
        width: 320, height: 480, frame: false, alwaysOnTop: true,
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true }
    });
    qrWindow.loadFile(path.join(__dirname, 'qr.html'));
    qrWindow.on('closed', () => { qrWindow = null; });
}

function createTray() {
    const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon-gray.bmp'));
    tray = new Tray(icon);
    const menu = Menu.buildFromTemplate([
        { label: 'Show QR Code', click: createQRWindow },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() }
    ]);
    tray.setContextMenu(menu);
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
    if (licenseWindow) licenseWindow.close();
    createTray();
    createBackgroundWindow();
}

// IPC Handlers
ipcMain.handle('shell:openExternal', async (e, url) => shell.openExternal(url));
ipcMain.handle('license:activate_success', () => continueStartup());

app.whenReady().then(async () => {
    console.log('[Main] App Ready');
    
    const { licenseManager } = require('./services/licenseManager');
    const valid = await licenseManager.initialize();
    
    if (valid) {
        continueStartup();
    } else {
        createLicenseWindow();
    }
});

app.on('window-all-closed', () => {
    // Keep alive for tray
});
