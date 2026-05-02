const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Keep-alive endpoint to prevent Render free-tier from sleeping (wipes session Map)
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
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
    pingTimeout: 10000,
    // Limit reconnect attempts to prevent thundering-herd on server restart
    connectTimeout: 15000
});

// In-memory store for sessions
// Structure: sessionId -> { agentSocketId, clientSocketId, createdAt, status }
const sessions = new Map();

const SESSION_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours for active session validity
const RECONNECT_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours to grab the same session back

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
            agentSocketId: socket.id,
            clientSocketId: null,
            createdAt: Date.now(),
            status: 'pending_pairing',
            lastActivity: Date.now()
        });

        // Send the pairing payload back to agent (to turn into QR)
        socket.emit('agent:session_created', {
            sessionId,
            // 0 means permanent
            expiresIn: 0
        });
        console.log(`[INFO] Session ${sessionId} created by agent ${socket.id}`);
    });

    // 2. Client joins using standard UI or scanned QR
    socket.on('client:join_session', ({ sessionId }) => {
        const session = sessions.get(sessionId);

        if (!session) {
            return socket.emit('error', { message: 'Session not found or expired' });
        }

        if (session.status === 'connected') {
            // Kick the old client so the new one can take over (fixes "Session already in use" lockouts on disconnects/refreshes)
            io.to(session.clientSocketId).emit('session:ended', { reason: 'Session connected from another tab or device' });
            console.log(`[INFO] Client ${socket.id} taking over session ${sessionId} from ${session.clientSocketId}`);
        } else if (session.status !== 'pending_pairing' && session.status !== 'detached') {
            return socket.emit('error', { message: 'Session unavailable' });
        }

        // Handle Reconnect Logic
        if (session.status === 'detached') {
            clearTimeout(session.reconnectTimer);
            console.log(`[INFO] Client ${socket.id} RECONNECTED to session ${sessionId}`);
        } else {
            console.log(`[INFO] Client ${socket.id} joined new session ${sessionId}`);
        }

        // Pair client
        session.clientSocketId = socket.id;
        session.status = 'connected';
        session.lastActivity = Date.now();

        // Notify Agent
        io.to(session.agentSocketId).emit('agent:client_joined', { sessionId });
        // Notify Client
        socket.emit('client:joined_success', { sessionId });

        console.log(`[INFO] Client ${socket.id} joined session ${sessionId}`);
    });

    // 3. WebRTC Signaling: Forward SDP Offers/Answers
    socket.on('signal:sdp', ({ sessionId, sdp, to }) => {
        const session = sessions.get(sessionId);
        if (!session) return;
        session.lastActivity = Date.now();

        const targetSocketId = to === 'agent' ? session.agentSocketId : session.clientSocketId;
        if (targetSocketId) {
            io.to(targetSocketId).emit('signal:sdp', { sdp, from: socket.id });
        }
    });

    // 4. WebRTC Signaling: Forward ICE Candidates
    socket.on('signal:ice', ({ sessionId, candidate, to }) => {
        const session = sessions.get(sessionId);
        if (!session) return;
        session.lastActivity = Date.now();

        const targetSocketId = to === 'agent' ? session.agentSocketId : session.clientSocketId;
        if (targetSocketId) {
            io.to(targetSocketId).emit('signal:ice', { candidate, from: socket.id });
        }
    });

    // Handlers for Ultimate Cloud Relay Fallback
    socket.on('client:request_relay', ({ sessionId }) => {
        const session = sessions.get(sessionId);
        if (session && session.agentSocketId) {
            session.isRelayMode = true;
            io.to(session.agentSocketId).emit('agent:start_relay', { sessionId });
        }
    });

    socket.on('relay:frame', ({ sessionId, frame }, ackCallback) => {
        const session = sessions.get(sessionId);
        if (session && session.clientSocketId) {
            // Use volatile.emit to ensure frames are DROPPED instead of queued if client network is choked
            io.to(session.clientSocketId).volatile.emit('relay:frame', frame);
        }
        // Immediately acknowledge so the agent knows the server accepted the frame
        if (typeof ackCallback === 'function') {
            ackCallback();
        }
    });

    socket.on('relay:input', ({ sessionId, input }) => {
        const session = sessions.get(sessionId);
        if (session && session.agentSocketId) {
            io.to(session.agentSocketId).emit('relay:input', input);
        }
    });

    // Agent broadcasts its live telemetry (RTT, FPS, bitrate, packetLoss)
    // Server relays it to the connected client so the TopToolbar can display it
    socket.on('agent:stats', ({ sessionId, stats }) => {
        const session = sessions.get(sessionId);
        if (session && session.clientSocketId) {
            // volatile: drop stats frames if the client socket is backed up.
            // Stats are non-critical; we never want them to slow down video.
            io.to(session.clientSocketId).volatile.emit('agent:stats', stats);
        }
    });

    // 5. Cleanup on Disconnect
    socket.on('disconnect', () => {
        console.log(`[INFO] Disconnected: ${socket.id}`);

        for (const [sessionId, session] of sessions.entries()) {
            // If Agent disconnects, kill the whole session immediately. Host is gone.
            if (session.agentSocketId === socket.id) {
                if (session.clientSocketId) {
                    io.to(session.clientSocketId).emit('session:ended', { reason: 'Host agent disconnected' });
                }
                sessions.delete(sessionId);
                console.log(`[INFO] Session ${sessionId} deleted because Agent disconnected.`);
            }
            // If Client disconnects, keep session alive in 'detached' state for 10 mins
            else if (session.clientSocketId === socket.id) {
                // Let the agent know the client dropped temporarily
                io.to(session.agentSocketId).emit('session:ended', { reason: 'Client disconnected (Waiting for reconnect)' });

                // Allow another client (or same one) to rejoin this exact sessionId
                session.status = 'detached';
                session.clientSocketId = null;

                session.reconnectTimer = setTimeout(() => {
                    if (sessions.has(sessionId) && sessions.get(sessionId).status === 'detached') {
                        io.to(session.agentSocketId).emit('session:ended', { reason: 'Reconnect window expired' });
                        sessions.delete(sessionId);
                        console.log(`[INFO] Session ${sessionId} hard deleted after 12-hour reconnect window.`);
                    }
                }, RECONNECT_WINDOW_MS);

                console.log(`[INFO] Session ${sessionId} detached. 12-hour reconnect window started.`);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Signaling server listening on port ${PORT}`);
});
