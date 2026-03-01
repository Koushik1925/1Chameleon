const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all for MVP, restrict in prod
        methods: ['GET', 'POST']
    }
});

// In-memory store for sessions
// Structure: sessionId -> { agentSocketId, clientSocketId, createdAt, status }
const sessions = new Map();

const SESSION_EXPIRY_MS = 60 * 1000; // 60 seconds for pairing
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes idle timeout

io.on('connection', (socket) => {
    console.log(`[INFO] New connection: ${socket.id}`);

    // 1. Agent requests a new pairing session
    socket.on('agent:create_session', () => {
        let sessionId;
        do {
            sessionId = Math.floor(100000 + Math.random() * 900000).toString();
        } while (sessions.has(sessionId));

        sessions.set(sessionId, {
            agentSocketId: socket.id,
            clientSocketId: null,
            createdAt: Date.now(),
            status: 'pending_pairing',
            lastActivity: Date.now()
        });

        // Automatically expire pairing token after 60 seconds
        setTimeout(() => {
            const session = sessions.get(sessionId);
            if (session && session.status === 'pending_pairing') {
                sessions.delete(sessionId);
                io.to(session.agentSocketId).emit('session:expired', { sessionId });
                console.log(`[INFO] Session ${sessionId} expired pending pairing.`);
            }
        }, SESSION_EXPIRY_MS);

        // Send the pairing payload back to agent (to turn into QR)
        socket.emit('agent:session_created', {
            sessionId,
            expiresIn: Math.floor(SESSION_EXPIRY_MS / 1000)
        });
        console.log(`[INFO] Session ${sessionId} created by agent ${socket.id}`);
    });

    // 2. Client joins using standard UI or scanned QR
    socket.on('client:join_session', ({ sessionId }) => {
        const session = sessions.get(sessionId);

        if (!session) {
            return socket.emit('error', { message: 'Session not found or expired' });
        }

        if (session.status !== 'pending_pairing') {
            return socket.emit('error', { message: 'Session already in use' });
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

    // 5. Cleanup on Disconnect
    socket.on('disconnect', () => {
        console.log(`[INFO] Disconnected: ${socket.id}`);

        // Find any session this socket was part of
        for (const [sessionId, session] of sessions.entries()) {
            if (session.agentSocketId === socket.id || session.clientSocketId === socket.id) {
                // Notify the other party
                const otherSocketId = session.agentSocketId === socket.id ? session.clientSocketId : session.agentSocketId;
                if (otherSocketId) {
                    io.to(otherSocketId).emit('session:ended', { reason: 'Peer disconnected' });
                }
                sessions.delete(sessionId);
                console.log(`[INFO] Session ${sessionId} deleted due to disconnect`);
            }
        }
    });
});

// Periodic cleanup of idle sessions
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (session.status === 'connected' && (now - session.lastActivity > IDLE_TIMEOUT_MS)) {
            if (session.agentSocketId) io.to(session.agentSocketId).emit('session:ended', { reason: 'Idle timeout' });
            if (session.clientSocketId) io.to(session.clientSocketId).emit('session:ended', { reason: 'Idle timeout' });
            sessions.delete(sessionId);
            console.log(`[INFO] Session ${sessionId} expired due to idle timeout`);
        }
    }
}, 60000); // Check every minute

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Signaling server listening on port ${PORT}`);
});
