# 🦎 Chameleon

**Secure. Instant. Remote.**

Chameleon is a low-latency, QR-based remote desktop solution that enables secure access to your desktop from anywhere using end-to-end encrypted peer-to-peer connections.

No IP addresses.  
No port forwarding.  
No complex setup.

---

## 🚀 Overview

Chameleon allows you to:

- Connect to your desktop instantly using a QR code
- Control your machine remotely from any modern browser
- Stream your screen with ultra-low latency
- Use full keyboard and mouse control
- Sync clipboard between devices
- Switch resolutions dynamically
- Monitor live connection quality

Built with performance and security as first principles.

---

## 🔐 Security Architecture

Chameleon uses:

- **WebRTC peer-to-peer connections**
- **DTLS + SRTP encryption**
- Secure signaling server (no media relayed)
- Session-based pairing with expiry
- Manual disconnect control

Your screen data is never stored on the server.

---

## ⚡ How It Works

1. Install the **Chameleon Desktop Agent** on your computer.
2. Open the Chameleon web client.
3. Scan the QR code shown on your desktop.
4. Secure WebRTC connection is established.
5. Start controlling instantly.

---

## 🖥️ Desktop Agent

The Desktop Agent:

- Captures your screen using hardware acceleration
- Streams via WebRTC
- Accepts remote keyboard and mouse input
- Displays a secure pairing QR code
- Runs in the background with a system tray icon

### Supported Platforms

- Windows 10 / 11
- macOS (Intel + Apple Silicon)

---

## 🌐 Web Client Features

- QR-based instant pairing
- 6-digit manual code fallback
- Live connection stats (latency, bitrate, FPS)
- Session timer
- Modifier key panel (Ctrl / Alt / Shift / Win)
- Clipboard sync
- Remote resolution switching
- Adaptive bitrate
- Fullscreen mode
- Auto-hide toolbar

---

## 📊 Connection Quality Monitoring

Chameleon provides real-time connection diagnostics:

- Round-trip latency (ms)
- Current FPS
- Bitrate (Mbps)
- Packet loss (%)

Optimized for minimal delay and stable streaming.

---

## 🎯 Performance Optimizations

Chameleon is engineered for low latency:

- Hardware-accelerated H264 encoding
- Adaptive bitrate streaming
- UDP-first WebRTC transport
- Minimal UI rendering overhead
- Optimized input event throttling
- Low-latency encoder presets

Priority order:

1. Stream smoothness
2. Input responsiveness
3. Stability
4. Visual polish

---

## 📦 Installation

### Desktop Agent

Download from the official homepage:

```
https://chameleon-jet.vercel.app/
```

Choose:
- Download for Windows
- Download for macOS

Run installer and launch Chameleon.

---

## 🔗 Web Client

Open:

```
https://chameleon-jet.vercel.app/
```

Scan QR code or enter 6-digit code to connect.

---

## 🛠️ Tech Stack

### Desktop Agent
- Native screen capture (DXGI / macOS equivalent)
- Hardware H264 encoding
- WebRTC
- DataChannel for input events

### Web Client
- React / Next.js
- WebRTC API
- WebSocket signaling
- Performance-optimized UI

### Signaling Server
- Node.js
- WebSocket
- TLS secured
- Session-based negotiation only

---

## 🧩 Project Structure

```
/desktop-agent
/web-client
/signaling-server
/docs
```

---

## 🔮 Roadmap

- File transfer support
- Remote audio streaming
- Multi-monitor selection
- Session recording
- Device authentication system
- Enterprise admin dashboard

---

## 🛡️ Legal & Usage

Chameleon is intended for:

- Personal remote access
- Remote support
- Development environments
- Administrative control of owned devices

Unauthorized access to devices without consent may violate local laws.

---

## 📄 License

MIT License (or specify your license here)

---

## 🤝 Contributing

Pull requests are welcome.

For major changes, open an issue first to discuss what you would like to change.

---

## 📧 Contact

For support or inquiries:

contact@yourdomain.com

---

© 2026 Chameleon. All rights reserved.
