# Persistent AI Agent Context (`AGENT_CONTEXT.md`)

This file is the primary context document for any AI agent working on the **Chameleon** repository. It reflects the latest architectural state, ongoing migration phase, standards, and handoff instructions.

---

# Project Overview

- **Purpose**: Chameleon is an ultra-low-latency peer-to-peer (P2P) remote desktop platform engineered for sub-100ms glass-to-glass latency, instant QR/numeric-code pairing, and browser-native remote control without IP configuration or third-party client installation.
- **High-Level Architecture**: Decoupled multi-component architecture consisting of a native Electron Desktop Agent (host machine), a React Web Client (viewer), a React Admin Dashboard, and a Node.js/Express Signaling Server backed by MongoDB Atlas.
- **Technology Stack**:
  - **Host Agent**: Electron v28, `@nut-tree-fork/nut-js` (Win32 `SendInput` / macOS Quartz Event Taps), `electron-store`, `safeStorage`.
  - **Web Client**: React 19, Vite v7, TailwindCSS v4, `socket.io-client`, Web Codecs/Workers + `OffscreenCanvas`.
  - **Admin Dashboard**: React 19, Recharts v3, TailwindCSS v3.
  - **Signaling Backend**: Node.js, Express 5, Socket.IO v4, Mongoose v8, MongoDB Atlas, JWT Auth.
- **Major Subprojects**:
  - `/agent`: Desktop host agent application.
  - `/client`: React browser viewer application.
  - `/server`: Signaling backend & administrative REST API server.
  - `/frontend`: React admin dashboard.

---

# Repository Structure

- **`/agent`**: Electron host app (native desktop capture, hardware identity, Nut.js input injection, background daemon).
- **`/client`**: Browser viewer (WebRTC PeerConnection, dual DataChannels, ABR controller, GPU canvas rendering).
- **`/server`**: Signaling server (SDP/ICE router, device registry, JWT auth, auto-fingerprint banning).
- **`/frontend`**: Administrative dashboard (telemetry charts, device management, session auditing, stealth viewer).
- **Important Shared/Root Files**:
  - `agent_simulator.js`: Device simulation harness.
  - `ARCHITECTURE_BLUEPRINT.md`: Low-latency design blueprint.
  - `PROJECT.md`: Complete project overview & developer guide.
  - `CONTRIBUTOR_GUIDE.md`: Deep-dive implementation guide.
  - `MAC_COMPATIBILITY_AUDIT.md`: Line-by-line macOS compatibility audit.
  - `MAC_DEPENDENCY_REPORT.md`: Native dependency evaluation report.
  - `MAC_PERMISSIONS.md`: macOS permission management guide.
  - `MAC_BUILD_REPORT.md`: Electron Builder & packaging audit.
  - `MAC_MIGRATION_PLAN.md`: Platform identity design & prioritized migration roadmap.

---

# Current Branch

`feature/macos-support`

---

# Current Objective

Implement full native macOS compatibility (both Apple Silicon `arm64` and Intel `x64`) across the Desktop Agent while maintaining 100% backward compatibility with Windows.

---

# Migration Status

### Completed:
- Repository discovery (Phase 1–15 complete)
- Architecture analysis
- Created `PROJECT.md`
- Created `CONTRIBUTOR_GUIDE.md`
- Created `MAC_COMPATIBILITY_AUDIT.md`
- Created `MAC_DEPENDENCY_REPORT.md`
- Created `MAC_PERMISSIONS.md`
- Created `MAC_BUILD_REPORT.md`
- Created `MAC_MIGRATION_PLAN.md`
- Created `STARTUP_ANALYSIS.md`
- Created dedicated migration branch: `feature/macos-support`
- **Phase 1 — Platform Identity Abstraction**: `agent/src/platform/identity/` (`windows.js`, `macos.js`, `index.js`). `agent/src/storage/identity.js` updated.
- **Phase 2A — UI Reachability**: `createQRWindow()` auto-opens at startup on macOS; `app.on('activate')` reopens from Dock. Windows unchanged.
- **Phase 2B — Native macOS Experience**: Permissions, tray icons, and lifecycle. See files below.
- **Phase 3 — Platform Architecture Cleanup**: Completed a repository-wide platform audit, moved native input, IPC, runtime switches, screen capture, startup, and tray decisions behind `agent/src/platform/`, fixed cross-platform startup and icon-conversion scripts, and added platform contract tests.

### Phase 2B — Files Created / Modified:
| File | Action | Purpose |
|---|---|---|
| `agent/src/platform/permissions.js` | **NEW** | Centralized macOS permission handler for Accessibility and Screen Recording. No-op on Windows. |
| `agent/assets/icon-gray.png` | **NEW** | PNG template tray icon for macOS Menu Bar (gray/idle state). |
| `agent/assets/icon-green.png` | **NEW** | PNG template tray icon for macOS Menu Bar (connected state). |
| `agent/assets/icon-yellow.png` | **NEW** | PNG template tray icon for macOS Menu Bar (paused/pairing state). |
| `agent/src/main.js` | **MODIFIED** | (1) `require('./platform/permissions')`. (2) `_trayIconPath()` helper selects `.png` on darwin, `.bmp` on win32. (3) `createTray()` / `updateTrayIcon()` use `_trayIconPath()`. (4) `app.whenReady()` runs permission checks before `createQRWindow()` on darwin. |

### Phase 3 — Files Created / Modified:
| File | Action | Purpose |
|---|---|---|
| `agent/src/platform/input/index.js` | **NEW** | Owns `nut-js`, key mapping, modifier state, coordinate mapping, and native input injection. |
| `agent/src/platform/ipc/{index,macos,windows}.js` | **NEW** | Routes local IPC to the existing Windows named pipe or a POSIX Unix socket. |
| `agent/src/platform/runtime/index.js` | **NEW** | Applies shared Chromium switches and contains the Windows-only shader-cache workaround. |
| `agent/src/platform/screen/index.js` | **NEW** | Owns Electron `desktopCapturer` source discovery. |
| `agent/src/platform/startup/index.js` | **NEW** | Owns platform login-item settings, sequential/independently fail-safe macOS permission checks, QR presentation, and Dock activation behavior. |
| `agent/src/platform/tray/index.js` | **NEW** | Owns BMP/PNG selection, macOS template-image configuration, and development/packaged asset paths. |
| `agent/src/main.js` | **MODIFIED** | Reduced to application orchestration; no raw platform checks, `nut-js`, `desktopCapturer`, or tray resource-path decisions. |
| `agent/src/ipc/server.js` | **MODIFIED** | Uses the platform IPC service. |
| `agent/package.json`, `agent/start.js`, `agent/convert.js` | **MODIFIED** | Cross-platform start command and filesystem paths; packaged tray resources; added the agent test command. |
| `agent/test/platform-services.test.js`, `agent/test/tray-assets.test.js` | **NEW** | Contract coverage for Windows/macOS behavior, independent permission failures, packaged resource paths, and native input invariants. |
| Phase 3 reports | **NEW** | Audit, architecture review, implementation summary, and validation record. |

### Current Phase:
**Phase 4 — Packaging, signing, and production validation** (Next up for implementation)

### Remaining Phases:
- Phase 4: Packaging & Entitlements (`agent/package.json` mac targets, branding decision, entitlement plist)
- Phase 5: Code Signing & Notarization pipeline setup
- Phase 6: End-to-End Windows/macOS hardware validation

### Known Issues / TODOs for Phase 4:
- Resolve the shared Windows-oriented `productName` and `artifactName` without renaming the production Windows installation.
- Remove `"identity": null` only when signing credentials and the notarization workflow are ready; add reviewed entitlements and explicit architecture targets.
- Decide how to migrate the renderer's hostname-derived six-digit pairing code without unexpectedly changing existing pairing IDs.
- Wire `startIPCServer()` into startup or remove the dormant IPC subsystem after confirming whether external tools depend on it.
- Validate the RGB/no-alpha macOS PNGs as template images in light and dark mode; replace them with reviewed alpha masks or deliberately use non-template colored assets.
- Run physical Windows and Intel/Apple Silicon macOS end-to-end checks for startup, login items, tray appearance, permissions, capture, and input.

---

# Coding Standards

- Reuse existing code; search for utilities before creating new functions.
- Never duplicate logic.
- Keep diffs as minimal as possible.
- Follow existing project conventions (bracketed console logging: `[Platform]`, `[Identity]`, `[IPC]`, `[WS]`).
- Preserve 100% backwards compatibility with Windows.
- Never refactor unrelated code.

---

# Critical Architecture Rules

- Do not modify WebRTC contracts (`MediaStreamTrack`, SDP munging).
- Do not modify Socket.IO protocols or event names.
- Do not change database schemas or API response formats.
- Do not break hardware fingerprint device ID generation logic.
- Keep Windows behavior 100% byte-for-byte identical.

---

# Important Documents

Reference all generated documentation:
- [`PROJECT.md`](file:///Users/dhananjai/Chameleon/PROJECT.md)
- [`CONTRIBUTOR_GUIDE.md`](file:///Users/dhananjai/Chameleon/CONTRIBUTOR_GUIDE.md)
- [`MAC_COMPATIBILITY_AUDIT.md`](file:///Users/dhananjai/Chameleon/MAC_COMPATIBILITY_AUDIT.md)
- [`MAC_DEPENDENCY_REPORT.md`](file:///Users/dhananjai/Chameleon/MAC_DEPENDENCY_REPORT.md)
- [`MAC_PERMISSIONS.md`](file:///Users/dhananjai/Chameleon/MAC_PERMISSIONS.md)
- [`MAC_BUILD_REPORT.md`](file:///Users/dhananjai/Chameleon/MAC_BUILD_REPORT.md)
- [`MAC_MIGRATION_PLAN.md`](file:///Users/dhananjai/Chameleon/MAC_MIGRATION_PLAN.md)
- [`PLATFORM_ASSUMPTIONS_REPORT.md`](file:///Users/dhananjai/Chameleon/PLATFORM_ASSUMPTIONS_REPORT.md)
- [`ARCHITECTURE_REVIEW.md`](file:///Users/dhananjai/Chameleon/ARCHITECTURE_REVIEW.md)
- [`IMPLEMENTATION_SUMMARY.md`](file:///Users/dhananjai/Chameleon/IMPLEMENTATION_SUMMARY.md)
- [`VALIDATION_REPORT.md`](file:///Users/dhananjai/Chameleon/VALIDATION_REPORT.md)

---

# Working Procedure

Before every implementation:
1. Understand the existing implementation.
2. Search for reusable code.
3. Explain the impact.
4. Implement the smallest possible change.
5. Validate build and runtime.
6. Update documentation.

---

# Handoff Instructions

This file (`docs/agent/AGENT_CONTEXT.md`) must always reflect the latest state of the project.

Whenever a phase is completed:
- Update the completed tasks list.
- Update the current phase indicator.
- Record architectural decisions.
- Record modified files.
- Record known issues or edge cases.
- Record next steps.

This document allows a completely new AI agent to resume development immediately without re-analyzing the repository.
