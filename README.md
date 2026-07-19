# 🦎 Chameleon

**Ultra-Low-Latency P2P Remote Desktop Platform** · `v1.4.1`

[![Live](https://img.shields.io/badge/Live-Online-brightgreen?style=flat-square)](https://chameleon-jet.vercel.app/)
[![Version](https://img.shields.io/badge/Release-v1.4.1-blue?style=flat-square)](https://github.com/Rithvik-krishna/Chameleon/releases)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-lightgrey?style=flat-square)](#-download)

Chameleon is a modern peer-to-peer remote desktop platform engineered for sub-100ms glass-to-glass latency, instant QR-based pairing, and fully encrypted browser-native access — with no IP addresses, no port forwarding, and no account creation required.

> **Responsiveness is more important than perfect delivery.**

---

## 📄 Documentation

| Document | Description | Audience |
| -------- | ----------- | -------- |
| [📋 Product Requirements Document (PRD)](https://drive.google.com/file/d/1rNOIp2Oxk_wXR7iBIF1zpf0rqj5AO7No/view?usp=drive_link) | Product vision, user stories, functional & non-functional requirements, roadmap | Product, Engineering, Investors |
| [🔧 Technical Design Document (TDD)](https://drive.google.com/file/d/1-dx6894K1POnM05E_XqEYlUfchyejp1Q/view?usp=drive_link) | Low-level implementation details, data models, API specs, algorithms | Developers |
| [🏗️ System Architecture Document (SAD)](https://drive.google.com/file/d/1lqH7LnhKC9MvRffa8Ss8dd148-j0z0v8/view?usp=drive_link) | Infrastructure topology, deployment architecture, networking, scalability design | Infrastructure & Backend Teams |

---

## ⚡ Quick Start

**1. Download & install the Desktop Agent** (Windows)

```
https://chameleon-jet.vercel.app/#download
```

**2. Open the Web Client** in any browser

```
https://chameleon-jet.vercel.app/
```

**3. Scan the QR code** — or enter the 6-digit pairing code — and connect instantly.

---

## 🚀 Features

### 🖥️ Desktop Agent
- Hardware-accelerated screen capture (DXGI Desktop Duplication, Windows)
- GPU H.264 encoding via NVENC / Intel QuickSync (zero-copy, low-latency preset)
- Permanent hardware-derived 6-digit pairing code — same code on every restart
- QR code display for instant pairing
- Remote mouse & keyboard input injected at OS level (Win32 `SendInput`)
- Relative mouse movement (Pointer Lock)
- System tray operation (lightweight, silent background process)
- Heartbeat & telemetry streaming to admin dashboard
- Auto-update version check against signaling server
- ICE restart for seamless connection recovery

### 🌐 Web Client (Browser — No Install)
- QR scan pairing + manual 6-digit code fallback
- Real-time performance metrics: FPS, bitrate, latency, packet loss
- Off-main-thread rendering via Web Workers + `createImageBitmap()` + Canvas
- Fullscreen + Pointer Lock mode
- Dual WebRTC DataChannels:
  - **Mouse** → Unordered/Unreliable (fire-and-forget, zero lag)
  - **Keyboard/Clicks** → Ordered/Reliable (guaranteed delivery)
- Clipboard synchronization (host ↔ client)
- Relay fallback mode (Socket.IO frame relay when P2P unavailable)
- Mobile-responsive UI with gesture support, FAB, and quick settings panel
- Auto-hide toolbar during active sessions
- No plugins, no extensions — works natively in modern browsers

### 🛡️ Admin Dashboard
- **Device Registry** — all enrolled agents with hostname, OS, version, online status, last seen
- **Session Log** — live and historical sessions with timestamps, codes, and device links
- **Live Telemetry** — real-time CPU, RAM, disk, and uptime charts streamed from agents
- **WebRTC Metrics** — live FPS, bitrate, latency, and packet loss graphs per session
- **🕵️ Stealth Viewer** — silently observe any active remote session without notifying the host or client
- **Release Management** — publish new agent versions, promote to stable channel, deprecate old builds, track adoption per version
- **Event Logs** — full audit trail of connection, disconnection, and error events
- **Security** — JWT-authenticated admin access

---

## 🔗 Connection Flow

```
Desktop Agent
    │
    ├─ Connects to Signaling Server (Socket.IO / TLS)
    ├─ Emits session ID → Displays QR + 6-digit code
    │
Browser Client
    │
    ├─ Scans QR / enters code → Joins session
    ├─ SDP offer/answer exchange via signaling server
    ├─ ICE candidates exchanged
    │
    └─► Direct P2P WebRTC connection established
            │
            ├─ Video stream (SRTP / UDP)
            ├─ Mouse input (DataChannel / unordered)
            └─ Keyboard input (DataChannel / ordered)

If P2P fails → Relay fallback via Socket.IO (volatile frames)
```

---

## 🔐 Security

| Layer | Implementation |
|-------|---------------|
| Video transport | WebRTC SRTP over UDP |
| Signaling | TLS-secured Socket.IO |
| Encryption | DTLS + SRTP (end-to-end) |
| Session scope | Ephemeral — expires on disconnect |
| Media routing | Direct P2P — no cloud video relay |
| Admin access | JWT-authenticated |
| Data storage | No persistent media or screen data stored |

The signaling server only exchanges session metadata (SDP + ICE candidates). All video and input data travels directly between peers.

---

## 🧠 Adaptive Streaming

GCC-inspired adaptive bitrate controller:

- EMA-smoothed bandwidth estimation from WebRTC stats
- Reads RTT, packet loss, and available bandwidth every 1 second
- Congestion detected → instantly cuts bitrate by 50%
- Sustained degradation → steps down FPS
- Fast downgrade / slow recovery (hysteresis)
- Zero-queue frame policy: stale frames are dropped, never buffered

**Quality ladder:**
```
1080p @ 60fps
1080p @ 30fps
720p  @ 60fps
720p  @ 30fps
480p  @ 30fps
360p  @ 20fps
```

---

## 🧪 Performance Targets

| Metric | Target |
|--------|--------|
| Total glass-to-glass latency | 40 – 120 ms |
| Encode latency (NVENC) | 3 – 8 ms |
| Network (P2P UDP) | 10 – 40 ms |
| Decode (browser) | 5 – 10 ms |
| Render | 2 – 4 ms |
| Input round-trip | 5 – 15 ms |
| Stream FPS | 30 – 60 FPS |
| P2P success rate target | > 90% |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Agent | Electron, Node.js, WebRTC |
| Screen Capture | DXGI Desktop Duplication API (Windows) |
| Video Encoding | NVENC / Intel QuickSync — H.264 hardware |
| Web Client | React, Vite, TailwindCSS |
| Streaming | WebRTC (browser-native API) |
| Rendering | HTML Canvas, Web Workers, `createImageBitmap` |
| Input | WebRTC DataChannel (dual), Pointer Lock API |
| Signaling Server | Node.js, Express, Socket.IO |
| Database | MongoDB Atlas (Mongoose) |
| Admin Panel | React, Vite, TailwindCSS, Recharts |
| Auth | JWT (admin panel) |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |
| Real-time | Socket.IO (signaling + telemetry + relay) |

---

## 📁 Project Structure

```
/agent          Electron desktop agent (screen capture, encode, input injection)
/client         React web client (browser viewer, QR pairing, remote control)
/server         Node.js signaling server (Socket.IO, REST API, MongoDB)
/frontend       React admin dashboard (device mgmt, sessions, stealth viewer)
```

---

## 📦 Download

| Platform | Status | Download |
|----------|--------|----------|
| **Windows 10 / 11** (x64) | ✅ Available | [v1.4.1 Installer (~77 MB)](https://chameleon-jet.vercel.app/#download) |
| **macOS** (Intel & Apple Silicon) | 🚧 Coming Soon | — |
| **Linux** | 📋 Planned | — |

---

## 🔮 Roadmap

- [ ] Remote audio streaming
- [ ] File transfer over DataChannel
- [ ] Multi-monitor selection
- [ ] macOS desktop agent (ScreenCaptureKit)
- [ ] Linux desktop agent
- [ ] Session recording & replay
- [ ] Persistent trusted device pairing (skip QR after first pair)
- [ ] Native iOS / Android viewer apps
- [ ] Enterprise device management & MDM controls
- [ ] GeoDNS TURN routing (nearest relay server)
- [ ] Native DXGI → NVENC pipeline (bypass Electron overhead)

---

## 🛡️ Usage & Legal

Chameleon is intended for:

- Personal remote access to your own machines
- Remote IT administration and support
- Developer workstation access
- Secure enterprise device management

> Unauthorized access to systems without consent may violate local and international laws. Users are solely responsible for complying with applicable regulations.

---

## 🤝 Contributing

Contributions are welcome.

For major changes:
1. Open an issue to discuss the proposed change
2. Fork the repo and create a feature branch
3. Submit a pull request against `main`

---

## 📄 License

Proprietary — All Rights Reserved.

Copyright (c) 2026 Rithvik Krishna D K. No part of this software may be copied, modified, distributed, or used in any form without the express written permission of the copyright holder. See [LICENSE](LICENSE) for full terms.

---

## © 2026 Chameleon

**Secure. Instant. Remote.**
