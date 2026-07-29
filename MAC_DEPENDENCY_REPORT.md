# 📦 macOS Native Dependency Report (`MAC_DEPENDENCY_REPORT.md`)

This document is a technical evaluation of every production and development dependency across the repository to verify macOS compatibility (`x64` Intel and `arm64` Apple Silicon), required permissions, native module rebuild requirements, and platform-specific limitations.

---

## 1. Dependency Analysis Matrix

| Dependency | Scope | Windows Support | macOS Support | Required OS Permissions | Rebuild Required? | Known Limitations / Notes |
|---|---|---|---|---|---|---|
| `electron` (`^28.2.10`) | Agent (`devDependencies`) | ✅ Yes | ✅ Yes (`x64`, `arm64`, Universal) | Screen Recording, Accessibility | No (Prebuilt binary) | macOS Mojave (10.14+) enforces Hardened Runtime during notarization. |
| `@nut-tree-fork/nut-js` (`^4.2.6`) | Agent (`dependencies`) | ✅ Yes (Win32 `SendInput`) | ✅ Yes (Quartz Event Taps) | Accessibility (`AXIsProcessTrusted`) | No (Prebuilt N-API binaries provided) | Retina High-DPI display coordinate scaling must be verified. |
| `electron-store` (`^11.0.2`) | Agent (`dependencies`) | ✅ Yes | ✅ Yes | None | No (Pure JS) | Uses Electron `safeStorage` under the hood. |
| `qrcode` (`^1.5.4`) | Agent (`dependencies`) | ✅ Yes | ✅ Yes | None | No (Pure JS) | Pure Canvas/ImageData QR generator. |
| `socket.io-client` (`^4.8.3`) | Agent & Client (`dependencies`) | ✅ Yes | ✅ Yes | Network Socket | No (Pure JS) | WebSocket transport works identically across platforms. |
| `electron-builder` (`^26.8.1`) | Agent (`devDependencies`) | ✅ Yes (NSIS) | ✅ Yes (DMG, ZIP, PKG) | None | No (CLI tool) | Supports Apple Silicon `arm64` and `universal` packaging. |
| `react` & `react-dom` (`^19.2.0`) | Client & Frontend | ✅ Yes | ✅ Yes | None | No (Pure JS) | UI rendering operates identically in macOS browsers. |
| `react-router-dom` (`^7.13.1`) | Client & Frontend | ✅ Yes | ✅ Yes | None | No (Pure JS) | Client-side routing engine. |
| `lucide-react` | Client & Frontend | ✅ Yes | ✅ Yes | None | No (Pure JS) | SVG iconography. |
| `html5-qrcode` (`^2.3.8`) | Client (`dependencies`) | ✅ Yes | ✅ Yes | Browser Camera | No (Pure JS) | Camera access prompt managed by browser. |
| `express` (`^5.2.1`) | Server (`dependencies`) | ✅ Yes | ✅ Yes | Network Socket | No (Pure JS) | Server runs on Node.js runtime. |
| `mongoose` (`^8.3.1`) | Server (`dependencies`) | ✅ Yes | ✅ Yes | Network Socket | No (Pure JS) | Pure JavaScript MongoDB driver. |
| `jsonwebtoken` (`^9.0.3`) | Server (`dependencies`) | ✅ Yes | ✅ Yes | None | No (Pure JS) | JWT authentication library. |

---

## 2. Deep-Dive on Core Native Dependencies

### ⚙️ 1. `@nut-tree-fork/nut-js` (Native Input Injection Engine)
- **Architecture**: Fork of `nut-js` utilizing C++ native add-ons (N-API bindings) to interface directly with operating system input APIs.
- **Windows Implementation**: Calls Win32 `SendInput` and `SetCursorPos` APIs.
- **macOS Implementation**: Calls macOS CoreGraphics / Quartz Display Services (`CGEventCreateMouseEvent`, `CGEventCreateKeyboardEvent`, `CGEventPost`).
- **Required macOS Permission**: **Accessibility** (`AXIsProcessTrusted`).
- **Handling Permission Failure**: If Accessibility permission is absent, `@nut-tree-fork/nut-js` fails silently or throws an unhandled C++ exception when attempting `mouse.setPosition` or `keyboard.pressKey`.
- **Retina Display Coordinates**: On macOS Retina displays (e.g. 2880x1800 physical pixels vs 1440x900 logical points), `nutScreen.width()` returns logical points. The input injection mapping `(targetX * screenWidth)` correctly targets logical coordinates when using standard Quartz event posting.

---

### 🎥 2. Electron `desktopCapturer` & Chromium Video Encoders
- **Windows Implementation**: Uses DXGI Desktop Duplication API + NVIDIA NVENC / Intel QuickSync hardware encoders.
- **macOS Implementation**: Uses ScreenCaptureKit (macOS 12.3+) or Quartz Display Services + Apple VideoToolbox hardware encoder (H.264/HEVC acceleration on M1/M2/M3 Apple Silicon and Intel Macs).
- **Required macOS Permission**: **Screen Recording** (`NSScreenCaptureDescription`).
- **Handling Permission Failure**: If Screen Recording permission is missing on macOS Catalina (10.15+), `desktopCapturer.getSources()` returns empty thumbnail buffers or captured frames contain only the desktop wallpaper image.

---

### 🔒 3. Electron `safeStorage` (Credential Security)
- **Windows Implementation**: Uses Windows Data Protection API (DPAPI).
- **macOS Implementation**: Uses macOS Keychain (`SecItemAdd` / `SecItemCopyMatching`).
- **Compatibility**: Electron's `safeStorage.isEncryptionAvailable()` returns `true` natively on macOS out of the box.

---

### 📦 4. `electron-builder` (macOS Packaging Pipeline)
- **Supported Targets**:
  - `dmg`: Standard macOS disk image installer.
  - `zip`: Portable compressed application archive (used for auto-updates).
  - `pkg`: macOS installer package (suitable for enterprise MDM deployment).
- **Supported Architectures**:
  - `arm64`: Apple Silicon (M1, M2, M3, M4).
  - `x64`: Intel-based Mac computers.
  - `universal`: Combined Mach-O binary containing both `x64` and `arm64` slices.

---
*Generated for Chameleon Engine Team (`MAC_DEPENDENCY_REPORT.md`).*
