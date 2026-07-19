# 🦎 Chameleon

**Ultra-Low-Latency Remote Desktop Infrastructure**

Chameleon is a modern peer-to-peer remote desktop platform engineered for extremely low latency, responsive remote control, and secure browser-based access.

Built around WebRTC, hardware-accelerated streaming, adaptive bitrate control, and latency-bounded rendering pipelines.

No port forwarding.
No exposed IP addresses.
No complicated setup.

---

# 📄 Documentation

| Document | Description | Audience |
| -------- | ----------- | -------- |
| [📋 Product Requirements Document (PRD)](https://drive.google.com/file/d/1rNOIp2Oxk_wXR7iBIF1zpf0rqj5AO7No/view?usp=drive_link) | Product vision, user stories, functional & non-functional requirements, roadmap | Product, Engineering, Investors |
| [🔧 Technical Design Document (TDD)](https://drive.google.com/file/d/1-dx6894K1POnM05E_XqEYlUfchyejp1Q/view?usp=drive_link) | Low-level implementation details, data models, API specs, algorithms | Developers |
| [🏗️ System Architecture Document (SAD)](https://drive.google.com/file/d/1lqH7LnhKC9MvRffa8Ss8dd148-j0z0v8/view?usp=drive_link) | Infrastructure topology, deployment architecture, networking, scalability design | Infrastructure & Backend Teams |

---

# 🚀 Core Features

* Instant QR-based pairing
* Secure WebRTC peer-to-peer connections
* Hardware-accelerated H264 streaming
* Ultra-low-latency remote control
* Adaptive bitrate + dynamic quality scaling
* High-performance mouse + keyboard input pipeline
* Clipboard synchronization
* Real-time connection diagnostics
* Fullscreen pointer-lock mode
* Automatic congestion handling
* Relay fallback for restrictive networks

---

# ⚡ Architecture Philosophy

Chameleon is designed around one core principle:

> Responsiveness is more important than perfect delivery.

The system aggressively prioritizes:

1. Input responsiveness
2. Frame smoothness
3. Stable latency
4. Visual quality

This means:

* stale frames are dropped immediately
* queues are tightly bounded
* bitrate adapts dynamically
* mouse movement bypasses retransmission delays
* congestion is handled proactively

---

# 🔐 Security Architecture

Chameleon uses:

* WebRTC peer-to-peer transport
* DTLS + SRTP encryption
* Session-based negotiation
* Temporary pairing sessions
* TLS-secured signaling
* No persistent media storage
* Direct encrypted desktop streaming

The signaling server only coordinates session establishment.

Desktop video and input traffic are transmitted directly between peers whenever possible.

---

# 🖥️ Desktop Agent

The Chameleon Desktop Agent:

* Captures the desktop using hardware acceleration
* Streams via low-latency WebRTC
* Uses GPU H264 encoding (NVENC / QuickSync)
* Accepts remote mouse + keyboard input
* Supports relative mouse movement
* Displays secure QR pairing codes
* Runs from the system tray
* Maintains adaptive quality automatically

---

# 🌐 Web Client

The browser client includes:

* QR pairing
* Manual 6-digit code fallback
* Real-time latency / FPS / bitrate metrics
* Clipboard synchronization
* Fullscreen mode
* Pointer lock support
* Modifier key controls
* Dynamic quality adaptation
* Auto-hide toolbar
* Responsive mobile-compatible UI

No plugins required.

Works directly from modern browsers.

---

# ⚡ Low-Latency Optimizations

Chameleon implements multiple production-grade latency optimizations:

## Transport Layer

* WebRTC over UDP
* Dual DataChannels
* Unordered/unreliable mouse transport
* Ordered/reliable keyboard transport
* ICE restart handling
* Trickle ICE
* Candidate prefetching

## Video Pipeline

* Hardware H264 encoding
* SDP codec prioritization
* Adaptive bitrate control
* Framerate-priority degradation
* Frame deadline enforcement
* Stale frame dropping
* Worker-based decode pipeline

## Rendering Pipeline

* Off-main-thread frame decode
* `createImageBitmap()` acceleration
* Canvas-based rendering
* React rerender elimination
* GPU compositing
* Direct bitmap painting

## Input Pipeline

* requestAnimationFrame mouse coalescing
* Relative mouse movement
* Fire-and-forget input injection
* Pointer lock fullscreen mode

## Relay Optimization

* Relay FPS caps
* Relay backpressure protection
* TCP buffer monitoring
* Congestion-aware frame dropping

---

# 📊 Real-Time Metrics

Chameleon continuously monitors:

* Round-trip latency
* FPS
* Bitrate
* Packet loss
* Relay statistics
* Connection state
* Memory usage
* Uptime

Metrics are exposed through:

```txt
/metrics
```

---

# 🧠 Adaptive Streaming System

Chameleon includes a GCC-inspired adaptive bitrate controller with:

* EMA-smoothed bandwidth estimation
* Multi-rung quality ladder
* Congestion hysteresis
* Fast downgrade / slow recovery behavior

Quality ladder:

```txt
1080p60
1080p30
720p60
720p30
480p30
360p20
```

---

# 🛠️ Tech Stack

## Desktop Agent

* Electron
* WebRTC
* Hardware H264 encode
* Native OS input injection
* DXGI screen capture (Windows)
* GPU acceleration

## Web Client

* React
* WebRTC API
* Canvas rendering
* Web Workers
* Socket.IO signaling

## Signaling Server

* Node.js
* Socket.IO
* TLS-secured signaling
* Session coordination
* Relay telemetry

---

# 📦 Installation

## Desktop Agent

Download the installer:

```txt
https://chameleon-jet.vercel.app/
```

Supported:

* Windows 10 / 11
* macOS (Intel + Apple Silicon)

Run installer and launch Chameleon.

---

# 🌐 Web Client

Open:

```txt
https://chameleon-jet.vercel.app/
```

Then:

1. Scan the QR code
2. Or enter the 6-digit pairing code
3. Connect instantly

---

# 🔗 Connection Flow

```txt
Desktop Agent
    ↓
Secure Signaling
    ↓
WebRTC Negotiation
    ↓
Direct P2P Connection
    ↓
Encrypted Remote Control Session
```

If direct peer-to-peer fails:

* TURN relay fallback is used automatically.

---

# 📁 Project Structure

```txt
/agent
/client
/server
/docs
```

---

# 🧪 Performance Targets

Target metrics:

| Metric          | Target             |
| --------------- | ------------------ |
| Total latency   | 40–120ms           |
| Stream FPS      | 30–60 FPS          |
| Input latency   | Near-instant       |
| Relay stability | Congestion bounded |
| Frame policy    | Zero-queue         |

---

# 🔮 Roadmap

Planned features:

* Remote audio streaming
* File transfer
* Multi-monitor selection
* Linux desktop agent
* Session recording
* Persistent trusted devices
* Mobile client apps
* Enterprise device management
* TURN region routing
* Native DXGI → NVENC pipeline

---

# 🛡️ Usage & Legal

Chameleon is intended for:

* Personal remote access
* Remote administration
* Remote support
* Development environments
* Secure device management

Unauthorized access to systems without consent may violate local laws.

Users are responsible for complying with applicable regulations.

---

# 📄 License

MIT License

---

# 🤝 Contributing

Contributions are welcome.

For major changes:

1. Open an issue
2. Discuss proposed architecture changes
3. Submit a pull request

---

# 📧 Contact

For support or inquiries:

```txt
contact@yourdomain.com
```

---

# © 2026 Chameleon

Secure. Instant. Remote.
