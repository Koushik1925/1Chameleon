# 🛠️ Chameleon — Contributor & Implementation Guide (`CONTRIBUTOR_GUIDE.md`)

This guide is an implementation-level deep-dive for software engineers contributing to the **Chameleon** codebase. It covers exact module responsibilities, exported APIs, event flows, state mutations, performance hotspots, and rules for safe modification.

---

## 1. Subproject & Folder Architecture

### 📁 `/agent/src` — Desktop Host Agent (Electron)

#### Folder Purpose
The `/agent/src` directory contains the Electron main process, hidden background renderer, persistent background daemon, hardware identity storage, IPC channels, and native C++ OS input injection wrappers.

#### Dependencies
- `@nut-tree-fork/nut-js` (Native C++ Win32/macOS input driver)
- `socket.io-client` (Signaling & telemetry)
- `electron-store` & `safeStorage` (OS keychain credential encryption)
- `qrcode` (QR canvas generation)
- `child_process` (PowerShell hardware GUID queries)

#### Folder Structure & Module Responsibilities

| File | Exact Responsibility | Exported API | Callers / Usage |
|---|---|---|---|
| `main.js` | Electron Main Process. Manages window lifecycles, system tray, native input injection via `nut-js`, global shortcuts (`Cmd/Ctrl+Alt+P`), and Chromium GPU flags. | Internal process events (`app.whenReady`, `ipcMain.on`) | App entry point (`package.json` `main`) |
| `webrtc.html` | Hidden background renderer window. Handles screen capture (`getUserMedia`/`desktopCapturer`), WebRTC P2P PeerConnection, dual DataChannel messaging, adaptive bitrate control, and Socket.IO signaling. | Embedded script runtime | Loaded by `main.js` (`createBackgroundWindow`) |
| `core/daemon.js` | Background reconnection daemon. Maintains WebSocket signaling state with custom exponential backoff & jitter. | `daemon` (Instance of `Daemon` class) | Used in `ipc/server.js` |
| `storage/identity.js` | Generates hardware-derived Device IDs (hashed `MachineGuid` + motherboard serial) and manages encrypted token storage via Electron `safeStorage`. | `getOrGenerateDeviceId()`, `saveTokens()`, `getRefreshToken()`, `clearTokens()` | Used in `core/daemon.js`, `services/registrationManager.js`, `webrtc.html` |
| `services/api.js` | Axios HTTP client for registering devices with the signaling server. | `Api` class (`registerDevice`) | Used in `services/registrationManager.js` |
| `services/registrationManager.js` | Manages device registration status and IPC handlers for identity checking. | `registrationManager` | Used in `core/daemon.js` |
| `ipc/server.js` | Windows Named Pipe server (`\\.\pipe\chameleon-agent`) for local process communication & CLI status queries. | `startIPCServer()` | Called during daemon boot |
| `qr.html` / `preload.js` | Electron renderer window for rendering QR code and 6-digit numeric pairing key to host user. | IPC bridge (`window.electronAPI`) | Created by `main.js` (`createQRWindow`) |

#### Anti-Patterns in `/agent`
- ❌ **Calling `app.disableHardwareAcceleration()`**: Disables GPU H.264 NVENC/QuickSync encoding, causing CPU usage spikes.
- ❌ **Blocking Main Thread during Input Injection**: Awaiting heavy promises in `ipcMain.on('webrtc:remote_input')` stalls mouse responsiveness.
- ❌ **Injecting Modifier Keys (`Ctrl`, `Alt`, `Meta`) on `key_down`**: Modifiers must be tracked and neutralized to prevent host OS shortcut hijacking.

---

### 📁 `/client/src` — Web Client (React Viewer)

#### Folder Purpose
The `/client/src` directory contains the browser-native remote desktop viewer, WebRTC connection state machine, adaptive bitrate engine, touch gesture handler, and off-main-thread Web Worker frame decoder.

#### Dependencies
- `react` 19 & `react-dom` 19
- `react-router-dom` v7
- `socket.io-client` v4
- `lucide-react` (Iconography)
- `html5-qrcode` (Browser camera scanner)
- `@tailwindcss/vite` (TailwindCSS v4)

#### Folder Structure & Module Responsibilities

| File | Exact Responsibility | Exported API | Callers / Usage |
|---|---|---|---|
| `App.jsx` | Main client container and WebRTC signaling state machine. Manages connection states (`scan`, `connecting`, `connected`, `reconnecting`, `error`), dual DataChannel setup, ABR loop initiation, and socket disconnect listeners. | `ClientApp`, `App` (default) | Loaded by `main.jsx` |
| `components/RemoteView.jsx` | Renders high-frame-rate video or GPU canvas. Captures mouse, keyboard, touch, and scroll events; applies RAF coalescing; manages mobile context menus & quick settings drawers. | `RemoteView` (default component) | Rendered by `App.jsx` when `status === 'connected'` |
| `lib/adaptiveController.js` | Google Congestion Control (GCC) inspired Adaptive Bitrate engine. Monitors RTT, packet loss, and available bandwidth every second to step quality rungs up/down. | `AdaptiveController` class | Instantiated in `App.jsx` (`startAbrLoop`) |
| `lib/gestureHandler.js` | Mobile touch gesture handler mapping double-tap (fullscreen), long-press (right click), swipe-down (settings), and pinch (zoom). | `GestureHandler` class | Instantiated in `RemoteView.jsx` |
| `workers/frameWorker.js` | Web Worker running off the React UI thread. Decodes raw JPEG ArrayBuffers via `createImageBitmap()` and paints directly to `OffscreenCanvas`. | `onmessage` worker handler | Instantiated in `RemoteView.jsx` (`relayMode`) |
| `components/TopToolbar.jsx` | Floating session control toolbar displaying connection stats, stream latency, bitrate, quality switcher, and disconnect trigger. | `TopToolbar` component | Rendered inside `RemoteView.jsx` |
| `components/MobileFAB.jsx` | Floating Action Button menu for mobile layout control, clipboard push/pull, and screen toggles. | `MobileFAB` component | Rendered inside `RemoteView.jsx` |
| `components/MobileStatsOverlay.jsx` | Network health, RTT ping, and battery percentage badge overlay. | `MobileStatsOverlay` component | Rendered inside `RemoteView.jsx` |
| `components/MobileQuickSettings.jsx` | Slide-up modal for adjusting stream resolution (`1080p`, `720p`, `480p`), FPS cap, and bitrate limits. | `MobileQuickSettings` component | Rendered inside `RemoteView.jsx` |
| `components/MobileContextMenu.jsx` | Touch context menu providing quick Cut, Copy, Paste, and Rename OS actions. | `MobileContextMenu` component | Rendered inside `RemoteView.jsx` |
| `components/QRScanner.jsx` | HTML5 camera scanner component for scanning host QR code. | `QRScanner` component | Rendered in `App.jsx` (`status === 'scan'`) |
| `components/OTPInput.jsx` | 6-digit numeric pairing code input component. | `OTPInput` component | Rendered in `App.jsx` (`status === 'scan'`) |

#### Anti-Patterns in `/client`
- ❌ **Updating React State on Frame Receive**: Calling `setState` inside `socket.on('relay:frame')` triggers React reconciliation, adding 8–15 ms per frame. Frame ArrayBuffers must be transferred directly to `frameWorker.js`.
- ❌ **Storing WebRTC PeerConnection in `useState`**: Re-render cycles re-instantiate peer connections. Store instances in `useRef`.
- ❌ **Sending Uncoalesced Mouse Movements**: Sending `mousemove` on every raw DOM event saturates the DataChannel. Mouse coordinates must be coalesced using `requestAnimationFrame`.

---

### 📁 `/server/src` — Signaling Server & REST API

#### Folder Purpose
The `/server/src` directory contains the Node.js/Express server, Socket.IO WebRTC signaling router, admin JWT authentication, device registry, auto-fingerprint banning, and Mongoose database models.

#### Dependencies
- `express` v5
- `socket.io` v4
- `mongoose` v8
- `jsonwebtoken`
- `cors`, `dotenv`, `uuid`

#### Folder Structure & Module Responsibilities

| File | Exact Responsibility | Exported API | Callers / Usage |
|---|---|---|---|
| `index.js` | HTTP & WebSocket server entry point. Configures CORS, mounts REST routes, connects to MongoDB Atlas, maintains `activeSocketSessions` Map, and routes Socket.IO WebRTC signaling (`signal:sdp`, `signal:ice`, `relay:frame`, `admin:join_session`). | Express server instance | `npm run start` / `npm run dev` (`package.json`) |
| `routes/agent.js` | Public REST endpoints for Desktop Agents (`/register`, `/heartbeat`, `/session/start`, `/session/end`, `/logs`, `/version/check`). Enforces automatic hardware fingerprint banning. | Express `Router` | Mounted at `/api/agent` in `index.js` |
| `routes/devices.js` | Admin REST endpoints (`GET /`, `GET /:id`, `POST /:id/ban`, `POST /:id/unban`, `POST /:id/command`). | Express `Router` | Mounted at `/api/admin/devices` in `index.js` |
| `routes/auth.js` | Admin authentication endpoint (`POST /login`). Verifies credentials against environment variables and issues 24h JWT. | Express `Router` | Mounted at `/api/admin/auth` in `index.js` |
| `routes/sessions.js` | Admin session audit endpoints (`GET /`, `POST /:id/terminate`). | Express `Router` | Mounted at `/api/admin/sessions` in `index.js` |
| `routes/versions.js` | OTA version release management endpoints (`GET /`, `POST /`, `POST /:version/stable`, `DELETE /:version`). | Express `Router` | Mounted at `/api/admin/versions` in `index.js` |
| `routes/logs.js` | Audit & security event log querying endpoints with severity filtering and pagination. | Express `Router` | Mounted at `/api/admin/logs` in `index.js` |
| `middleware/adminAuth.js` | Express middleware verifying JWT bearer tokens on admin routes. | Middleware function `adminAuth` | Used in `devices.js`, `sessions.js`, `versions.js`, `logs.js` |
| `models/Device.js` | Mongoose schema for device registry, hardware fingerprints, health metrics, and ban status. | Mongoose Model `Device` | Used in `agent.js`, `devices.js`, `index.js` |
| `models/Session.js` | Mongoose schema for remote desktop pairing sessions. | Mongoose Model `Session` | Used in `agent.js`, `sessions.js`, `index.js` |
| `models/Version.js` | Mongoose schema for OTA agent software versions. | Mongoose Model `Version` | Used in `agent.js`, `versions.js`, `index.js` |
| `models/Log.js` | Mongoose schema for system audit logs. | Mongoose Model `Log` | Used across all server routes |

---

### 📁 `/frontend/src` — Admin Dashboard (React Portal)

#### Folder Purpose
The `/frontend/src` directory contains the admin management portal for monitoring device registries, inspecting live CPU/RAM telemetry, analyzing WebRTC stream stats, managing OTA agent releases, and stealth-viewing active remote desktop sessions.

#### Structure & Components

| File | Responsibility |
|---|---|
| `App.jsx` | Top-level admin layout, JWT route guard, and sidebar navigation routing. |
| `components/Dashboard.jsx` | Operational dashboard featuring Recharts live area charts for telemetry and line charts for WebRTC bitrate/latency. |
| `components/Devices.jsx` | Table listing all enrolled devices, online status, IP addresses, OS versions, and ban actions. |
| `components/DeviceDetail.jsx` | Deep-dive telemetry view for a single device, showing system specs, historical session logs, and command execution. |
| `components/Sessions.jsx` | Active session table with force-terminate triggers and live WebRTC performance metrics. |
| `components/StealthViewer.jsx` | Silent WebRTC video viewer component allowing administrators to observe active remote desktop sessions without alerting host or client. |
| `components/Downloads.jsx` | Version release manager for uploading, promoting to stable, or deprecating agent builds. |
| `components/Security.jsx` | Security log viewer highlighting fingerprint bans and failed login attempts. |

---

## 2. Comprehensive System Diagrams

### 🔄 Dependency Graph

```
[Agent Component]
  main.js
   ├── requires @nut-tree-fork/nut-js (Native Win32 SendInput)
   ├── requires electron (Tray, BrowserWindow, powerSaveBlocker, safeStorage)
   └── loads webrtc.html
        ├── requires socket.io-client
        ├── requires qrcode
        └── calls OS APIs via Electron IPC ('get-desktop-sources', 'webrtc:remote_input')

[Client Component]
  main.jsx
   └── App.jsx
        ├── imports socket.io-client
        ├── instantiates AdaptiveController (adaptiveController.js)
        └── renders RemoteView (RemoteView.jsx)
             ├── instantiates GestureHandler (gestureHandler.js)
             ├── instantiates Web Worker (frameWorker.js)
             ├── renders TopToolbar (TopToolbar.jsx)
             ├── renders MobileFAB (MobileFAB.jsx)
             └── renders MobileQuickSettings / MobileStatsOverlay

[Server Component]
  index.js
   ├── imports express, http, cors, mongoose, socket.io
   ├── mounts /api/agent (routes/agent.js)
   ├── mounts /api/admin/auth (routes/auth.js)
   ├── mounts /api/admin/devices (routes/devices.js -> middleware/adminAuth.js)
   ├── mounts /api/admin/sessions (routes/sessions.js -> middleware/adminAuth.js)
   └── interacts with Models (Device, Session, Version, Log)
```

---

### ⚡ Event Flow (Source to Destination)

```
[User Input in Browser]
       │
       ▼
RemoteView.jsx (DOM Event: mousemove / keydown / touch)
       │
       ├─► (If mousemove) ──► Coalesced by requestAnimationFrame (1 event/frame)
       │                           │
       │                           ▼
       ├─────────────────► sendInputEvent(payload)
       │                           │
       │     ┌─────────────────────┴─────────────────────┐
       │     ▼                                           ▼
       │  Mouse DataChannel                        Keyboard DataChannel
       │  (ordered: false, maxRetransmits: 0)     (ordered: true)
       │     │                                           │
       └─────┼─────────────────────┬─────────────────────┘
             │ (WebRTC UDP)        │
             ▼                     ▼
      webrtc.html (Hidden Renderer in Electron Agent)
             │
             ├─► ipcRenderer.send('webrtc:remote_input', data)
             │
             ▼
      main.js (Electron Main Process)
             │
             ├─► Checks `isControlPaused` emergency lock
             ├─► Neutralizes modifier keys (Ctrl/Alt/Meta/Shift)
             │
             ▼
      @nut-tree-fork/nut-js (C++ Native Binding)
             │
             ▼
      OS Level (Win32 SendInput / macOS EventTap) ──► Mouse/Keyboard Moves on Host PC!
```

---

### 🌐 API Call Graph

```
Client / Agent                     Signaling Server                    MongoDB Atlas
      │                                   │                                   │
      ├────── POST /api/agent/register ──►│                                   │
      │       (Hardware Fingerprint)      ├──── Device.findOne(fingerprint) ─►│
      │                                   │◄─── Returns Device Document ──────┤
      │                                   ├──── Saves/Auto-bans Device ──────►│
      │◄───── 200 OK / 403 Banned ───────┤                                   │
      │                                   │                                   │
      ├────── POST /api/agent/heartbeat ─►│                                   │
      │       (CPU/RAM Metrics)           ├──── Device.updateOne(lastSeen) ──►│
      │◄───── Returns Pending Commands ───┤                                   │
      │                                   │                                   │
      ├────── POST /api/admin/auth/login ►│                                   │
      │       (Admin Credentials)         ├──── Verifies process.env ─────────┤
      │◄───── Returns 24h JWT Token ──────┤                                   │
```

---

### 🎬 Rendering Flow (Browser Viewer)

```
1. Client loads index.html & main.jsx
   │
2. React mounts App.jsx (Initial state: status = 'scan')
   │
3. User enters 6-digit code or scans QR code
   │
4. State transitions: status = 'connecting'
   │
5. Socket.IO connects to Signaling Server & emits 'client:join_session'
   │
6. Agent receives 'agent:client_joined' -> instantiates RTCPeerConnection & captures screen
   │
7. SDP Offer/Answer and ICE candidates exchanged over Socket.IO
   │
8. WebRTC connection state moves to 'connected'
   │
9. `ontrack` fires in browser -> remote MediaStream assigned to videoRef.current
   │
10. Browser GPU decodes H.264 stream and paints first frame to <video> element!
```

---

### 🔑 Authentication Flow

```
[Admin Portal]
  1. User enters username & password in Login.jsx
  2. POST /api/admin/auth/login
  3. Server compares against process.env.ADMIN_USERNAME & ADMIN_PASSWORD
  4. Server generates JWT: jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' })
  5. Client stores token in localStorage ('token')
  6. Subsequent API requests attach header: `Authorization: Bearer <TOKEN>`
  7. Express middleware `adminAuth.js` validates JWT via `jwt.verify()`

[Desktop Agent Fingerprint Auth]
  1. Agent gathers hardware GUID & motherboard serial number
  2. Creates SHA-256 fingerprint hash (`storage/identity.js`)
  3. POST /api/agent/register
  4. Server checks if fingerprint matches any banned device in database
  5. If matched -> Auto-bans device and returns HTTP 403 Access Denied
```

---

### 🔄 Session Lifecycle

1. **Creation**:
   - Desktop Agent boots and calls `getPermanentSessionId()`, deriving a 100% persistent 6-digit pairing code based on OS hostname & hardware specs.
   - Emits `agent:create_session` to Signaling Server.
   - Server creates active record in `activeSocketSessions` Map and updates MongoDB `Session` document.
2. **Maintenance**:
   - Agent streams telemetry (`telemetry:stream`) and WebRTC performance stats (`session:metrics`) every 1 second.
   - `AdaptiveController` monitors RTT and packet loss every 1 second, dynamically adjusting encoder bitrate between 500 Kbps and 8 Mbps.
   - Agent sends heartbeat ping every 8 seconds to prevent server drop.
3. **Termination**:
   - Disconnect triggered by client user, host tray menu, or admin force-terminate (`POST /api/admin/sessions/:id/terminate`).
   - Server emits `session:ended` event to all connected sockets.
   - Database session record updated with `status = 'completed'` or `'terminated'` and final duration.

---

### 🛡️ Error Recovery

- **ICE Connection Failures**: If WebRTC `connectionState` moves to `'failed'`, the client and agent execute `peerConnection.restartIce()` to attempt background renegotiation without tearing down UI state.
- **Agent Disconnection**: If host agent drops, client transitions to `reconnecting` status and executes aggressive retry polling every 2 seconds for up to 30 seconds.
- **Signaling Reconnection**: `daemon.js` implements exponential backoff with 20% randomized jitter (delays: 1s, 2s, 5s, 10s, 20s, 30s max) to prevent server thundering herd problems upon restart.
- **Modifier Key Release**: On window blur, `RemoteView.jsx` sends explicit `key_up` events for all modifier keys (`Ctrl`, `Alt`, `Meta`, `Shift`) to prevent stuck keys on the host machine.

---

## 3. Performance Hotspots

Changing code in the following files can directly impact streaming latency or CPU utilization:

1. **`agent/src/main.js`**:
   - *Hotspot*: `ipcMain.on('webrtc:remote_input')` handler.
   - *Risk*: Any synchronous file I/O, heavy computation, or unhandled promise in this block will delay native OS input injection, creating cursor lag.
2. **`client/src/components/RemoteView.jsx`**:
   - *Hotspot*: `handleMouseMove` and touch event listeners.
   - *Risk*: Removing `requestAnimationFrame` coalescing will flood the WebRTC DataChannel with hundreds of DOM events per second, causing channel congestion.
3. **`agent/src/webrtc.html`**:
   - *Hotspot*: Encoder parameters and ABR loop (`applyEncoderParameters`).
   - *Risk*: Changing `degradationPreference` from `'maintain-framerate'` to `'maintain-resolution'` will cause severe framerate drops (slideshow effect) during network congestion.
4. **`client/src/workers/frameWorker.js`**:
   - *Hotspot*: JPEG array buffer decoding and bitmap management.
   - *Risk*: Forgetting to call `bitmap.close()` after painting to canvas causes immediate VRAM memory leaks.

---

## 4. Safe Modification Guide

| Subproject / Directory | Safe Changes | Risky Changes | Forbidden Changes | Rarely Modified Files |
|---|---|---|---|---|
| `/agent` | Adding tray menu options, updating UI styles in `qr.html`, tweaking heartbeat intervals. | Modifying `keyMap` bindings, altering `safeStorage` encryption logic. | Calling `app.disableHardwareAcceleration()`, blocking the main thread during input injection. | `storage/identity.js`, `ipc/server.js` |
| `/client` | Adding toolbar buttons, updating mobile overlay UI, adjusting Tailwind styles. | Modifying `AdaptiveController` threshold logic, changing touch gesture thresholds. | Calling React `setState` inside high-frequency `relay:frame` handlers, storing WebRTC PeerConnection in `useState`. | `workers/frameWorker.js`, `lib/adaptiveController.js` |
| `/server` | Adding administrative log routes, expanding telemetry statistics, updating version seed data. | Modifying Socket.IO signaling event names, altering MongoDB Mongoose index definitions. | Disabling CORS or JWT authentication middleware on administrative endpoints. | `middleware/adminAuth.js`, `db/index.js` |
| `/frontend` | Adding dashboard widgets, customizing Recharts graph colors, updating device management tables. | Changing Socket.IO admin room subscription names (`admin:dashboard`). | Hardcoding authentication tokens or API credentials in client code. | `App.jsx`, `components/Login.jsx` |

---
*Created for Chameleon Engineering Team (`CONTRIBUTOR_GUIDE.md`).*
