const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Telemetry Counters (global, reset never — process-lifetime totals) ────────
const metrics = {
    relayFramesForwarded: 0,
    relayFramesDropped:   0,
    startTime:            Date.now(),
};

// ─── Keep-alive endpoint ───────────────────────────────────────────────────────
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// ─── /metrics Endpoint ────────────────────────────────────────────────────────
// Exposes production observability data. Designed to be scraped by Prometheus,
// Grafana, or a custom monitoring dashboard.
app.get('/metrics', (req, res) => {
    const activeSessions   = sessions.size;
    const connectedSessions = [...sessions.values()].filter(s => s.status === 'connected').length;
    const relaySessions     = [...sessions.values()].filter(s => s.isRelayMode).length;
    const uptimeSeconds     = Math.floor((Date.now() - metrics.startTime) / 1000);

    res.json({
        // Session health
        activeSessions,
        connectedSessions,
        relaySessions,
        onlineAgents: activeSessions,

        // Frame pipeline
        relayFramesForwarded:  metrics.relayFramesForwarded,
        relayFramesDropped:    metrics.relayFramesDropped,
        relayDropRate: metrics.relayFramesForwarded > 0
            ? ((metrics.relayFramesDropped / (metrics.relayFramesForwarded + metrics.relayFramesDropped)) * 100).toFixed(2) + '%'
            : '0%',

        // Process health
        uptimeSeconds,
        memoryUsageMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1),
        nodeVersion:   process.version,
        platform:      process.platform,
    });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    // Tight keepalive: detect dead connections in ~10 s instead of the 30 s default.
    // This ensures the agent's 'online' status reflects reality quickly.
    pingInterval: 5000,
    pingTimeout:  10000,
    connectTimeout: 15000
});

// ─── Session Store ────────────────────────────────────────────────────────────
const sessions = new Map();
const SESSION_EXPIRY_MS    = 12 * 60 * 60 * 1000;
const RECONNECT_WINDOW_MS  = 12 * 60 * 60 * 1000;

// ─── Relay Congestion Constants ───────────────────────────────────────────────
// If the socket's write buffer exceeds this threshold, the server is already
// struggling to deliver frames. Dropping new ones prevents a growing backlog
// that would cause slideshow behaviour.
const RELAY_BUFFER_LIMIT_BYTES = 512 * 1024; // 512 KB

// Per-session relay FPS cap. The server will not forward more than this many
// frames per second per session regardless of how fast the agent sends them.
const RELAY_MAX_FPS    = 60;
const RELAY_MIN_INTERVAL_MS = 1000 / RELAY_MAX_FPS; // ≈ 16.67 ms

// ─── Socket Handlers ──────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`[INFO] New connection: ${socket.id}`);

    // 1. Agent requests a new pairing session
    socket.on('agent:create_session', (data) => {
        let sessionId = data && data.sessionId;

        if (!sessionId) {
            do {
                sessionId = Math.floor(100000 + Math.random() * 900000).toString();
            } while (sessions.has(sessionId));
        }

        sessions.set(sessionId, {
            agentSocketId:    socket.id,
            clientSocketId:   null,
            createdAt:        Date.now(),
            status:           'pending_pairing',
            lastActivity:     Date.now(),
            lastRelayFrameAt: 0,   // For relay FPS cap
        });

        socket.emit('agent:session_created', { sessionId, expiresIn: 0 });
        console.log(`[INFO] Session ${sessionId} created by agent ${socket.id}`);
    });

    // 2. Client joins using standard UI or scanned QR
    socket.on('client:join_session', ({ sessionId }) => {
        const session = sessions.get(sessionId);

        if (!session) {
            return socket.emit('error', { message: 'Session not found or expired' });
        }

        if (session.status === 'connected') {
            // Kick old client so the new one can take over
            io.to(session.clientSocketId).emit('session:ended', { reason: 'Session connected from another tab or device' });
            console.log(`[INFO] Client ${socket.id} taking over session ${sessionId} from ${session.clientSocketId}`);
        } else if (session.status !== 'pending_pairing' && session.status !== 'detached') {
            return socket.emit('error', { message: 'Session unavailable' });
        }

        if (session.status === 'detached') {
            clearTimeout(session.reconnectTimer);
            console.log(`[INFO] Client ${socket.id} RECONNECTED to session ${sessionId}`);
        } else {
            console.log(`[INFO] Client ${socket.id} joined new session ${sessionId}`);
        }

        session.clientSocketId = socket.id;
        session.status         = 'connected';
        session.lastActivity   = Date.now();

        io.to(session.agentSocketId).emit('agent:client_joined', { sessionId });
        socket.emit('client:joined_success', { sessionId });
        console.log(`[INFO] Client ${socket.id} joined session ${sessionId}`);
    });

    // 3. WebRTC Signaling: Forward SDP
    socket.on('signal:sdp', ({ sessionId, sdp, to }) => {
        const session = sessions.get(sessionId);
        if (!session) return;
        session.lastActivity = Date.now();
        const targetSocketId = to === 'agent' ? session.agentSocketId : session.clientSocketId;
        if (targetSocketId) io.to(targetSocketId).emit('signal:sdp', { sdp, from: socket.id });
    });

    // 4. WebRTC Signaling: Forward ICE Candidates
    socket.on('signal:ice', ({ sessionId, candidate, to }) => {
        const session = sessions.get(sessionId);
        if (!session) return;
        session.lastActivity = Date.now();
        const targetSocketId = to === 'agent' ? session.agentSocketId : session.clientSocketId;
        if (targetSocketId) io.to(targetSocketId).emit('signal:ice', { candidate, from: socket.id });
    });

    // ── Cloud Relay Fallback ──────────────────────────────────────────────────
    socket.on('client:request_relay', ({ sessionId }) => {
        const session = sessions.get(sessionId);
        if (session && session.agentSocketId) {
            session.isRelayMode = true;
            io.to(session.agentSocketId).emit('agent:start_relay', { sessionId });
        }
    });

    socket.on('relay:frame', ({ sessionId, frame }, ackCallback) => {
        const session = sessions.get(sessionId);

        // Always ACK the agent immediately so its backpressure guard releases.
        // We decide AFTER the ACK whether to actually forward the frame.
        if (typeof ackCallback === 'function') ackCallback();

        if (!session || !session.clientSocketId) {
            metrics.relayFramesDropped++;
            return;
        }

        const now = Date.now();

        // ── RELAY FPS CAP ─────────────────────────────────────────────────────
        // If the agent sends faster than RELAY_MAX_FPS, silently drop the excess.
        // "Latest frame always wins" — no queuing, no catch-up.
        if (now - session.lastRelayFrameAt < RELAY_MIN_INTERVAL_MS) {
            metrics.relayFramesDropped++;
            return;
        }

        // ── BACKPRESSURE PROTECTION ───────────────────────────────────────────
        // Inspect the Socket.IO write buffer depth of the client socket.
        // If it's already backed up with > 512 KB, the client's TCP link is
        // saturated. Sending more frames would just grow the queue, causing
        // the slideshow effect on the client side.
        const clientSocket = io.sockets.sockets.get(session.clientSocketId);
        if (!clientSocket) {
            metrics.relayFramesDropped++;
            return;
        }

        // socket.conn.transport.socket is the underlying utp/tcp socket.
        // bufferSize is the Node.js write buffer in bytes.
        const writeBuffer = clientSocket.conn?.transport?.socket?.bufferSize ?? 0;
        if (writeBuffer > RELAY_BUFFER_LIMIT_BYTES) {
            console.warn(`[RELAY] Backpressure: dropping frame for session ${sessionId} (buffer=${writeBuffer} bytes)`);
            metrics.relayFramesDropped++;
            return;
        }

        // Forward the frame. volatile ensures Socket.IO drops it at the transport
        // level too if the underlying TCP buffer is already full — belt-and-suspenders.
        session.lastRelayFrameAt = now;
        metrics.relayFramesForwarded++;
        io.to(session.clientSocketId).volatile.emit('relay:frame', frame);
    });

    socket.on('relay:input', ({ sessionId, input }) => {
        const session = sessions.get(sessionId);
        if (session && session.agentSocketId) {
            io.to(session.agentSocketId).emit('relay:input', input);
        }
    });

    // Agent telemetry relay → client dashboard
    socket.on('agent:stats', ({ sessionId, stats }) => {
        const session = sessions.get(sessionId);
        if (session && session.clientSocketId) {
            // volatile: non-critical, drop if the client socket is backed up
            io.to(session.clientSocketId).volatile.emit('agent:stats', stats);
        }
    });

    // 5. Cleanup on Disconnect
    socket.on('disconnect', () => {
        console.log(`[INFO] Disconnected: ${socket.id}`);

        for (const [sessionId, session] of sessions.entries()) {
            if (session.agentSocketId === socket.id) {
                if (session.clientSocketId) {
                    io.to(session.clientSocketId).emit('session:ended', { reason: 'Host agent disconnected' });
                }
                sessions.delete(sessionId);
                console.log(`[INFO] Session ${sessionId} deleted because Agent disconnected.`);
            } else if (session.clientSocketId === socket.id) {
                io.to(session.agentSocketId).emit('session:ended', { reason: 'Client disconnected (Waiting for reconnect)' });

                session.status         = 'detached';
                session.clientSocketId = null;

                session.reconnectTimer = setTimeout(() => {
                    if (sessions.has(sessionId) && sessions.get(sessionId).status === 'detached') {
                        io.to(session.agentSocketId).emit('session:ended', { reason: 'Reconnect window expired' });
                        sessions.delete(sessionId);
                        console.log(`[INFO] Session ${sessionId} hard deleted after reconnect window.`);
                    }
                }, RECONNECT_WINDOW_MS);

                console.log(`[INFO] Session ${sessionId} detached. Reconnect window started.`);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Signaling server listening on port ${PORT}`);
});
