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
- Created dedicated migration branch: `feature/macos-support`
- **Phase 1 Platform Abstraction**: Created `agent/src/platform/identity/` abstraction (`windows.js`, `macos.js`, `index.js`) and connected `agent/src/storage/identity.js`.

### Current Phase:
**Phase 2 — IPC Abstraction** (Next up for implementation)

### Remaining Phases:
- Phase 2: IPC Unix Domain Socket Path Abstraction (`agent/src/ipc/server.js`)
- Phase 3: Permission Handling (Accessibility `AXIsProcessTrusted` & Screen Recording `CGRequestScreenCaptureAccess`)
- Phase 4: Native Tray Compatibility (`iconTemplate.png` & `iconTemplate@2x.png` menu bar support)
- Phase 5: Packaging & Entitlements Configuration (`agent/package.json` & `entitlements.mac.plist`)
- Phase 6: Code Signing & Notarization pipeline setup
- Phase 7: End-to-End macOS Testing & Validation

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
