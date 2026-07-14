const io = require('socket.io-client');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

// Simulated Device Pool
const devices = [
  {
    deviceId: 'DEV-9824X',
    hostname: 'DESKTOP-J48FA9',
    publicIp: '184.22.109.5',
    country: 'United States',
    region: 'California',
    osName: 'Windows 11 Pro',
    osVersion: '10.0.22631',
    agentVersion: '1.3.0', // Older version to trigger updates
    machineGuid: 'e1b2123c-fa92-4f8e-bd32-84f58c706d81',
    installationId: 'inst-9824X-01',
    fingerprintHash: 'hash-f8319ba7c83e29f',
    uptime: 1200,
    socket: null,
    activeSession: null
  },
  {
    deviceId: 'DEV-4720A',
    hostname: 'RITHVIK-LAPTOP',
    publicIp: '103.45.201.88',
    country: 'India',
    region: 'Karnataka',
    osName: 'Windows 11 Home',
    osVersion: '10.0.22621',
    agentVersion: '1.3.3',
    machineGuid: 'a381cf3f-d392-4b2a-bf39-923ca04ba18f',
    installationId: 'inst-4720A-02',
    fingerprintHash: 'hash-9ca3cfb28ee1a22',
    uptime: 5400,
    socket: null,
    activeSession: null
  },
  {
    deviceId: 'DEV-1129S',
    hostname: 'WIN-SERVER-2022',
    publicIp: '64.120.45.12',
    country: 'Germany',
    region: 'Bavaria',
    osName: 'Windows Server 2022 Datacenter',
    osVersion: '10.0.20348',
    agentVersion: '1.3.3',
    machineGuid: 'b112fc33-dfaa-403d-af7f-3820cbca998a',
    installationId: 'inst-1129S-03',
    fingerprintHash: 'hash-d830cb88ffea721',
    uptime: 86400,
    socket: null,
    activeSession: null
  },
  {
    deviceId: 'DEV-7762X',
    hostname: 'LAB-PC-01',
    publicIp: '198.51.100.4',
    country: 'Canada',
    region: 'Ontario',
    osName: 'Windows 10 Enterprise',
    osVersion: '10.0.19045',
    agentVersion: '1.2.1', // Deprecated version
    machineGuid: 'c90aa8b2-13a8-4221-a67b-12347fa6b78e',
    installationId: 'inst-7762X-04',
    fingerprintHash: 'hash-8a8b8c8d8e8f801',
    uptime: 200,
    socket: null,
    activeSession: null
  },
  {
    deviceId: 'DEV-5541P',
    hostname: 'DEVELOPER-WS',
    publicIp: '82.165.22.19',
    country: 'United Kingdom',
    region: 'London',
    osName: 'Windows 11 Pro',
    osVersion: '10.0.22631',
    agentVersion: '1.3.3',
    machineGuid: 'f87a554d-de2b-4fc1-a982-cb582683fc97',
    installationId: 'inst-5541P-05',
    fingerprintHash: 'hash-554f2683fc977e2',
    uptime: 300,
    socket: null,
    activeSession: null
  }
];

// Helper to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function startSimulator() {
  console.log('[Simulator] Starting Agent Simulator...');

  // Initialize and Register all devices
  for (const device of devices) {
    try {
      console.log(`[Simulator] Registering device ${device.hostname}...`);
      const response = await fetch(`${BASE_URL}/api/agent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: device.deviceId,
          hostname: device.hostname,
          publicIp: device.publicIp,
          country: device.country,
          region: device.region,
          osName: device.osName,
          osVersion: device.osVersion,
          agentVersion: device.agentVersion,
          machineGuid: device.machineGuid,
          installationId: device.installationId,
          fingerprintHash: device.fingerprintHash
        })
      });

      if (!response.ok) {
        const err = await response.json();
        console.error(`[Simulator] Failed to register ${device.hostname}: ${err.error} (${err.status})`);
        device.banned = true;
        continue;
      }

      const data = await response.json();
      console.log(`[Simulator] Device ${device.hostname} registered. Status: ${data.status}`);

      // Establish Socket connection
      device.socket = io(BASE_URL);
      device.socket.on('connect', () => {
        device.socket.emit('join:device', device.deviceId);
      });

      // Handle direct commands sent via Socket.IO
      device.socket.on('command', (cmd) => {
        handleIncomingCommand(device, cmd);
      });

      // Handle Admin Stealth Join simulation
      device.socket.on('admin:join', ({ sessionId, adminSocketId }) => {
        console.log(`[Simulator] Device ${device.hostname} received stealth admin join from socket ${adminSocketId}`);
        
        // Mock peer description handshake
        device.socket.emit('admin:signal:sdp', {
          sessionId,
          sdp: { type: 'offer', sdp: 'v=0\r\no=- 42 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE video\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\nc=IN IP4 127.0.0.1\r\n' },
          to: adminSocketId
        });
      });

      device.socket.on('admin:signal:sdp', ({ sdp, from }) => {
        console.log(`[Simulator] Device ${device.hostname} received admin SDP answer from socket ${from}`);
      });

      device.socket.on('admin:signal:ice', ({ candidate, from }) => {
        console.log(`[Simulator] Device ${device.hostname} received admin ICE candidate from socket ${from}`);
      });

    } catch (err) {
      console.error(`[Simulator] Error registering ${device.hostname}:`, err.message);
    }
  }

  // Uptime/Heartbeat loop (Runs every 5 seconds)
  setInterval(async () => {
    for (const device of devices) {
      if (device.banned || device.disconnected) continue;

      try {
        device.uptime += 5;

        // Generate realistic cpu, ram, disk stats
        const cpuUsage = Math.floor(10 + Math.random() * 45); // 10% - 55%
        const ramUsage = Math.floor(40 + Math.random() * 20); // 40% - 60%
        const diskUsage = 45; // static disk
        
        // Heartbeat API
        const response = await fetch(`${BASE_URL}/api/agent/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: device.deviceId,
            cpuUsage,
            ramUsage,
            diskUsage,
            agentUptime: device.uptime
          })
        });

        if (response.status === 403) {
          console.warn(`[Simulator] Device ${device.hostname} rejected by server (Banned/Suspended). Disconnecting simulator.`);
          device.banned = true;
          if (device.socket) device.socket.disconnect();
          continue;
        }

        const data = await response.json();
        
        // Handle pulled commands (if any)
        if (data.commands && data.commands.length > 0) {
          for (const cmd of data.commands) {
            handleIncomingCommand(device, cmd);
          }
        }

        // Emit real-time telemetry over socket
        if (device.socket && device.socket.connected) {
          device.socket.emit('telemetry:stream', {
            deviceId: device.deviceId,
            cpuUsage,
            ramUsage,
            diskUsage,
            agentUptime: device.uptime
          });
        }

      } catch (err) {
        console.error(`[Simulator] Heartbeat error for ${device.hostname}:`, err.message);
      }
    }
  }, 5000);

  // Session simulator loop (Runs every 15 seconds, randomly starts/stops sessions)
  setInterval(async () => {
    for (const device of devices) {
      if (device.banned || device.disconnected) continue;

      try {
        if (!device.activeSession && Math.random() < 0.25) {
          // Start a Session (25% chance if idle)
          const sessionId = Math.floor(100000 + Math.random() * 900000).toString();
          const sessionCode = Math.floor(100000 + Math.random() * 900000).toString();
          const clientLink = `https://chameleon-jet.vercel.app/?sess=${sessionId}`;

          console.log(`[Simulator] Device ${device.hostname} starting session ${sessionId}...`);
          
          const response = await fetch(`${BASE_URL}/api/agent/session/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              deviceId: device.deviceId,
              sessionCode,
              clientLink,
              connectionType: 'WebRTC Direct',
              resolution: '1920x1080',
              codec: 'H264'
            })
          });

          if (response.ok) {
            device.activeSession = {
              sessionId,
              fps: 60,
              bitrate: 4500,
              latency: 15,
              packetLoss: 0.1,
              startTime: Date.now()
            };
          }
        } else if (device.activeSession) {
          const sessionAgeSec = (Date.now() - device.activeSession.startTime) / 1000;
          
          // End session (30% chance if session has run for at least 30 seconds)
          if (sessionAgeSec > 30 && Math.random() < 0.3) {
            const sess = device.activeSession;
            console.log(`[Simulator] Device ${device.hostname} ending session ${sess.sessionId}...`);

            await fetch(`${BASE_URL}/api/agent/session/end`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: sess.sessionId,
                duration: Math.floor(sessionAgeSec),
                status: 'completed'
              })
            });

            device.activeSession = null;
          } else {
            // Fluctuating WebRTC stream stats
            const sess = device.activeSession;
            sess.fps = Math.floor(55 + Math.random() * 6); // 55 - 60 fps
            sess.bitrate = Math.floor(3800 + Math.random() * 1500); // 3800 - 5300 kbps
            sess.latency = Math.floor(12 + Math.random() * 15); // 12 - 27 ms
            sess.packetLoss = +(Math.random() * 0.4).toFixed(2); // 0.0% - 0.4%

            // Emit live WebRTC stats to Socket.IO
            if (device.socket && device.socket.connected) {
              device.socket.emit('session:metrics', {
                sessionId: sess.sessionId,
                fps: sess.fps,
                bitrate: sess.bitrate,
                latency: sess.latency,
                packetLoss: sess.packetLoss,
                resolution: '1920x1080'
              });
            }
          }
        }
      } catch (err) {
        console.error(`[Simulator] Session loop error for ${device.hostname}:`, err.message);
      }
    }
  }, 10000);

  // Version check loop (Runs every 30 seconds)
  setInterval(async () => {
    for (const device of devices) {
      if (device.banned || device.disconnected) continue;

      try {
        const response = await fetch(`${BASE_URL}/api/agent/version/check?version=${device.agentVersion}`);
        if (response.ok) {
          const data = await response.json();
          if (data.updateAvailable) {
            console.log(`[Simulator] Device ${device.hostname} detected pending update to v${data.version}!`);
            
            // Randomly adopt updates (10% chance per check)
            if (Math.random() < 0.1) {
              console.log(`[Simulator] Device ${device.hostname} performing mock update to v${data.version}...`);
              device.agentVersion = data.version;
              
              // Register again to update server
              await fetch(`${BASE_URL}/api/agent/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  deviceId: device.deviceId,
                  hostname: device.hostname,
                  publicIp: device.publicIp,
                  agentVersion: device.agentVersion,
                  osName: device.osName,
                  machineGuid: device.machineGuid,
                  installationId: device.installationId,
                  fingerprintHash: device.fingerprintHash
                })
              });
            }
          }
        }
      } catch (err) {
        console.error(`[Simulator] Version check error for ${device.hostname}:`, err.message);
      }
    }
  }, 30000);
}

// Handler for remote administrative actions
function handleIncomingCommand(device, cmd) {
  console.log(`[Simulator] Device ${device.hostname} received command:`, cmd);
  
  if (cmd.type === 'disconnect' || cmd.type === 'disconnect_session') {
    if (device.activeSession) {
      console.log(`[Simulator] Force closing session ${device.activeSession.sessionId} due to admin request.`);
      device.activeSession = null;
    }
    
    if (cmd.type === 'disconnect') {
      console.log(`[Simulator] Administrative disconnect: Stopping simulation for ${device.hostname}.`);
      device.disconnected = true;
      if (device.socket) device.socket.disconnect();
    }
  } else if (cmd.type === 'restart') {
    console.log(`[Simulator] Restart command received: Resetting agent uptime to 0.`);
    device.uptime = 0;
  }
}

// Wait for server to boot up, then start
setTimeout(startSimulator, 3000);
