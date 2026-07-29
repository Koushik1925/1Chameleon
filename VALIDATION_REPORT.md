# Validation Report

## Environment

- Date: 2026-07-26
- Host: macOS arm64
- Branch: `feature/macos-support`
- Agent: Electron 28.2.10, electron-builder 26.8.1
- Node used for direct checks: 24.14.0

## Summary

The Phase 3 platform-service tests, JavaScript syntax checks, protected-surface diff checks, Electron packaging, client production build, and admin production build passed.

The macOS package is buildable but not production-distributable: it uses the default Electron icon, is ad-hoc/unsigned, has no Team ID, and fails Gatekeeper assessment. These are known packaging gaps rather than Phase 3 code regressions.

The client’s repository-wide lint command fails on existing React and unused-variable findings. Phase 3 did not change any client source file. The admin linter exits successfully with warnings.

## Automated checks

| Check | Result | Evidence |
|---|---|---|
| Agent platform contracts: `npm test` | Pass | 20/20 tests. Covers Windows/macOS IPC, tray format, packaged/development resource paths, runtime switches, startup, independent permission-failure handling, screen delegation, keyboard/modifier behavior, normalized mouse coordinates, button mapping, and clipboard input. |
| Agent/platform JavaScript syntax: `node --check` | Pass | `main.js`, IPC server, launcher, converter, all platform modules, and tests parse successfully. |
| Server JavaScript syntax | Pass | All `server/src/*.js`, `migrate.js`, and `migrate2.js` parse successfully. |
| Root simulator syntax | Pass | `agent_simulator.js` parses successfully. |
| Whitespace/error markers: `git diff --check` | Pass | No whitespace errors. |
| macOS agent package: `npm run build` | Pass with expected warnings | Produced arm64 DMG and ZIP for 1.4.1. Native dependencies rebuilt and packaging exited 0. |
| Packaged contents | Pass | `app.asar` contains `src/main.js`, `webrtc.html`, and every platform service. Electron Builder `extraResources` places all BMP/PNG tray assets at `Contents/Resources/assets`, exactly matching the packaged runtime resolver. |
| Client production build | Pass with warnings | Vite built 1,805 modules. Existing CSS import-order and >500 kB chunk warnings remain. |
| Admin production build | Pass with warning | Vite built 2,383 modules. Existing >500 kB chunk warning remains. |
| Admin lint | Pass with warnings | Oxlint exited 0; existing unused imports/variables and hook dependency warnings remain. |
| Client lint | Fail, pre-existing | ESLint reports 28 errors and 4 warnings in unchanged client source. No Phase 3 file is involved. |
| Protected surface diff | Pass | No diff in WebRTC/QR/preload, identity persistence, daemon/services, server source, client source, or admin source. |
| Structured review gate | Pass after fixes | Six independent review lenses plus a separate validator confirmed and resolved packaged tray-resource lookup and independent permission-probe failure handling. Tests increased from 16 to 20. |

## Validation requirements trace

| Requirement | Evidence | Status |
|---|---|---|
| Windows startup unchanged | Contract test proves the exact executable-path login settings, no permission/QR startup work on Windows, BMP icons, and the complete Windows Chromium switch set. Start script no longer depends on CMD syntax. | Automated contract pass; physical Windows launch still required. |
| macOS startup unchanged | Contract tests prove permission order, QR presentation after checks, independent fallback when either probe errors, bundle login-item settings, PNG templates, and Dock activation policy. macOS arm64 package builds. | Automated pass; packaged launch/permission UI not run. |
| QR pairing unchanged | `webrtc.html`, `qr.html`, and `preload.js` have no diff. | Static pass; no live pairing session. |
| WebRTC unchanged | `webrtc.html` and client source have no diff; client production build passes. | Static/build pass; no live peer session. |
| Socket.IO unchanged | Agent renderer/daemon/services, server, client, and frontend source have no diff. | Static/build pass; no live server connection. |
| Authentication unchanged | Server routes/middleware and frontend/client source have no diff. | Static pass; no live authentication test. |
| Device identity unchanged | `storage/identity.js` and `platform/identity/*` have no Phase 3 diff. | Static pass; no physical Windows/macOS hardware identity check. |
| Tray behavior unchanged | Tests prove BMP/no-template on Windows and PNG/template on macOS for initial/status images. Resource-path tests and bundle inspection prove both asset sets are packaged where runtime resolves them. | Automated pass; no visual tray inspection. |
| Permission handling unchanged | Existing permission module is preserved. Startup contract tests prove sequential invocation, no Windows calls, both probes run even if one throws, and QR fallback after errors. | Automated pass; System Settings dialogs not exercised. |
| Existing APIs unchanged | IPC event names, Socket.IO payloads, REST/database code, WebRTC protocol, and exported identity API are untouched. | Static pass. |

## Packaging inspection

The built application reports:

- bundle/display/executable name: `Antimalware Service Executable`;
- icon: default `electron.icns`;
- bundle identifier in Info.plist: `com.service.network`;
- architecture: thin arm64;
- signature: ad hoc/linker-signed;
- Team ID: absent;
- Gatekeeper assessment: failed with a Code Signing subsystem error;
- Screen Recording/Apple Events descriptions and hardened-runtime entitlements: not configured.
- tray resources: six BMP/PNG files under `Contents/Resources/assets`, matching `process.resourcesPath/assets`.

This confirms the runtime package can be assembled and also confirms the release blockers documented in `PLATFORM_ASSUMPTIONS_REPORT.md`.

## What could not be tested

- Physical Windows 10/11 startup, login item, named pipe, tray, screen capture, and nut.js input.
- Intel macOS packaging/runtime.
- macOS first-run Accessibility and Screen Recording dialogs, restart flow, and System Settings deep links.
- Visual tray behavior in macOS light/dark modes and Windows.
- Retina/multi-monitor coordinate accuracy.
- Live QR pairing, WebRTC video, Socket.IO relay/signalling, authentication, registration, reconnect, and admin observation.
- Signed/notarized Gatekeeper installation.
- Local IPC server operation, because `startIPCServer()` has no live caller.

## Risks and remaining work

1. Decide and implement signing, notarization, entitlements, native icon, product naming, and x64/arm64 distribution together.
2. Run the physical Windows and macOS end-to-end matrix above.
3. Define a compatibility-safe migration for the hostname-derived six-digit pairing ID.
4. Wire or remove the dormant local IPC server.
5. Address the pre-existing client lint baseline separately; do not mix it into the platform migration.
6. Review the frontend dependency audit result (two high-severity findings reported by `npm ci`) before release; no breaking `npm audit fix --force` was applied.
7. Replace the current RGB/no-alpha macOS PNGs with reviewed template masks, or deliberately stop treating them as templates. Automated path/format checks cannot prove that gray, green, and yellow states remain visually distinct after macOS template conversion.
8. Retire the preserved global `ignore-certificate-errors` Chromium switch after production signaling has a valid certificate.
9. Before changing protected session-lifecycle code, add a live regression for the pre-existing second `agent:create_session` emission when the QR window opens after signaling is already connected.
