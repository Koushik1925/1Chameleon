# 🔬 Electron macOS Startup Flow Analysis (`STARTUP_ANALYSIS.md`)

This document traces the exact execution path of the Chameleon Desktop Agent during application startup, identifying why the processes start successfully on macOS while no visible application window or UI appears.

---

## 1. Trace of Execution Steps

```
package.json ("main": "src/main.js")
       │
       ▼
main.js Module Initialization
  ├── Sets GPU switches (enable-accelerated-video-encode, etc.)
  └── Checks Single Instance Lock (app.requestSingleInstanceLock())
       │
       ▼
app.whenReady() Event Handler (lines 331–363)
  ├── 1. app.setLoginItemSettings() [If packaged]
  ├── 2. createTray()
  │       └── Loads assets/icon-gray.bmp & sets tray context menu
  ├── 3. createBackgroundWindow()
  │       └── Creates BrowserWindow({ show: false }) & loads webrtc.html
  ├── 4. Register global shortcuts (Cmd/Ctrl+Alt+P)
  └── 5. Attach IPC Handlers ('get-desktop-sources', 'qr:close', etc.)
```

---

## 2. Step-by-Step Step Audit

| Step | File & Function | Executes on macOS? | Blocking Risk? | Platform-Specific / Windows Assumptions |
|---|---|---|---|---|
| **1. Entry Point** | `agent/package.json`<br>`"main": "src/main.js"` | ✅ Yes | ❌ No | `"productName": "Antimalware Service Executable"` (Windows stealth binary name). |
| **2. GPU Flags** | `agent/src/main.js`<br>Top-level (L46–59) | ✅ Yes | ❌ No | Includes `disable-gpu-shader-disk-cache` (Windows shader cache permission workaround). |
| **3. Lock Guard** | `agent/src/main.js`<br>`requestSingleInstanceLock()` (L62–72) | ✅ Yes | ❌ No | Operates cross-platform. Lock acquired successfully. |
| **4. App Boot** | `agent/src/main.js`<br>`app.whenReady()` (L331–363) | ✅ Yes | ❌ No | Calls `createTray()` and `createBackgroundWindow()`. |
| **5. Auto-Start** | `agent/src/main.js`<br>`app.setLoginItemSettings()` (L333–338) | ✅ Yes | ⚠️ Low | `app.getPath('exe')` returns inner binary path on macOS bundle. |
| **6. Tray Setup** | `agent/src/main.js`<br>`createTray()` (L274–282) | ✅ Yes | 🔴 **CRITICAL** | Loads `assets/icon-gray.bmp`. BMP is a Windows-only bitmap format that fails to render in macOS Menu Bar. |
| **7. Background Window** | `agent/src/main.js`<br>`createBackgroundWindow()` (L74–84) | ✅ Yes | ❌ No | Intentionally created with `{ show: false }` to run `webrtc.html` in background. |
| **8. UI Presentation** | `agent/src/main.js`<br>`createQRWindow()` (L238–271) | ❌ **NOT CALLED AT BOOT** | 🔴 **CRITICAL** | `createQRWindow()` is **NEVER** called in `app.whenReady()`. It is only opened via Tray menu `"Show QR Code"`. |
| **9. Dock Activation** | `agent/src/main.js`<br>`app.on('activate')` | ❌ **MISSING** | 🔴 **CRITICAL** | Missing macOS `activate` handler; clicking app in macOS Dock does nothing. |

---

## 3. Root Cause Analysis: Why No UI Appears on macOS

The application process is running normally in the background, but no UI is visible due to **three compounding factors**:

1. **Startup is Intentionally Tray-Only & Hidden by Design**:
   - `createBackgroundWindow()` instantiates a hidden `BrowserWindow({ show: false })` hosting `webrtc.html`. This window is intentionally never shown to the user.
   - `createQRWindow()` (the visible pairing UI window) is **never invoked during `app.whenReady()`**.

2. **Windows BMP Format Fails to Render in macOS Menu Bar**:
   - `createTray()` attempts to load `path.join(__dirname, '..', 'assets', 'icon-gray.bmp')`.
   - On macOS, the top status bar (Menu Bar) expects transparent PNG images formatted as template images (`iconTemplate.png` / `iconTemplate@2x.png`).
   - Loading `icon-gray.bmp` on macOS results in an invalid or 0-width invisible entry in the macOS Menu Bar.

3. **No Tray Interaction Possible ➔ QR Window Cannot Be Opened**:
   - Because the tray icon is invisible in the macOS Menu Bar, the user cannot click `"Show QR Code"`.
   - Furthermore, `main.js` lacks an `app.on('activate')` listener, so clicking the application icon in the macOS Dock or Finder also fails to present the window.

---

## 4. Recommended Smallest Change to Make UI Visible on macOS

To make the application UI visible on macOS without altering Windows startup behavior:

### Recommendation 1: Automatically Show QR Window on macOS Startup
In `agent/src/main.js`, update `app.whenReady()` to automatically present `createQRWindow()` when running on macOS (`process.platform === 'darwin'`):

```javascript
app.whenReady().then(() => {
    ...
    createTray();
    createBackgroundWindow();

    // Auto-open QR pairing window on macOS startup or when tray is unavailable
    if (process.platform === 'darwin') {
        createQRWindow();
    }
    ...
});
```

### Recommendation 2: Handle macOS Dock `activate` Event
Add the standard macOS `activate` event handler to `agent/src/main.js`:

```javascript
app.on('activate', () => {
    // Show QR window when user clicks application icon in macOS Dock
    createQRWindow();
});
```

### Recommendation 3: Provide Native PNG Tray Icons for macOS
Add PNG tray assets (`icon-gray.png`, `icon-green.png`, `icon-yellow.png`) and update `createTray()` / `updateTrayIcon()` to load PNG icons on macOS with `icon.setTemplateImage(true)` support.

---
*Generated for Chameleon Engine Team (`STARTUP_ANALYSIS.md`).*
