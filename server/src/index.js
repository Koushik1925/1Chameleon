require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const { createClient } = require('redis');

const app = express();
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: true,
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  xFrameOptions: { action: 'deny' },
  crossOriginOpenerPolicy: { policy: 'same-origin' }
}));
app.use(cors());
app.use(express.json());

// 1. Redis Setup & Rate Limiting
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: { reconnectStrategy: (retries) => Math.min(retries * 50, 2000) }
});

let redisLogOnce = false;
redisClient.on('error', (err) => {
  if (!redisLogOnce) {
    console.warn('[Redis] Connection Error (Rate limiting will use local memory fallback):', err.message);
    redisLogOnce = true;
  }
});
redisClient.connect().catch(() => {});

// Global Rate Limiter: 100 req/min/IP
const globalRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'global_limit',
  points: 100,
  duration: 60,
  insuranceLimiter: new RateLimiterMemory({
    points: 100,
    duration: 60,
  })
});

const rateLimitMiddleware = async (req, res, next) => {
  try {
    await globalRateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).set('Retry-After', Math.round(rejRes.msBeforeNext / 1000) || 1).json({
      success: false,
      error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' }
    });
  }
};

app.use(rateLimitMiddleware);

// Import API Routes
const devicesRoute = require('./routes/devices');

app.use('/devices', devicesRoute);

// Serve static directory for checkout.html
app.use(express.static(path.join(__dirname, 'public')));

// Keep-alive endpoint to prevent Render free-tier from sleeping (wipes session Map)
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all for MVP, restrict in prod
        methods: ['GET', 'POST']
    }
});

// In-memory store for transient sessions (Legacy/QR pairing)
// Structure: sessionId -> { agentSocketId, clientSocketId, createdAt, status }
const sessions = new Map();

// Persistent Devices System
// onlineDevices maps device_id -> socket.id
const onlineDevices = new Map();
// socketToDevice maps socket.id -> device_id
const socketToDevice = new Map();

const SESSION_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours for active session validity
const RECONNECT_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours to grab the same session back

const db = require('./db');

io.on('connection', (socket) => {
    console.log(`[INFO] New connection: ${socket.id}`);

    // Persistent Device Auth
    socket.on('agent:authenticate', async ({ device_id, refresh_token }) => {
        try {
            const hash = crypto.createHash('sha256').update(refresh_token).digest('hex');
            const res = await db.query('SELECT id FROM devices WHERE device_id = $1 AND refresh_token_hash = $2', [device_id, hash]);
            
            if (res.rows.length === 0) {
                return socket.emit('error', { message: 'Invalid credentials or revoked device' });
            }

            // Clean up any old socket for this device
            const oldSocketId = onlineDevices.get(device_id);
            if (oldSocketId && oldSocketId !== socket.id) {
                const oldSocket = io.sockets.sockets.get(oldSocketId);
                if (oldSocket) oldSocket.disconnect();
                socketToDevice.delete(oldSocketId);
            }

            onlineDevices.set(device_id, socket.id);
            socketToDevice.set(socket.id, device_id);

            // Update status in DB
            await db.query(`UPDATE devices SET status = 'online', last_seen = NOW() WHERE device_id = $1`, [device_id]);

            socket.emit('agent:authenticated', { success: true });
            console.log(`[INFO] Device Authenticated: ${device_id} on socket ${socket.id}`);
        } catch (e) {
            socket.emit('error', { message: 'Auth failed' });
        }
    });

    // 1. Agent requests a new pairing session (Legacy/QR flow)
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

        // Automatically expire pairing token after limit reaches (12 hours)
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
            // Pass seconds for UI expiration timers
            expiresIn: Math.floor(SESSION_EXPIRY_MS / 1000)
        });
        console.log(`[INFO] Session ${sessionId} created by agent ${socket.id}`);
    });

    // 2. Client joins using standard UI or scanned QR
    socket.on('client:join_session', ({ sessionId, device_id }) => {
        // If device_id is provided, it's a direct connection via persistent linking
        if (device_id) {
            const agentSocketId = onlineDevices.get(device_id);
            if (!agentSocketId) {
                return socket.emit('error', { message: 'Device is offline' });
            }
            
            // Create a virtual session id for this direct connection
            const sid = `direct_${device_id}_${Date.now()}`;
            sessions.set(sid, {
                agentSocketId,
                clientSocketId: socket.id,
                createdAt: Date.now(),
                status: 'connected',
                lastActivity: Date.now()
            });

            // Notify Agent
            io.to(agentSocketId).emit('agent:client_joined', { sessionId: sid });
            // Notify Client
            socket.emit('client:joined_success', { sessionId: sid });
            console.log(`[INFO] Client ${socket.id} joined direct session ${sid} to device ${device_id}`);
            return;
        }

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

    // 5. Cleanup on Disconnect
    socket.on('disconnect', async () => {
        console.log(`[INFO] Disconnected: ${socket.id}`);

        // Cleanup persistent device mapping
        const device_id = socketToDevice.get(socket.id);
        if (device_id) {
            onlineDevices.delete(device_id);
            socketToDevice.delete(socket.id);
            console.log(`[INFO] Persistent Device Offline: ${device_id}`);
            try {
                await db.query(`UPDATE devices SET status = 'offline', last_seen = NOW() WHERE device_id = $1`, [device_id]);
            } catch (e) {
                // ignore
            }
        }

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
