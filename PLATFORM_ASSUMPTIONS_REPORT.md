# Platform Assumptions Report

## Scope and method

This Phase 3 audit covers the entire repository, with implementation changes limited to the Electron agent and its documentation. The scan included:

- raw platform checks (`process.platform`, `os.platform`, `win32`, `darwin`);
- Registry, PowerShell, WMI, shell commands, `child_process`, `spawn`, and `execSync`;
- named pipes, Unix sockets, Windows path separators, and fixed OS paths;
- Electron `desktopCapturer`, tray, login-item, runtime, and packaging behavior;
- `@nut-tree-fork/nut-js` access;
- npm scripts, Electron Builder, GitHub Actions, release metadata, UI defaults, and public documentation.

Generated code, dependencies, binary release artifacts, and historical examples inside the earlier migration reports were not counted as live implementation assumptions.

## Result

The Electron main process now contains no raw platform checks and no direct `nut-js` or `desktopCapturer` access. Windows-specific behavior that must remain is isolated behind the platform layer and covered by contract tests.

The remaining assumptions fall into three groups:

1. release/packaging decisions that require product and signing choices;
2. pairing/telemetry behavior that cannot be changed safely without an explicit compatibility migration;
3. platform-specific code that is already correctly isolated.

## Resolved in Phase 3

| ID | Previous location | Assumption | Resolution |
|---|---|---|---|
| R1 | `agent/package.json` `scripts.start` | Windows CMD `set NAME=value && ...` syntax | `npm start` now runs the existing Node launcher, which removes `ELECTRON_RUN_AS_NODE` from a copied environment and spawns Electron portably. |
| R2 | `agent/convert.js` | Backslash-only source and destination paths | Paths now use `path.join(__dirname, ...)`. |
| R3 | `agent/src/ipc/server.js` | Hard-coded `\\.\pipe\chameleon-agent` | `platform/ipc` preserves that exact Windows address and returns a temp-directory Unix socket on POSIX. |
| R4 | `agent/src/main.js` tray functions | Raw `process.platform` checks, direct BMP/PNG selection, and source-tree-only asset paths | `platform/tray` selects Windows BMPs or macOS PNG template images and resolves source vs packaged resources. Electron Builder now places both asset sets under `resources/assets`. |
| R5 | `agent/src/main.js` startup | Windows executable-path login-item settings applied to macOS | `platform/startup` preserves the Windows settings and uses bundle-oriented hidden login-item settings on macOS. |
| R6 | `agent/src/main.js` startup and Dock activation | Raw macOS checks in application orchestration | `platform/startup` owns permission sequencing, initial QR presentation, and Dock activation policy. |
| R7 | `agent/src/main.js` remote input | Direct `@nut-tree-fork/nut-js` access and native modifier state in orchestration code | `platform/input` owns native input, key mapping, modifier neutralization, coordinate mapping, and clipboard writes. |
| R8 | `agent/src/main.js` screen source handler | Direct `desktopCapturer` access | `platform/screen` owns Electron capture-source discovery. |
| R9 | `agent/src/main.js` GPU setup | Windows shader-cache workaround applied globally | `platform/runtime` applies shared switches on both platforms and the shader-cache workaround only on Windows. |

## Remaining actionable assumptions

### A1. Six-digit pairing identity is hostname-derived

- Location: `agent/src/webrtc.html`, `getPermanentSessionId()`
- Current behavior: hashes `os.hostname()`, `os.arch()`, and `os.platform()`.
- Impact: macOS hostnames can change, so the supposedly permanent QR/numeric pairing code can change. The function also duplicates identity policy outside `platform/identity`.
- Severity: high.
- Recommendation: design a compatibility migration before changing it. The renderer should request a stable pairing seed or existing pairing code through an application-facing identity API. Do not silently substitute the 12-character device ID because that would change the public six-digit pairing identity.

### A2. Server OS display normalization recognizes only Windows

- Location: `server/src/index.js`, `agent:create_session` handling.
- Current behavior: converts `win32` to `Windows` and stores every other platform code verbatim.
- Impact: macOS devices are recorded as `darwin`.
- Severity: medium, display/data-quality only.
- Recommendation: introduce a small platform-label mapper (`win32` → `Windows`, `darwin` → `macOS`) without changing the socket payload or database schema.

### A3. Admin device list defaults missing OS data to Windows

- Location: `frontend/src/components/Devices.jsx`.
- Current behavior: `device.osName || 'Windows'`.
- Impact: unknown or legacy macOS devices are mislabeled as Windows.
- Severity: low.
- Recommendation: use `Unknown` for missing data after A2 is deployed.

### A4. Dormant agent window contains Windows-only copy

- Location: `agent/src/link.html`.
- Current behavior: says “persistent Windows agent”.
- Impact: inaccurate if that legacy window is restored on macOS.
- Severity: low; the file is not currently loaded by `main.js`.
- Recommendation: make the copy platform-neutral or remove the unused window after confirming it has no external consumer.

### A5. Shared package identity is Windows-oriented

- Location: `agent/package.json` (`productName`, global `artifactName`, DMG title).
- Current behavior: macOS inherits “Antimalware Service Executable” and `Network-Provider-Access-Setup-*`.
- Impact: poor macOS Finder, permission-dialog, Gatekeeper, and installer identity. Changing the global values would also rename the production Windows installation.
- Severity: high for production distribution.
- Recommendation: make a product naming decision first, then use platform-specific build configuration or separate build invocations so Windows names remain backward compatible.

### A6. macOS packaging is intentionally unsigned and incomplete

- Location: `agent/package.json` `build.mac`.
- Current behavior: `identity: null`, no hardened runtime, no entitlements, and no explicit Intel/Apple Silicon target matrix.
- Impact: unsuitable for normal Gatekeeper distribution and ambiguous architecture output.
- Severity: high for production release, not a runtime regression.
- Recommendation: add reviewed entitlements, explicit targets, certificate-backed signing, and notarization together. Removing `identity: null` without credentials would not make the release production-ready.

### A7. Update metadata advertises only the Windows installer

- Location: `server/src/index.js`, `/system-status` response.
- Current behavior: returns a single `.exe` download URL.
- Impact: macOS agents cannot discover an appropriate release from that metadata.
- Severity: medium.
- Recommendation: extend the response compatibly with per-platform artifacts while retaining the existing field for older Windows agents.

### A8. Public download UI still treats macOS as unreleased

- Location: `client/src/components/Home.jsx` and `README.md`.
- Current behavior: Windows is downloadable; macOS says “Coming Soon” even though macOS artifacts exist under `client/public`.
- Impact: release state and implementation state disagree.
- Severity: medium product/release risk.
- Recommendation: update only when a signed, notarized, validated artifact is ready.

### A9. Repository artifact allow-list is Windows-only

- Location: `.gitignore`.
- Current behavior: selectively allows `Network-Provider-Access-Setup-*.exe` and `.blockmap` under `agent/dist`.
- Impact: a workflow that expects versioned macOS artifacts in `agent/dist` will not track them.
- Severity: low because the macOS workflow currently uploads CI artifacts instead.
- Recommendation: document the intended artifact policy; add DMG/ZIP exceptions only if binaries are meant to be committed.

### A10. Public architecture language remains Windows-first

- Location: `README.md`.
- Current behavior: platform badge, capture/input descriptions, compatibility table, and roadmap still describe a Windows-only agent.
- Impact: contributors and users receive stale platform guidance.
- Severity: low for runtime, medium for maintenance.
- Recommendation: update after signed macOS release readiness is decided. `PROJECT.md`, `CONTRIBUTOR_GUIDE.md`, and the agent handoff context have been updated for the new platform layer.

## Correctly isolated platform-specific implementations

| Location | Platform behavior | Assessment |
|---|---|---|
| `agent/src/platform/identity/windows.js` | PowerShell, Registry `MachineGuid`, WMI motherboard serial | Correct boundary; unchanged by Phase 3. |
| `agent/src/platform/identity/macos.js` | `ioreg`, `sysctl`, and POSIX shell pipelines | Correct boundary. Future hardening may replace pipelines with argument-based commands and JavaScript parsing. |
| `agent/src/platform/identity/index.js` | Routes `win32` and `darwin` identity providers | Correct boundary. |
| `agent/src/platform/permissions.js` | macOS permission probes, dialogs, and System Settings URLs | Correct boundary. |
| `agent/src/platform/ipc/windows.js` | Win32 named-pipe syntax | Correct boundary and contract-tested. |
| `agent/src/platform/ipc/macos.js` | Temp-directory Unix socket | Correct boundary and contract-tested. |
| `agent/src/platform/runtime/index.js` | Windows-only shader-cache switch | Correct boundary and contract-tested. |
| `agent/src/platform/startup/index.js` | Windows executable login item vs macOS bundle behavior | Correct boundary and contract-tested. |
| `agent/src/platform/tray/index.js` | Windows BMP vs macOS PNG template image; source vs packaged resource path | Correct boundary and contract-tested. |

`agent/start.js` also uses `child_process.spawn`, but it passes an executable and argument array without a shell, uses `cwd`, and supplies a copied environment. That is a cross-platform process launch, not a Windows shell assumption.

## Inspected and confirmed cross-platform

- Node `path.join`, `os.tmpdir`, `fs`, `crypto`, and Electron `safeStorage`.
- Socket.IO event names and payloads.
- WebRTC SDP, ICE, DataChannel, capture constraints, and relay logic.
- Electron `BrowserWindow`, `Menu`, `powerSaveBlocker`, `globalShortcut`, and clipboard usage.
- `CommandOrControl+Alt+P`.
- Client, frontend, and server npm scripts.
- The simulator’s Windows device records, which are intentional test fixtures rather than production platform selection.

## Non-platform production issues discovered

- `startIPCServer()` is exported but has no live caller. Decide whether to wire it or remove the dormant subsystem.
- The preserved Chromium `ignore-certificate-errors` switch disables certificate validation globally. Removing it is outside this compatibility cleanup, but production signaling must use a valid certificate and then retire the switch.
- Before activating the POSIX IPC endpoint, define its trust boundary and add restrictive socket permissions, client authentication, stale-socket cleanup, and shutdown cleanup.
- `agent/convert.js` requires `sharp`, but `sharp` is not declared in `agent/package.json`; the referenced `agent/build/icon.png` is also absent from the checkout.
- The macOS tray PNGs are RGB images without alpha channels but are marked as template images. Their resource path is now correct, but a physical light/dark-mode check must confirm whether the three status states remain distinguishable; otherwise replace them with reviewed alpha-mask templates or preserve their colors without template conversion.
- Opening the QR window after the hidden renderer has already connected can re-emit `agent:create_session` with only the session ID. This is pre-existing Phase 2/session-lifecycle behavior and was not changed in Phase 3; protect any fix with a live pairing/identity regression test.
- The hidden renderer still combines pairing identity, Socket.IO, screen capture, WebRTC, relay, and bitrate control in one HTML script. This is a maintainability concern, but changing it in Phase 3 would violate the “do not touch signalling/session lifecycle” boundary.
