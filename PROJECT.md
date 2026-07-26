# 🦎 Chameleon — Comprehensive Developer Guide (`PROJECT.md`)

Welcome to the **Chameleon** codebase! This document provides a complete overview of the project's architecture, data flows, APIs, tech stack, and development workflows. Reading this guide will give you a complete understanding of the system so you can start contributing within an hour.

---

## 1. Project Overview

**Chameleon** is an ultra-low-latency peer-to-peer (P2P) remote desktop platform engineered for sub-100ms glass-to-glass latency, instant QR/numeric-code pairing, and browser-native remote control. 

### Key Characteristics:
- **No Client Installation Required**: The remote viewer runs directly in any modern web browser.
- **Hardware-Accelerated Streaming**: Electron host agent utilizes GPU-accelerated H.264 video encoding (NVENC / Intel QuickSync) and DXGI desktop capture.
- **Dual WebRTC DataChannels**: Separates mouse movement (unreliable/unordered UDP for zero cursor lag) from keyboard/clicks (reliable/ordered for guaranteed delivery).
- **Stealth Observation**: Admin dashboard supports silent monitoring of active sessions for security and support.
- **Hardware-Derived Identity**: Desktop agents generate a permanent 6-digit numeric pairing code derived from hardware GUIDs.

---

## 2. Architecture Diagram

```
                                  +------------------------------+
                                  |   Signaling Server (Render)  |
                                  |   Node.js / Express / WS     |
                                  |   MongoDB Atlas Database     |
                                  +--------------+---------------+
                                                 |
                       1. REST Register /        |  2. SDP & ICE Exchange
                       Heartbeat / Telemetry     |  via Socket.IO (TLS)
                                                 |
         +---------------------------------------+---------------------------------------+
         |                                                                               |
         v                                                                               v
+-----------------------------------+   3. Direct P2P WebRTC Connection    +-----------------------------------+
|     Desktop Agent (Electron)      |======================================|     Web Client Viewer (React)     |
|  - Host Machine Screen Capture    |  - SRTP H.264 Video Stream (UDP)     |  - HTML5 Video / Canvas Render    |
|  - GPU H.264 HW Encoder           |  - Mouse DataChannel (Unordered/UDP) |  - Touch & Gesture Controls       |
|  - Nut.js OS Input Injection      |  - Keyboard DataChannel (Ordered)    |  - Adaptive Bitrate Controller    |
+-----------------------------------+                                      +-----------------------------------+
                                                      ||
                                                      || (Fallback if P2P fails)
                                                      \/
                                         +--------------------------+
                                         |   Socket.IO Frame Relay  |
                                         |   (Volatile JPEG Frames) |
                                         +--------------------------+
```

---

## 3. Folder Structure

The repository is structured as a decoupled multi-component codebase:

```
/Chameleon
├── agent/               # Electron Desktop Agent (Host Application)
│   ├── build/           # Build assets (app icons, installers)
│   └── src/
│       ├── core/        # Persistent daemon process & socket reconnection
│       ├── ipc/         # Named pipe IPC server for local process comms
│       ├── services/    # REST API client & device registration manager
│       ├── storage/     # Hardware fingerprinting & safeStorage credentials
│       ├── main.js      # Electron Main Process (Tray, Nut.js input injection, OS shortcuts)
│       ├── preload.js   # Context bridge for renderer windows
│       ├── qr.html      # Desktop agent pairing UI & QR code display window
│       └── webrtc.html  # Hidden background renderer window (Screen capture & WebRTC)
│
├── client/              # React Web Client (Browser Remote Viewer)
│   └── src/
│       ├── components/  # RemoteView, TopToolbar, MobileFAB, QRScanner, OTPInput, etc.
│       ├── lib/         # AdaptiveController (ABR engine), GestureHandler (Touch controls)
│       ├── workers/     # frameWorker.js (Off-main-thread Web Worker for JPEG relay decode)
│       ├── App.jsx      # WebRTC signaling state machine & connection orchestrator
│       └── main.jsx     # React root entry point
│
├── frontend/            # React Admin Dashboard (Management Portal)
│   └── src/
│       ├── components/  # Dashboard, Devices, DeviceDetail, Sessions, StealthViewer, etc.
│       ├── App.jsx      # Router & JWT authentication state guard
│       └── main.jsx     # React entry point
│
├── server/              # Node.js Signaling Server & Admin Backend
│   └── src/
│       ├── db/          # Mongoose MongoDB Atlas database connection
│       ├── middleware/  # Admin JWT auth & input validation middleware
│       ├── models/      # Device, Session, Version, Log, ErrorLog schemas
│       ├── routes/      # Agent, Auth, Devices, Sessions, Versions, Logs endpoints
│       └── index.js     # Express server setup, Socket.IO WebRTC signaling & relay
│
├── agent_simulator.js   # Node.js simulator spawning 5 mock agents for load testing
├── ARCHITECTURE_BLUEPRINT.md # Ultra-low-latency pipeline architectural design
├── README.md            # Public repository README
└── LICENSE              # Proprietary License
```

---

## 4. Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Desktop Agent** | Electron | ^28.2.10 | Host desktop application runtime |
| **Native Input** | `@nut-tree-fork/nut-js` | ^4.2.6 | OS-level C++ mouse/keyboard event injection |
| **Web Client** | React + Vite | React 19, Vite 7 | High-performance browser viewer app |
| **Styling** | TailwindCSS | v4 (Client), v3 (Frontend) | Responsive styling & dark glassmorphism design |
| **Admin Dashboard** | React + Recharts | React 19, Recharts 3 | Device management & real-time telemetry graphs |
| **Signaling Backend**| Node.js + Express | Express 5 | WebSocket signaling server & REST API |
| **Database** | MongoDB Atlas (Mongoose) | Mongoose 8 | Persistent store for devices, sessions, logs, versions |
| **Real-time Protocol**| Socket.IO | ^4.8.3 | WebSockets for SDP/ICE signaling & telemetry stream |
| **Media Transport** | WebRTC | Native Browser API | SRTP over UDP direct P2P video & data channels |
| **Off-Thread Decode**| Web Workers | Native Web API | OffscreenCanvas & createImageBitmap GPU decode |

---

## 5. Data Flow

### Video Streaming Data Flow (P2P WebRTC Mode)
1. **Capture**: Desktop Agent uses Chromium `desktopCapturer` / DXGI Desktop Duplication API to capture raw screen frames.
2. **Encode**: Hardware encoder (NVENC / Intel QuickSync) encodes frames into H.264 Baseline Profile in GPU memory.
3. **Transport**: Encoded RTP packets travel over direct WebRTC UDP stream (`MediaStreamTrack`).
4. **Decode & Render**: Browser `<video>` element decodes frames using hardware acceleration and paints to screen.

### Remote Input Data Flow
1. **Capture**: Client DOM captures mouse and keyboard events in `RemoteView.jsx`.
2. **Coalescing**: Mouse movements are coalesced using `requestAnimationFrame` (1 event per paint frame max).
3. **Routing**:
   - `mouse_move` & `mouse_wheel` ➔ **Mouse Channel** (`ordered: false, maxRetransmits: 0`).
   - Keystrokes, clicks, clipboard ➔ **Keyboard Channel** (`ordered: true`).
4. **Injection**: Desktop Agent receives payload over DataChannel and invokes `@nut-tree-fork/nut-js` (`mouse.setPosition`, `keyboard.pressKey`) to inject at OS level.

### Relay Fallback Data Flow
If direct WebRTC P2P fails due to symmetric NAT:
1. Agent draws video frame to offscreen `<canvas>` at 20 FPS max.
2. Frame is converted to JPEG Blob (0.55 quality, <=960px width) and emitted over Socket.IO (`relay:frame`).
3. Server forwards binary ArrayBuffer to Web Client.
4. Client transfers ArrayBuffer (zero-copy) to `frameWorker.js`.
5. Worker decodes frame via `createImageBitmap()` and paints to GPU `<canvas>`.

---

## 6. API Flow & Endpoints

### Signaling Socket.IO Events
- `agent:create_session`: Agent registers session with custom or permanent 6-digit code.
- `client:join_session`: Viewer joins session using session code.
- `signal:sdp`: Exchanging SDP Offers and Answers between host and viewer.
- `signal:ice`: Exchanging ICE candidates for P2P connection establishment.
- `telemetry:stream`: Agent streams CPU/RAM load to admin dashboard room `admin:dashboard`.
- `session:metrics`: Session streams WebRTC stats (FPS, bitrate, latency, packet loss) to admin dashboard.
- `admin:join_session`: Admin stealthily requests agent to establish a separate video-only peer connection.

### REST Endpoints Summary

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/agent/register` | Agent | Register device hardware fingerprint & metadata |
| `POST` | `/api/agent/heartbeat` | Agent | Report CPU/RAM metrics and poll for admin commands |
| `POST` | `/api/agent/session/start` | Agent | Log session creation |
| `POST` | `/api/agent/session/end` | Agent | Log session completion & duration |
| `GET`  | `/api/agent/version/check` | Agent | Check for OTA updates |
| `POST` | `/api/admin/auth/login` | Public | Admin login & JWT token generation |
| `GET`  | `/api/admin/devices` | Admin | List all registered devices |
| `POST` | `/api/admin/devices/:id/ban` | Admin | Ban device by hardware fingerprint |
| `POST` | `/api/admin/devices/:id/command` | Admin | Queue remote command (`restart`, `disconnect`) |
| `GET`  | `/api/admin/sessions` | Admin | List active & historical sessions |
| `POST` | `/api/admin/sessions/:id/terminate` | Admin | Force-terminate an active session |
| `GET`  | `/api/admin/versions` | Admin | Manage release channels & promote stable versions |
| `GET`  | `/api/admin/logs` | Admin | Query system audit logs with filters |

---

## 7. Authentication & Security Flow

1. **Admin Authentication**:
   - Admin logs in via `/api/admin/auth/login`.
   - Server verifies credentials against `ADMIN_USERNAME` and `ADMIN_PASSWORD` env vars.
   - Generates a 24-hour signed JWT token sent in `Authorization: Bearer <TOKEN>` headers.
2. **Device Hardware Fingerprinting & Banning**:
   - Agent generates a unique fingerprint hash derived from `MachineGuid` and motherboard serial number (`storage/identity.js`).
   - If an agent registers with a fingerprint matching a banned device, the server automatically auto-bans the new device ID.
3. **Agent Token Encryption**:
   - Desktop Agent stores persistent refresh tokens in OS keychain using Electron's `safeStorage` API.
4. **Emergency Remote Control Pause**:
   - Agent registers global shortcut `Cmd/Ctrl + Alt + P`. Pressing this immediately toggles `isControlPaused`, blocking all native input injection.

---

## 8. State Management

- **Client Session State**: Managed in `client/src/App.jsx` using a clear state machine (`'scan'` ➔ `'connecting'` ➔ `'connected'` ➔ `'reconnecting'` ➔ `'error'`).
- **WebRTC Peer & Channel References**: WebRTC connections (`peerRef`, `mouseChannelRef`, `keyboardChannelRef`) are stored in React `useRef` to prevent re-render thrashing during high-frequency streaming.
- **Zero-Queue Frame Buffer**: Relay frames are passed directly to `frameWorker.js` without updating React state. Frame worker drops frames older than 50ms to prevent buffer buildup.
- **Server Session Registry**: In-memory `Map` (`activeSocketSessions`) tracks active pairing sessions, mapping `sessionId` to `agentSocketId`, `clientSocketId`, and `adminSocketIds`.

---

## 9. Important Utilities

- **`AdaptiveController` (`client/src/lib/adaptiveController.js`)**: GCC-inspired Adaptive Bitrate engine. Monitors RTT, packet loss, and available bandwidth to step through quality rungs (`1080p60`, `720p60`, `720p30`, `480p30`, `360p20`).
- **`GestureHandler` (`client/src/lib/gestureHandler.js`)**: Mobile gesture recognition engine for double-tap (fullscreen), long-press (right-click), swipe-down (quick settings), and pinch-to-zoom.
- **`frameWorker` (`client/src/workers/frameWorker.js`)**: Off-main-thread Web Worker that decodes JPEG ArrayBuffers into `ImageBitmap` objects for zero-copy GPU canvas rendering.
- **`identity` (`agent/src/storage/identity.js`)**: Hardware identifier extraction and encrypted credential storage utility.

---

## 10. Shared Components (UI System)

- **`RemoteView.jsx` (`client`)**: Dual-mode stream renderer (WebRTC `<video>` or Relay `<canvas>`) with touch/mouse event listeners and RAF coalescing.
- **`TopToolbar.jsx` (`client`)**: Floating session control bar providing stream stats, quality selectors, clipboard sync, and disconnect button.
- **`MobileFAB.jsx` & `MobileQuickSettings.jsx` (`client`)**: Mobile-optimized quick action menus and settings drawers.
- **`Dashboard.jsx` (`frontend`)**: Admin dashboard homepage featuring live Recharts telemetry streams.
- **`StealthViewer.jsx` (`client` / `frontend`)**: Silent WebRTC stream viewer component.

---

## 11. Coding Conventions

- **File Naming**:
  - React components: `PascalCase.jsx` (`RemoteView.jsx`, `Dashboard.jsx`).
  - Modules & Utilities: `camelCase.js` (`adaptiveController.js`, `identity.js`).
  - Backend Routes & Models: `camelCase.js` (`agent.js`, `Device.js`).
- **Console Logging**:
  - Every console log MUST use bracketed functional prefixes: `[WS]`, `[Signaling]`, `[ABR]`, `[Stealth]`, `[DC]`, `[RTC]`, `[INPUT]`, `[Daemon]`.
- **Error Responses**:
  - REST endpoints must return standard JSON format: `{ "error": "Human readable message" }`.
- **Async Code**: Use `async/await` with explicit `try/catch` blocks.

---

## 12. Development Workflow

1. **Clone & Install Dependencies**:
   Run `npm install` inside each component directory:
   ```bash
   cd server && npm install
   cd ../client && npm install
   cd ../frontend && npm install
   cd ../agent && npm install
   ```
2. **Start Local Development Environment**:
   - Terminal 1 (Server): `cd server && npm run dev`
   - Terminal 2 (Client): `cd client && npm run dev`
   - Terminal 3 (Frontend): `cd frontend && npm run dev`
   - Terminal 4 (Agent Simulator or Desktop Agent): `node agent_simulator.js` or `cd agent && npm start`

---

## 13. Build Process

- **Web Client**: `cd client && npm run build` (Outputs optimized production bundle to `client/dist`).
- **Admin Dashboard**: `cd frontend && npm run build` (Outputs to `frontend/dist`).
- **Desktop Agent**: `cd agent && npm run build` (Uses `electron-builder` to package NSIS installers for Windows and DMG/ZIP for macOS into `agent/dist`).

---

## 14. Environment Variables

### Server (`server/.env`)
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/chameleon_admin
ADMIN_USERNAME=rithvik4774
ADMIN_PASSWORD=admin_password_secure_9988
JWT_SECRET=super_secret_jwt_key_12345
NODE_ENV=production
```

### Client (`client/.env`)
```env
VITE_SIGNALING_URL=https://chameleon-1.onrender.com
```

### Desktop Agent (`agent/.env`)
```env
SIGNALING_URL=https://chameleon-1.onrender.com
```

---

## 15. Common Commands

```bash
# Start backend in dev mode with hot reload
cd server && npm run dev

# Start web client dev server
cd client && npm run dev

# Start admin dashboard dev server
cd frontend && npm run dev

# Launch desktop agent in Electron
cd agent && npm start

# Run simulated devices (5 mock agents)
node agent_simulator.js

# Lint frontend codebase
cd frontend && npm run lint

# Package desktop agent installers
cd agent && npm run build
```

---

## 16. Potential Pitfalls & Lessons Learned

> [!CAUTION]
> **1. DO NOT Disable Electron Hardware Acceleration**
> Never call `app.disableHardwareAcceleration()` in `agent/src/main.js`. Doing so kills NVENC/QuickSync GPU video encoding and forces high-CPU software encoding.

> [!WARNING]
> **2. DO NOT Mutate React State inside Video Render Loops**
> High-frequency video frames or WebSockets relay frames must NEVER trigger React `setState`. React reconciliation adds 8–15 ms per frame. Frame rendering should occur in Web Workers or directly on GPU canvas elements.

> [!IMPORTANT]
> **3. Preserve DataChannel Ordering & Reliability Configurations**
> - Mouse movements MUST remain on `ordered: false, maxRetransmits: 0`.
> - Keystrokes MUST remain on `ordered: true`.
> Swapping these will result in either stuck keys or severe mouse input lag.

---

## 17. Best Practices

- **Minimal Modifications**: Keep changes scoped strictly to the problem at hand.
- **Log Synthesis**: Keep diagnostic logs clean and structured with functional tags.
- **Backward Compatibility**: Ensure API changes maintain backwards compatibility with existing desktop agent versions.
- **Verification**: Always run build and lint checks after modifying code.

---

## 18. Glossary of Key Modules

- **`RemoteView.jsx`**: Primary React component responsible for rendering video/canvas and capturing DOM input events.
- **`AdaptiveController.js`**: Client-side GCC congestion control algorithm that dynamically scales bitrate and resolution.
- **`frameWorker.js`**: Dedicated Web Worker handling ArrayBuffer JPEG frame decoding off the main UI thread.
- **`daemon.js`**: Electron background class managing persistent socket connections with exponential backoff.
- **`identity.js`**: Hardware fingerprinting module that generates immutable device IDs from Win32 WMI / OS attributes.
- **`agent_simulator.js`**: Standalone test harness simulating multiple desktop agents for stress testing.

---
*Created for Chameleon Engine Team. Update this document as the system evolves.*
