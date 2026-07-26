# 🔐 macOS Permission Management Guide (`MAC_PERMISSIONS.md`)

This document details every macOS system permission required by the **Chameleon Desktop Agent**, why it is needed, how Electron checks and requests it, and how the application gracefully handles permission denials.

---

## 1. Required System Permissions Summary

| Permission | macOS API / Entitlement | Required For | Severity if Denied | Recovery Flow |
|---|---|---|---|---|
| **Accessibility** | `AXIsProcessTrusted` | OS-level mouse & keyboard input injection via `@nut-tree-fork/nut-js` | **Critical**: Host machine can stream video, but viewer cannot send input. | Prompt user to toggle Accessibility in System Settings. |
| **Screen Recording** | `CGRequestScreenCaptureAccess` | Desktop video stream capture via `desktopCapturer` / `getUserMedia` | **Critical**: Stream shows only desktop wallpaper or black screen. | Prompt user to grant Screen Recording in System Settings. |
| **System Notifications** | `NSUserNotification` / UserNotifications | Tray notification badges on remote client connect/disconnect | **Low**: Notifications silently fail; tray icon still updates. | Fallback to tray icon color change. |

---

## 2. In-Depth Permission Analysis & Implementation

### ♿ 1. Accessibility Permission (`AXIsProcessTrusted`)

#### Why Needed
To inject mouse movement (`CGEventCreateMouseEvent`), mouse clicks, and keystrokes (`CGEventCreateKeyboardEvent`) into the macOS window server, Apple requires the host process to be explicitly trusted in System Settings ➔ Privacy & Security ➔ Accessibility.

#### Location in Codebase
[`agent/src/main.js`](file:///Users/dhananjai/Chameleon/agent/src/main.js#L124-L230) in the `ipcMain.on('webrtc:remote_input')` handler.

#### How to Check (Electron API)
```javascript
const { systemPreferences } = require('electron');

function checkAccessibilityPermission() {
    if (process.platform === 'darwin') {
        // Returns true if application is trusted in Accessibility
        return systemPreferences.isTrustedAccessibilityClient(false);
    }
    return true; // Always true on Windows
}
```

#### How to Request & Prompt
```javascript
function requestAccessibilityPermission() {
    if (process.platform === 'darwin') {
        // Passing true opens the macOS system prompt dialog
        const isTrusted = systemPreferences.isTrustedAccessibilityClient(true);
        if (!isTrusted) {
            // Open System Settings directly to the Accessibility pane if not trusted
            const { shell } = require('electron');
            shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
        }
        return isTrusted;
    }
    return true;
}
```

#### Graceful Denial Recovery
If Accessibility permission is not granted:
1. The Desktop Agent displays a warning banner in the `qr.html` window:
   `"⚠️ Accessibility permission required for remote input control."`
2. Provides a direct button: `"Open System Settings"`.
3. Input events received over WebRTC DataChannel are ignored safely without crashing the main process.

---

### 📹 2. Screen Recording Permission (`CGRequestScreenCaptureAccess`)

#### Why Needed
Introduced in macOS Catalina (10.15) and strictly enforced in macOS Sonoma (14.0) and Sequoia (15.0), any process capturing display pixels must be authorized in System Settings ➔ Privacy & Security ➔ Screen Recording.

#### Location in Codebase
[`agent/src/webrtc.html`](file:///Users/dhananjai/Chameleon/agent/src/webrtc.html#L295-L321) in `getScreenStream()`.

#### How to Check & Request (Electron API)
```javascript
const { systemPreferences, shell } = require('electron');

async function checkAndRequestScreenCapturePermission() {
    if (process.platform === 'darwin') {
        const status = systemPreferences.getMediaAccessStatus('screen');
        if (status !== 'granted') {
            // Opening System Settings pane
            shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
            return false;
        }
    }
    return true;
}
```

#### Graceful Denial Recovery
If Screen Recording is denied or reset:
1. `desktopCapturer.getSources()` returns empty thumbnails or a blank stream.
2. The agent detects an empty stream buffer and emits an error state to `qr.html`.
3. Displays step-by-step instructions to enable Screen Recording and restart the application.

---

## 3. Info.plist Entitlements & Descriptions

When building the macOS application bundle with `electron-builder`, `Info.plist` must contain descriptive text explaining why these permissions are requested:

```xml
<key>NSCameraUsageDescription</key>
<string>Chameleon does not use the camera, but requires media permissions for screen sharing.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Chameleon requires microphone permissions for remote audio streaming.</string>
<key>NSScreenCaptureDescription</key>
<string>Chameleon requires Screen Recording permission to stream your desktop display to authorized remote sessions.</string>
```

---
*Generated for Chameleon Engine Team (`MAC_PERMISSIONS.md`).*
