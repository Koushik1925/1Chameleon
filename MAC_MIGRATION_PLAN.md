# 🗺️ macOS Migration & Compatibility Plan (`MAC_MIGRATION_PLAN.md`)

This document outlines the architecture design for **Hardware Identity Abstraction** (Phase 3) and provides a complete, prioritized implementation roadmap (Phase 6) to achieve 100% native macOS compatibility while preserving 100% backward compatibility with Windows.

---

## 1. Phase 3 — Hardware Identity Abstraction Design

### Problem Statement
Currently, [`agent/src/storage/identity.js`](file:///Users/dhananjai/Chameleon/agent/src/storage/identity.js#L29-L46) relies on PowerShell WMI/Registry commands for Windows, but falls back to dynamic `os.hostname()` on non-Windows platforms. On macOS, hostname changes break the deterministic generation of the 12-character `device_id`.

### Proposed Abstraction Architecture
Create a modular platform directory under `agent/src/platform/identity/`:

```
agent/src/platform/
└── identity/
    ├── windows.js   # Untouched Windows PowerShell WMI / MachineGuid implementation
    ├── macos.js     # Native macOS ioreg IOPlatformUUID / SerialNumber extraction
    └── index.js     # Cross-platform router delegating based on process.platform
```

### Exact API Contract
Every platform identity module must export a single async/sync function:
```javascript
/**
 * @returns {{ machineGuid: string, boardSerial: string }}
 */
function getHardwareIds()
```

#### 1. Windows Implementation (`windows.js`)
*Preserves existing code 100% without modification:*
```javascript
const { execSync } = require('child_process');

function getHardwareIds() {
    let machineGuid = '';
    let boardSerial = '';
    try {
        machineGuid = execSync('powershell.exe -Command "(Get-ItemProperty -Path \'HKLM:\\SOFTWARE\\Microsoft\\Cryptography\').MachineGuid"').toString().trim();
        boardSerial = execSync('powershell.exe -Command "(Get-WmiObject win32_baseboard | Select-Object -ExpandProperty SerialNumber)"').toString().trim();
    } catch (e) {
        machineGuid = 'win-fallback-guid';
        boardSerial = 'win-fallback-serial';
    }
    return { machineGuid, boardSerial };
}

module.exports = { getHardwareIds };
```

#### 2. macOS Implementation (`macos.js`)
*Uses native macOS `ioreg` commands:*
```javascript
const { execSync } = require('child_process');
const os = require('os');

function getHardwareIds() {
    let machineGuid = '';
    let boardSerial = '';
    try {
        // Read IOPlatformUUID
        machineGuid = execSync("ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { print $3 }' | tr -d '\"'").toString().trim();
        
        // Read IOPlatformSerialNumber
        boardSerial = execSync("ioreg -l | grep IOPlatformSerialNumber | awk '{print $4}' | tr -d '\"'").toString().trim();
    } catch (e) {
        // Fallback to sysctl hardware model + cpus if ioreg is restricted
        try {
            machineGuid = execSync('sysctl -n hw.uuid').toString().trim();
        } catch (err) {
            machineGuid = os.hostname();
        }
        boardSerial = os.cpus()[0]?.model || 'apple-silicon';
    }
    return { machineGuid, boardSerial };
}

module.exports = { getHardwareIds };
```

#### 3. Cross-Platform Router (`index.js`)
```javascript
const windowsIdentity = require('./windows');
const macosIdentity = require('./macos');

function getHardwareIds() {
    if (process.platform === 'win32') {
        return windowsIdentity.getHardwareIds();
    } else if (process.platform === 'darwin') {
        return macosIdentity.getHardwareIds();
    }
    // Fallback for Linux or other POSIX
    return { machineGuid: require('os').hostname(), boardSerial: 'generic-posix' };
}

module.exports = { getHardwareIds };
```

---

## 2. Phase 6 — Task Breakdown & Prioritized Roadmap

Tasks are categorized into **Critical**, **High**, **Medium**, and **Low** priority tiers.

---

### 🚨 Tier 1: Critical Priority (Core Functionality & Launch Blockers)

#### Task 1.1: Local IPC Socket Path Cross-Platform Abstraction
- **Goal**: Resolve POSIX socket creation failure on macOS (`agent/src/ipc/server.js`).
- **Difficulty**: Low (15 mins)
- **Risk**: Low
- **Affected Files**: `agent/src/ipc/server.js`
- **Potential Regressions**: None on Windows if `process.platform === 'win32'` branch is preserved.
- **Testing Required**: Launch agent on macOS and verify named socket creation in `/tmp/chameleon-agent.sock`.

#### Task 1.2: Hardware Identity Abstraction Integration
- **Goal**: Implement `agent/src/platform/identity/` abstraction (`windows.js`, `macos.js`, `index.js`).
- **Difficulty**: Medium (45 mins)
- **Risk**: Low (Windows code is strictly isolated in `windows.js`).
- **Affected Files**: `agent/src/storage/identity.js`, `agent/src/platform/identity/*`
- **Potential Regressions**: Ensure generated 12-character `device_id` on Windows matches existing IDs.
- **Testing Required**: Verify deterministic hardware hash on Apple Silicon (M1/M2/M3) and Intel Macs across reboots.

#### Task 1.3: macOS Screen Recording & Accessibility Permission Prompting
- **Goal**: Add explicit permission checks and user prompt handlers for Screen Capture and Accessibility (`AXIsProcessTrusted`).
- **Difficulty**: Medium (1 hour)
- **Risk**: Medium
- **Affected Files**: `agent/src/main.js`, `agent/src/webrtc.html`, `agent/src/preload.js`
- **Potential Regressions**: Ensure Windows behavior remains uninterrupted.
- **Testing Required**: Revoke permissions in macOS System Settings and verify warning banner and direct Settings link.

---

### 🔶 Tier 2: High Priority (UX & Stream Quality)

#### Task 2.1: Native System Tray Icon Adaptive Template Format
- **Goal**: Add macOS PNG template icons (`iconTemplate.png`, `iconTemplate@2x.png`) for dark/light menu bar support.
- **Difficulty**: Low (30 mins)
- **Risk**: Low
- **Affected Files**: `agent/src/main.js`, `agent/assets/*`
- **Testing Required**: Toggle macOS Light/Dark mode and verify menu bar tray icon visibility.

#### Task 2.2: Retina Display Coordinate Scaling Verification
- **Goal**: Verify `@nut-tree-fork/nut-js` mouse input positioning on High-DPI Retina displays.
- **Difficulty**: Medium (45 mins)
- **Risk**: Low
- **Affected Files**: `agent/src/main.js`
- **Testing Required**: Perform remote control session on 2K/4K Retina host and verify cursor accuracy.

---

### 🔷 Tier 3: Medium Priority (Packaging & Distribution)

#### Task 3.1: Electron Builder macOS Configuration & Entitlements
- **Goal**: Update `agent/package.json` with explicit `x64` / `arm64` targets, hardened runtime, and `entitlements.mac.plist`.
- **Difficulty**: Medium (1 hour)
- **Risk**: Low
- **Affected Files**: `agent/package.json`, `agent/build/entitlements.mac.plist`
- **Testing Required**: Build DMG and ZIP artifacts locally and verify package integrity.

---

### 🟢 Tier 4: Low Priority (CI/CD Optimization)

#### Task 4.1: GitHub Actions Dual Architecture CI Artifact Release
- **Goal**: Ensure GitHub Actions pipeline (`.github/workflows/build-mac.yml`) uploads both `x64` and `arm64` DMG artifacts.
- **Difficulty**: Low (20 mins)
- **Risk**: Low
- **Affected Files**: `.github/workflows/build-mac.yml`
- **Testing Required**: Trigger GitHub Actions workflow dispatch and inspect generated build artifacts.

---

## 3. Migration Safety Checklist

- [ ] **Windows Regression Guarantee**: No code paths inside `process.platform === 'win32'` are modified.
- [ ] **Zero Refactoring**: All existing data models, Socket.IO event names, and WebRTC schemas remain unchanged.
- [ ] **Minimal Diffs**: Abstracted platform code is cleanly modularized under `agent/src/platform/`.

---
*Generated for Chameleon Engine Team (`MAC_MIGRATION_PLAN.md`).*
