# Architecture Review

## Executive assessment

Chameleon remains a four-part system:

- Electron desktop agent;
- React remote-viewer client;
- Express/Socket.IO/MongoDB server;
- React admin dashboard.

The network and session architecture is intentionally unchanged. Phase 3 improves the Electron agent’s internal boundary: `main.js` now orchestrates Electron events and delegates native or platform-varying work to focused services under `agent/src/platform/`.

This is an incremental improvement, not a rewrite. Authentication, registration, Socket.IO events, WebRTC signalling, SDP/ICE handling, device IDs, database models, and remote desktop payloads retain their existing contracts.

## Current runtime architecture

```text
Web viewer
   │  WebRTC video + data channels / Socket.IO fallback
   ▼
webrtc.html (hidden Electron renderer)
   │  stable IPC event names
   ▼
main.js (application orchestration)
   ├── window and tray state
   ├── pause guard and Electron IPC wiring
   └── platform service API
       ├── identity     Windows PowerShell/WMI | macOS ioreg/sysctl
       ├── input        nut.js and input safety state
       ├── ipc          Windows named pipe | POSIX Unix socket
       ├── permissions  macOS Accessibility/Screen Recording guidance
       ├── runtime      Chromium switches and OS-specific workarounds
       ├── screen       Electron desktop source discovery
       ├── startup      login items, permissions, QR presentation, Dock activation
       └── tray         Windows BMP | macOS PNG template images
```

The platform API is internal to the agent. No Socket.IO, WebRTC, REST, storage, or UI contract changed.

## What is strong today

### Clear component boundaries

The viewer, server, admin dashboard, and desktop agent are separate applications with independent package manifests. A platform refactor inside the agent does not need to affect browser clients or backend contracts.

### Latency-sensitive paths are explicit

The dual DataChannel design, pause guard, direct IPC forwarding, hardware encoding switches, and native input code are easy to identify. Phase 3 preserved these paths rather than introducing generic middleware or asynchronous queues.

### Existing identity work has the right shape

`storage/identity.js` owns persistence and hashing while `platform/identity` owns hardware discovery. Windows PowerShell/WMI behavior is preserved in the Windows provider, and macOS commands do not leak into storage or registration logic.

### The expanded platform layer has purposeful seams

Each new service removes a concrete native dependency or OS decision:

| Service | Application-facing responsibility | Native detail hidden |
|---|---|---|
| `input` | handle one existing remote-input payload | nut.js, key constants, modifier state, coordinates |
| `ipc` | return a local endpoint | Win32 named pipe vs Unix socket |
| `runtime` | configure Electron command line | Windows-only shader-cache workaround |
| `screen` | return desktop sources | Electron `desktopCapturer` |
| `startup` | configure login/startup behavior | executable vs app bundle, macOS permissions/Dock |
| `tray` | create an icon for a status | BMP vs PNG template image |

No `paths/` wrapper was added because normal Node `path.join` calls are already portable. No separate Windows/macOS input implementation was added because nut.js currently provides the same application-facing API on both systems.

## Weaknesses and risks

### The hidden renderer is still a monolith

`webrtc.html` owns pairing-code generation, device telemetry, Socket.IO, WebRTC, capture, relay fallback, admin viewing, and adaptive bitrate logic. This creates a large blast radius for future changes. It also duplicates identity concerns through its hostname-derived six-digit code.

This was not refactored because the Phase 3 brief explicitly protects signalling, WebRTC, registration, and session lifecycle.

### Pairing identity has two sources of truth

The persistent 12-character device ID uses `platform/identity`, but the public six-digit pairing code hashes hostname, architecture, and platform in the renderer. On macOS, hostname changes can change the pairing code.

The right fix needs a compatibility policy, not only a code extraction. Existing users may rely on their current six-digit code.

The hidden renderer also creates a session at connection time, while opening the QR window sends another pairing request containing only the session ID. If the first connection has already completed, the second request can replace stored device metadata with the server fallback. This behavior predates Phase 3 and sits inside the protected session lifecycle, so it needs a dedicated compatibility test before correction.

### IPC is architecturally improved but operationally dormant

`ipc/server.js` now requests a platform endpoint correctly, but `startIPCServer()` has no caller. Documentation previously claimed it started with the daemon. Keeping unused operational code creates false confidence.

### Packaging configuration conflates platforms

Electron Builder’s global `productName` and `artifactName` are Windows-oriented, while the macOS block disables signing and lacks production entitlements and explicit architecture targets. Runtime support is ahead of distribution readiness.

Phase 3 now packages tray files under the standard Electron resources directory and resolves that directory through `platform/tray`. This fixes runtime lookup without solving the separate release identity, signing, or icon-design decisions.

### macOS tray states still need visual validation

The macOS PNG files are RGB images without alpha channels, while Electron marks them as template images. macOS template rendering uses the image as a light/dark mask, so automated path and API tests cannot prove that the gray, green, and yellow states remain visually distinct. Preserve template adaptation by replacing them with reviewed, distinct alpha masks, or explicitly choose colored non-template assets after product review.

### Test coverage begins at the platform boundary, not end to end

The new tests cover router decisions and native input invariants with fakes. They do not prove actual Windows Registry access, Quartz input injection, macOS permission dialogs, tray rendering, WebRTC capture, login-item registration, or packaged startup on physical hosts.

### Some operational documentation remains release-gated

The public README and download UI still present macOS as unreleased. That is appropriate only until a signed and notarized build is validated; afterward it becomes misleading.

## Phase 3 design decisions

### Preserve the orchestrator

`main.js` remains the Electron entry point and owns window references, status state, the pause guard, and IPC event registration. Moving those responsibilities would create a framework-shaped rewrite with little platform value.

### Move native input as one cohesive unit

The key map and modifier state moved together with nut.js calls. Splitting only the `require()` behind a wrapper would leave platform mechanics in business orchestration and add no real abstraction.

### Keep platform selection injectable

Platform services default to `process.platform`, but their factories accept an explicit platform and native dependencies. This keeps production calls simple and permits Windows behavior to be verified from macOS without mutating global process state.

### Preserve Windows branches exactly where behavior matters

The named-pipe string, BMP extensions, login-item executable path, Chromium switch order, key mappings, shortcut blocking, and input coordinate calculations have focused contract coverage.

### Defer changes that alter external identity or release behavior

Pairing-code migration, product naming, updater metadata, signing, notarization, and public download activation need explicit product/release decisions. Phase 3 documents them instead of guessing.

## Recommended next improvements

1. Define the six-digit pairing-code compatibility contract and the single session-creation path, then expose the chosen stable identity through a renderer-safe application API.
2. Decide whether local IPC has a real consumer. Wire it with Unix-socket cleanup and shutdown handling, or remove it and update documentation.
3. Make a platform-specific packaging and naming decision that does not rename the installed Windows product.
4. Add hardened runtime entitlements, explicit macOS architectures, signing, and notarization as one verified release unit.
5. Resolve the macOS tray visual contract with reviewed template masks or deliberately colored non-template assets.
6. Add packaged smoke tests on Windows x64, macOS Intel, and macOS Apple Silicon. Include first-run permissions, login launch, tray visibility, capture, input, QR pairing, and reconnect.
7. When signalling work is next authorized, extract the hidden renderer by responsibility without changing event names or payloads.

## Maintenance rules

- Application and business modules must not branch on `process.platform`.
- Registry, PowerShell, WMI, `ioreg`, `sysctl`, native input, native capture, platform paths, and login-item details stay under `agent/src/platform/`.
- Add a service only when it hides a real platform decision or native dependency.
- Preserve network event names and payloads unless an explicit compatibility migration is approved.
- Add Windows and macOS contract cases for every platform-service behavior change.
- Treat packaging identity and runtime identity as compatibility-sensitive public interfaces.
