# 🔍 macOS Compatibility Audit (`MAC_COMPATIBILITY_AUDIT.md`)

This document is a comprehensive, line-by-line audit of all Windows-specific implementations, OS assumptions, native API calls, and platform checks across the **Chameleon** repository.

---

## 1. Executive Summary

The Chameleon application is fully operational on Windows 10/11. To achieve **100% native macOS compatibility** (both Apple Silicon `arm64` and Intel `x64`) while preserving complete backward compatibility with Windows, several platform-specific areas must be adapted:

1. **Hardware Identity Extraction**: PowerShell `MachineGuid` and WMI queries fail on macOS, causing fallback to unstable hostname values.
2. **IPC Named Pipe**: Windows Pipe syntax `\\.\pipe\chameleon-agent` throws `ENOENT`/`EINVAL` errors on macOS POSIX sockets.
3. **Tray Icon Assets**: BMP format images (`icon-gray.bmp`) do not support macOS dark/light mode menu bar auto-theming (requires PNG template images).
4. **Input Injection & Coordinates**: `@nut-tree-fork/nut-js` relies on macOS Accessibility permissions (`AXIsProcessTrusted`) and requires Retina (High-DPI) scaling awareness.
5. **Screen Capture Permissions**: macOS Catalina (10.15+) and macOS Sonoma/Sequoia require explicit Screen Recording permissions (`CGRequestScreenCaptureAccess`).

---

## 2. Line-by-Line Windows-Specific Audit

### 📁 1. `agent/src/storage/identity.js`

#### Occurrence 1: Hardware GUID & Serial Extraction
- **File**: [`agent/src/storage/identity.js`](file:///Users/dhananjai/Chameleon/agent/src/storage/identity.js#L29-L46)
- **Lines**: 29–46
- **Current Code**:
  ```javascript
  if (os.platform() === 'win32') {
      machineGuid = execSync('powershell.exe -Command "(Get-ItemProperty -Path \'HKLM:\\SOFTWARE\\Microsoft\\Cryptography\').MachineGuid"').toString().trim();
      boardSerial = execSync('powershell.exe -Command "(Get-WmiObject win32_baseboard | Select-Object -ExpandProperty SerialNumber)"').toString().trim();
  } else {
      machineGuid = os.hostname();
      boardSerial = 'unknown-board';
  }
  ```
- **Purpose**: Retrieves permanent hardware identifiers to generate a deterministic, unique 12-character device ID (`device_id`).
- **Why Windows-Specific**: Calls `powershell.exe`, Windows Registry (`HKLM:\SOFTWARE\Microsoft\Cryptography`), and WMI `win32_baseboard`.
- **macOS Issue**: On macOS, `execSync` for `powershell.exe` throws an `ENOENT` error. The current fallback uses `os.hostname()`, which changes dynamically when switching Wi-Fi networks or renaming the computer (e.g., `MacBook-Pro.local`), breaking the permanent hardware identity.
- **macOS Equivalent**: 
  - Hardware UUID (`IOPlatformUUID`): `ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { print $3 }' | tr -d '"'`
  - Serial Number (`IOPlatformSerialNumber`): `ioreg -l | grep IOPlatformSerialNumber | awk '{print $4}' | tr -d '"'`
- **Linux Equivalent**: Read `/etc/machine-id` or `/var/lib/dbus/machine-id` + `cat /sys/class/dmi/id/product_uuid`.

---

### 📁 2. `agent/src/ipc/server.js`

#### Occurrence 2: Local IPC Pipe Address
- **File**: [`agent/src/ipc/server.js`](file:///Users/dhananjai/Chameleon/agent/src/ipc/server.js#L5-L6)
- **Lines**: 5–6, 38
- **Current Code**:
  ```javascript
  const PIPE_NAME = 'chameleon-agent';
  const PIPE_PATH = `\\\\.\\pipe\\${PIPE_NAME}`;
  ...
  server.listen(PIPE_PATH, ...);
  ```
- **Purpose**: Creates an inter-process communication (IPC) server for local CLI diagnostics and daemon status checks.
- **Why Windows-Specific**: `\\.\pipe\chameleon-agent` is the Win32 Named Pipe path format.
- **macOS Issue**: Node.js `net.Server.listen()` on POSIX operating systems expects a Unix Domain Socket filesystem path (e.g., `/tmp/chameleon-agent.sock`). Attempting to open `\\.\pipe\...` on macOS throws an immediate `ENOENT` / `EINVAL` socket error.
- **macOS Equivalent**:
  ```javascript
  const PIPE_PATH = process.platform === 'win32'
      ? `\\\\.\\pipe\\${PIPE_NAME}`
      : path.join(os.tmpdir(), `${PIPE_NAME}.sock`);
  ```
- **Linux Equivalent**: Same Unix Domain Socket path in `os.tmpdir()`.

---

### 📁 3. `agent/src/main.js`

#### Occurrence 3: System Tray Icon Format
- **File**: [`agent/src/main.js`](file:///Users/dhananjai/Chameleon/agent/src/main.js#L275-L277)
- **Lines**: 275–277, 306–329
- **Current Code**:
  ```javascript
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon-gray.bmp'));
  ```
- **Purpose**: Sets the status icon displayed in the OS menu bar / system tray.
- **Why Windows-Specific**: Loads `.bmp` format images (`icon-gray.bmp`, `icon-green.bmp`, `icon-yellow.bmp`).
- **macOS Issue**: macOS status items (Menu Bar) use monochrome PNG images with `isTemplateImage = true` (`iconTemplate.png` @ 16x16 and `iconTemplate@2x.png` @ 32x32) to adapt automatically to Light and Dark menu bar themes. Windows `.bmp` files render with solid black background boxes or fail to render in macOS menu bars.
- **macOS Equivalent**: Use transparent PNG icons and set `icon.setTemplateImage(true)` on macOS.

#### Occurrence 4: Chromium GPU & Shader Cache Switches
- **File**: [`agent/src/main.js`](file:///Users/dhananjai/Chameleon/agent/src/main.js#L46-L59)
- **Lines**: 46–59
- **Current Code**:
  ```javascript
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
  ```
- **Purpose**: Disables Chromium GPU shader disk cache to avoid permission issues on Windows `%LOCALAPPDATA%`.
- **Why Windows-Specific**: Fixes a known Windows-specific Electron file permission bug.
- **macOS Effect**: Harmless on macOS, but macOS uses Metal/OpenGL shader compilation where disk caching is managed natively by macOS Metal framework.

#### Occurrence 5: Auto-Start Path Resolution
- **File**: [`agent/src/main.js`](file:///Users/dhananjai/Chameleon/agent/src/main.js#L333-L338)
- **Lines**: 333–338
- **Current Code**:
  ```javascript
  app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe')
  });
  ```
- **Purpose**: Enables host agent auto-boot at OS login.
- **Why Windows-Specific**: `app.getPath('exe')` on Windows returns `C:\Program Files\Antimalware Service Executable\Antimalware Service Executable.exe`.
- **macOS Issue**: On macOS, `app.getPath('exe')` returns the binary path inside the bundle (`/Applications/Chameleon.app/Contents/MacOS/Service Host`). Passing `path` directly to `setLoginItemSettings` on macOS can cause helper app launch failures if `openAsHidden` or bundle identifier is not specified.
- **macOS Equivalent**: On macOS, use `app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })` without passing explicit executable inner path.

---

### 📁 4. `agent/src/webrtc.html`

#### Occurrence 6: Hardware Session ID Hash Fallback
- **File**: [`agent/src/webrtc.html`](file:///Users/dhananjai/Chameleon/agent/src/webrtc.html#L33-L46)
- **Lines**: 33–46
- **Current Code**:
  ```javascript
  const identifier = os.hostname() + '-' + os.arch() + '-' + os.platform();
  ```
- **Purpose**: Generates a permanent 6-digit session code for host pairing.
- **Why Windows-Specific**: Relies on static Windows hostnames.
- **macOS Issue**: Dynamic macOS LocalHostName changes cause session code recalculation on restart.
- **macOS Equivalent**: Use hardware `IOPlatformUUID` generated via the platform abstraction layer.

---

### 📁 5. `server/src/index.js`

#### Occurrence 7: OS Platform Name Mapping
- **File**: [`server/src/index.js`](file:///Users/dhananjai/Chameleon/server/src/index.js#L185)
- **Lines**: 185
- **Current Code**:
  ```javascript
  deviceUpdate.osName = details.platform === 'win32' ? 'Windows' : details.platform;
  ```
- **Purpose**: Formats `osName` for the admin dashboard device registry.
- **Why Windows-Specific**: Explicitly converts `'win32'` to `'Windows'`.
- **macOS Equivalent**: Convert `'darwin'` to `'macOS'` (`details.platform === 'darwin' ? 'macOS' : ...`).

---

## 3. Audit Summary Matrix

| Module | File | Lines | Windows Dependency | macOS Impact | Resolution |
|---|---|---|---|---|---|
| Identity | `agent/src/storage/identity.js` | 29–46 | `powershell.exe`, WMI, Registry | Dynamic fallback to `hostname` breaks persistent identity | Implement `ioreg` `IOPlatformUUID` query |
| Local IPC | `agent/src/ipc/server.js` | 5–6 | Win32 Named Pipe `\\.\pipe\` | Crashes with `ENOENT`/`EINVAL` | Use `os.tmpdir()` socket path on POSIX |
| System Tray | `agent/src/main.js` | 275–277 | `.bmp` image files | Non-standard rendering / dark mode failure | Supply PNG images & `setTemplateImage(true)` |
| Auto-Start | `agent/src/main.js` | 333–338 | Windows `.exe` path | Potential login helper path error | Use standard macOS `setLoginItemSettings` |
| Screen Capture | `agent/src/webrtc.html` | 295–321 | Windows DXGI Desktop Duplication | Requires macOS Screen Recording Permission | Add `CGRequestScreenCaptureAccess` prompt |
| Input Drivers | `agent/src/main.js` | 124–230 | Win32 `SendInput` via nut-js | Requires macOS Accessibility Permission (`AXIsProcessTrusted`) | Add Accessibility permission check & request |

---
*Generated for Chameleon Engine Team (`MAC_COMPATIBILITY_AUDIT.md`).*
