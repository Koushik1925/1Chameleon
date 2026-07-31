export const SITE_METADATA = {
    title: 'Chameleon - Ultra-Low Latency Secure Remote Desktop',
    description: 'Connect to any PC remotely with zero configuration, end-to-end WebRTC encryption, 60 FPS performance, and seamless QR device pairing.',
    siteUrl: 'https://chameleon-jet.vercel.app',
    ogImage: 'https://chameleon-jet.vercel.app/og-image.png',
    twitterHandle: '@chameleon_app'
};

export const FEATURES_DATA = [
    {
        id: 'ultra-low-latency',
        title: 'Ultra-Low Latency',
        description: 'Sub-30ms global streaming latency powered by WebRTC P2P direct socket channels and GCC adaptive bitrate control.',
        icon: 'Zap',
        status: 'Available',
        category: 'Performance'
    },
    {
        id: 'hd-screen-streaming',
        title: 'HD Screen Streaming',
        description: 'Crystal-clear 60 FPS 1080p and 4K desktop streaming with dynamic hardware-accelerated NVENC video pipeline.',
        icon: 'MonitorPlay',
        status: 'Available',
        category: 'Performance'
    },
    {
        id: 'secure-device-pairing',
        title: 'Secure Device Pairing',
        description: 'Instant pairing using 6-digit permanent device keys or mobile camera QR code scanning without exposing IP addresses.',
        icon: 'QrCode',
        status: 'Available',
        category: 'Security'
    },
    {
        id: 'end-to-end-encryption',
        title: 'End-to-End Encryption',
        description: 'DTLS 1.2 and SRTP AES-GCM 256-bit media encryption ensures your stream cannot be inspected by relay servers.',
        icon: 'Lock',
        status: 'Available',
        category: 'Security'
    },
    {
        id: 'clipboard-sync',
        title: 'Clipboard Sync',
        description: 'Seamless bidirectional real-time text and link clipboard synchronization between local and remote machines.',
        icon: 'ClipboardCopy',
        status: 'Available',
        category: 'Productivity'
    },
    {
        id: 'unattended-access',
        title: 'Unattended Access',
        description: 'Claim hosts to your authenticated profile once to initiate unattended remote sessions anytime without approval prompts.',
        icon: 'ShieldCheck',
        status: 'Available',
        category: 'Access'
    },
    {
        id: 'device-management',
        title: 'Device Management',
        description: 'Comprehensive host dashboard with real-time online heartbeat monitoring, device specs, and 1-click unclaim actions.',
        icon: 'Server',
        status: 'Available',
        category: 'Management'
    },
    {
        id: 'cross-platform',
        title: 'Cross Platform',
        description: 'Windows 10 & 11 host agent available now. Web client runs in any modern browser on desktop, tablet, or phone.',
        icon: 'Laptop',
        status: 'Available',
        category: 'Compatibility'
    },
    {
        id: 'file-transfer',
        title: 'File Transfer',
        description: 'High-speed drag-and-drop file transfer over WebRTC DataChannels with chunked binary protocol.',
        icon: 'FolderSync',
        status: 'Coming Soon',
        category: 'Productivity'
    },
    {
        id: 'multi-monitor',
        title: 'Multi Monitor',
        description: 'Switch seamlessly between multiple remote displays or stretch stream across virtual monitors.',
        icon: 'MonitorSmartphone',
        status: 'Coming Soon',
        category: 'Productivity'
    }
];

export const FAQS_DATA = [
    {
        question: 'What is Chameleon?',
        answer: 'Chameleon is a modern, high-performance remote desktop application designed for ultra-low latency remote access. It allows you to connect to and control host PCs securely from any web browser or mobile device without complex VPNs or open router ports.'
    },
    {
        question: 'Is Chameleon free to use?',
        answer: 'Yes! Chameleon is free for personal use. You can pair and manage your personal desktop hosts, stream in HD, and access unattended machines without any subscription fee.'
    },
    {
        question: 'How secure is Chameleon remote access?',
        answer: 'Chameleon employs industry-standard DTLS-SRTP end-to-end encryption for WebRTC media streams. Audio, video, and input events pass through encrypted peer-to-peer tunnels. The signaling server never stores or records your screen data.'
    },
    {
        question: 'Can I access my PC from anywhere in the world?',
        answer: 'Yes. As long as your host desktop is connected to the internet and has the Chameleon Desktop Agent running, you can access it securely from any location globally using your phone, tablet, or secondary computer.'
    },
    {
        question: 'Does Chameleon work behind firewalls and NAT?',
        answer: 'Absolutely. Chameleon utilizes STUN and TURN relay fallback servers to establish NAT traversal across strict corporate firewalls, router double-NATs, and cellular carrier networks.'
    },
    {
        question: 'Does Chameleon store my desktop screen or recording?',
        answer: 'No. Chameleon never records, saves, or analyzes your remote desktop screen. Media frames are streamed directly between peers in real time.'
    },
    {
        question: 'How do I pair a new desktop device?',
        answer: 'Download and launch the Chameleon Desktop Agent on your computer. Open the desktop app to reveal your 6-digit Pair Code or QR Code. On your mobile or web browser, log in to your account and enter the code or scan the QR image to link your host.'
    },
    {
        question: 'Can I uninstall the desktop agent anytime?',
        answer: 'Yes. You can cleanly uninstall Chameleon Desktop Agent using the Windows Settings Apps menu or by running the uninstaller setup wizard. You can also unclaim devices from your Web Dashboard at any time.'
    },
    {
        question: 'How do I report bugs or security vulnerabilities?',
        answer: 'You can report bugs, request features, or submit security disclosures directly via our Contact page or open an issue on our official GitHub repository.'
    },
    {
        question: 'How can I delete my account and associated data?',
        answer: 'Visit the Delete Account page under the Legal menu for detailed instructions on purging your account data, unlinking host IDs, and requesting immediate data deletion.'
    }
];

export const HELP_CATEGORIES = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: 'Rocket',
        articles: [
            { title: 'Chameleon Overview & Architecture', content: 'Chameleon uses peer-to-peer WebRTC connections supplemented by a Node.js signaling server to establish zero-config remote desktop links.' },
            { title: 'System Requirements & Prerequisites', content: 'Hosts require Windows 10/11 64-bit with 4GB RAM. Clients can use Google Chrome, Safari, Firefox, or Edge on desktop or mobile.' }
        ]
    },
    {
        id: 'installing',
        title: 'Installing Agent',
        icon: 'Download',
        articles: [
            { title: 'Installing Desktop Agent on Windows', content: 'Download Chameleon-Desktop-Agent-Setup-1.5.0.exe, double-click the setup wizard, select your installation folder, and click Finish to launch.' },
            { title: 'Configuring Windows Startup & Auto-Boot', content: 'Navigate to Settings inside the Desktop Agent and enable "Launch on System Startup" to automatically start the host service when Windows boots.' }
        ]
    },
    {
        id: 'pairing-devices',
        title: 'Pairing Devices',
        icon: 'QrCode',
        articles: [
            { title: 'Pairing via 6-Digit Permanent Code', content: 'Enter the 6-digit numeric pair code displayed on the desktop app screen into your Web Client under "Connect Device".' },
            { title: 'Claiming Host Devices to Your Account', content: 'Sign in on both the desktop agent and web client to automatically claim the desktop host to your My Devices dashboard.' }
        ]
    },
    {
        id: 'connecting',
        title: 'Connecting & Remote Control',
        icon: 'MonitorPlay',
        articles: [
            { title: 'Initiating Remote Desktop Sessions', content: 'Click "Connect" next to any online host in your My Devices list to launch the full-screen remote control viewer.' },
            { title: 'Keyboard & Mouse Remote Input Features', content: 'Chameleon supports full mouse tracking, right-clicks, scroll wheel events, and special key combinations including Alt+Tab and Ctrl+Alt+Del.' }
        ]
    },
    {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        icon: 'Wrench',
        articles: [
            { title: 'Resolving "Device Offline" Status', content: 'Ensure the host computer is powered on, connected to the internet, and that the Chameleon Desktop Agent process is running in the system tray.' },
            { title: 'Fixing Black Screen or Blank Video Stream', content: 'Verify that Hardware Acceleration is enabled in Desktop Agent settings. If using dual GPUs, set graphics preferences to high-performance GPU.' }
        ]
    },
    {
        id: 'performance',
        title: 'Performance & Optimization',
        icon: 'Zap',
        articles: [
            { title: 'Configuring 60 FPS & 120 FPS Target Frame Rates', content: 'Open Desktop Agent Settings and toggle the Frame Rate Target button between 30, 60, and 120 FPS based on your network bandwidth.' },
            { title: 'Enabling Hardware Acceleration (NVENC)', content: 'Ensure your NVIDIA or Intel GPU drivers are up to date to utilize hardware WebRTC H.264 encoding for minimum CPU overhead.' }
        ]
    },
    {
        id: 'network-firewall',
        title: 'Network & Firewall',
        icon: 'Shield',
        articles: [
            { title: 'Firewall Port Configuration Guide', content: 'Chameleon uses standard HTTPS port 443 for signaling and UDP ports 1024-65535 for WebRTC media channels. No incoming port forwarding required.' },
            { title: 'Corporate VPN & Proxy Compatibility', content: 'If connecting over strict corporate firewalls, WebRTC TURN fallback over TLS (Port 443) will automatically relay encrypted packets.' }
        ]
    },
    {
        id: 'security-acc',
        title: 'Security & Account',
        icon: 'Lock',
        articles: [
            { title: 'Managing Account Sessions & Security Tokens', content: 'View all active remote sessions and linked hardware IDs on your My Devices dashboard. Click "Disconnect PC" to revoke access instantly.' },
            { title: 'Unlinking Lost or Replaced Computers', content: 'If you replace your desktop, click "Unclaim Device" in My Devices to remove the hardware session token from your MongoDB account.' }
        ]
    }
];

export const CHANGELOG_RELEASES = [
    {
        version: 'v1.5.0',
        date: 'July 31, 2026',
        badge: 'Current Release',
        added: [
            'Commercial Dark Glassmorphism Desktop Agent UI redesign',
            'Interactive Windows NSIS Setup Wizard installer',
            'Persistent Settings storage with IPC auto-start & FPS controls',
            'Real-time WebRTC socket heartbeat device status polling'
        ],
        improved: [
            'Sub-30ms stream latency with GCC adaptive bitrate tuning',
            'Window control IPC handlers (minimize, maximize, custom titlebar)',
            'Auto claim-sync endpoint (/api/auth/device-info) for MongoDB'
        ],
        fixed: [
            'Fixed Windows app startup window presentation bug',
            'Resolved tray icon BMP/PNG loading fallback errors',
            'Fixed WebRTC socket session filter for real host IDs'
        ],
        knownIssues: [
            'macOS & Linux desktop host agents currently in active preview testing'
        ]
    },
    {
        version: 'v1.4.1',
        date: 'July 29, 2026',
        badge: 'Stable',
        added: [
            'My Devices dashboard with real-time host status badges',
            'Unclaim PC button with automatic device revoking',
            'Google OAuth 2.0 single sign-on integration'
        ],
        improved: [
            'WebRTC signaling keep-alive ping interval optimized to 5s'
        ],
        fixed: [
            'Fixed false offline status on claimed host devices page'
        ]
    },
    {
        version: 'v1.0.0',
        date: 'July 19, 2026',
        badge: 'Major Release',
        added: [
            'Initial public launch of Chameleon Remote Desktop',
            'QR code & 6-digit numeric device pairing system',
            'Real-time mouse, touch, and keyboard remote input controller'
        ],
        improved: [
            'WebRTC P2P direct socket architecture'
        ]
    }
];
