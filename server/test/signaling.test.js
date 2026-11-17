'use strict';

/**
 * Regression tests for the WebRTC signaling server (server/src/index.js).
 *
 * They spawn the REAL server as a child process on a free port with a bogus MongoDB URI (so no
 * database is ever touched) and drive it with real socket.io clients acting as the desktop agent
 * and the web viewer.
 *
 * Run: npm test
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const { io } = require('socket.io-client');

const { buildIceServers, isTurnConfigured, describeTurnConfig, createTurnProvider, DEFAULT_STUN_URLS } = require('../src/services/iceServers');
const http = require('node:http');

const SERVER_DIR = path.join(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function startServer(env = {}) {
  const port = await freePort();
  const logs = [];
  const child = spawn(process.execPath, ['src/index.js'], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      JWT_SECRET: 'test',
      // Bogus on purpose: tests must never reach a real database.
      MONGODB_URI: 'mongodb://127.0.0.1:1/signaling-test?serverSelectionTimeoutMS=200',
      // Blank (not unset) so a developer's local server/.env cannot leak into the test.
      TURN_URLS: '', TURN_USERNAME: '', TURN_CREDENTIAL: '', TURN_SECRET: '',
      AGENT_RECONNECT_GRACE_MS: '400',
      CLIENT_RECONNECT_GRACE_MS: '400',
      SESSION_SWEEP_INTERVAL_MS: '200',
      COLD_START_GRACE_MS: '0',
      SIGNALING_LOG_LEVEL: 'debug',
      LOG_FULL_SESSION_IDS: '',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const onData = (b) => String(b).split('\n').forEach((l) => l.trim() && logs.push(l));
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  const t0 = Date.now();
  while (!logs.some((l) => l.includes('Listening on port'))) {
    if (Date.now() - t0 > 20000) throw new Error('server did not start:\n' + logs.join('\n'));
    await sleep(50);
  }
  return {
    url: `http://127.0.0.1:${port}`,
    logs,
    stop: () => new Promise((resolve) => { child.once('exit', resolve); child.kill(); setTimeout(resolve, 2000); }),
  };
}

const sockets = new Set();
function connect(url) {
  const s = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  sockets.add(s);
  return new Promise((resolve, reject) => {
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

function record(socket, events) {
  const log = [];
  for (const e of events) socket.on(e, (d) => log.push({ event: e, data: d }));
  socket.log = log;
  return log;
}
const count = (socket, event) => socket.log.filter((l) => l.event === event).length;

function waitEvent(socket, event, ms = 2500) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for "${event}"`)), ms);
    socket.once(event, (d) => { clearTimeout(t); resolve(d); });
  });
}

// Resolves with the nth (default first) recorded occurrence of an event, whether it arrived already or later.
async function waitLogged(socket, event, { nth = 0, ms = 2500 } = {}) {
  const t0 = Date.now();
  for (;;) {
    const hits = socket.log.filter((l) => l.event === event);
    if (hits.length > nth) return hits[nth].data;
    if (Date.now() - t0 > ms) throw new Error(`timeout waiting for logged "${event}" #${nth + 1}`);
    await sleep(15);
  }
}

const AGENT_EVENTS = ['agent:session_created', 'agent:client_joined', 'session:ended', 'signal:sdp', 'signal:ice', 'signal:undeliverable'];
const VIEWER_EVENTS = ['client:joined_success', 'session:ended', 'session:host_offline', 'session:host_reconnected', 'signal:sdp', 'signal:ice', 'signal:undeliverable', 'error'];

async function makeAgent(url, sessionId) {
  const agent = await connect(url);
  record(agent, AGENT_EVENTS);
  const created = waitEvent(agent, 'agent:session_created');
  agent.emit('agent:create_session', { sessionId, deviceId: 'DEV-TEST-' + sessionId });
  await created;
  return agent;
}

async function makeViewer(url, sessionId, extra = {}) {
  const viewer = await connect(url);
  record(viewer, VIEWER_EVENTS);
  const joined = waitEvent(viewer, 'client:joined_success');
  viewer.emit('client:join_session', { sessionId, ...extra });
  viewer.joined = await joined;
  return viewer;
}

after(() => { for (const s of sockets) s.disconnect(); });

// ───────────────────────────────────────────────────────────────────────────────────────────────
describe('ICE server configuration', () => {
  test('defaults contain only reachable STUN servers (no dead openrelay TURN, no stun*:443)', () => {
    const servers = buildIceServers({});
    const urls = servers.flatMap((s) => [].concat(s.urls));
    assert.deepEqual(urls, DEFAULT_STUN_URLS);
    assert.ok(urls.every((u) => u.startsWith('stun:')));
    assert.ok(!urls.some((u) => /openrelay|metered|:443$/.test(u)));
    assert.equal(isTurnConfigured({}), false);
  });

  test('TURN is fallback-only: a configured TURN server is NOT in the default list, only when a relay is requested', () => {
    const env = { TURN_URLS: 'turn:t.example.com:3478', TURN_USERNAME: 'u', TURN_CREDENTIAL: 'p' };
    const direct = buildIceServers(env);
    assert.deepEqual(direct.flatMap((s) => [].concat(s.urls)), DEFAULT_STUN_URLS, 'default = plain STUN, exactly the TURN-free behaviour');
    assert.deepEqual(buildIceServers(env, Date.now(), { relay: false }), direct);
    const relayed = buildIceServers(env, Date.now(), { relay: true });
    assert.equal(relayed.length, direct.length + 1);
    assert.deepEqual(relayed.slice(0, direct.length), direct, 'STUN entries still come first');
  });

  test('requesting a relay with nothing configured is harmless: same plain STUN list', () => {
    assert.deepEqual(buildIceServers({}, Date.now(), { relay: true }), buildIceServers({}));
  });

  test('static TURN credentials from the environment are appended when a relay is requested', () => {
    const env = { TURN_URLS: 'turn:t.example.com:3478, turns:t.example.com:5349?transport=tcp', TURN_USERNAME: 'u', TURN_CREDENTIAL: 'p' };
    const servers = buildIceServers(env, Date.now(), { relay: true });
    const turn = servers[servers.length - 1];
    assert.deepEqual(turn.urls, ['turn:t.example.com:3478', 'turns:t.example.com:5349?transport=tcp']);
    assert.equal(turn.username, 'u');
    assert.equal(turn.credential, 'p');
    assert.equal(isTurnConfigured(env), true);
  });

  test('TURN_SECRET derives short-lived coturn REST credentials', () => {
    const crypto = require('node:crypto');
    const now = Date.UTC(2026, 0, 1);
    const servers = buildIceServers({ TURN_URLS: 'turn:t.example.com:3478', TURN_SECRET: 's3cret', TURN_TTL_SECONDS: '600' }, now, { relay: true });
    const turn = servers[servers.length - 1];
    assert.equal(turn.username, `${Math.floor(now / 1000) + 600}:chameleon`);
    assert.equal(turn.credential, crypto.createHmac('sha1', 's3cret').update(turn.username).digest('base64'));
  });

  test('derived relay credentials live 24h by default (a relayed session ends when its credential expires)', () => {
    const now = Date.UTC(2026, 0, 1);
    const turn = buildIceServers({ TURN_URLS: 'turn:t.example.com:3478', TURN_SECRET: 's3cret' }, now, { relay: true }).pop();
    assert.equal(turn.username, `${Math.floor(now / 1000) + 86400}:chameleon`);
  });

  test('TURN_URLS without credentials is treated as not configured (never hands out a broken entry)', () => {
    const env = { TURN_URLS: 'turn:t.example.com:3478' };
    assert.equal(isTurnConfigured(env), false);
    assert.equal(buildIceServers(env, Date.now(), { relay: true }).length, DEFAULT_STUN_URLS.length);
  });

  describe('relay transports: UDP + TCP + TLS(443) for restrictive networks', () => {
    const creds = { TURN_USERNAME: 'u', TURN_CREDENTIAL: 'p' };

    test('TURN_HOST alone generates the full set: UDP 3478, TCP 3478 and TLS on 443', () => {
      const env = { TURN_HOST: 'turn.example.com', ...creds };
      const turn = buildIceServers(env, Date.now(), { relay: true }).pop();
      assert.deepEqual(turn.urls, [
        'turn:turn.example.com:3478?transport=udp',
        'turn:turn.example.com:3478?transport=tcp',
        'turns:turn.example.com:443?transport=tcp',
      ]);
      assert.deepEqual(describeTurnConfig(env), { configured: true, transports: ['udp', 'tcp', 'tls'], warnings: [] });
    });

    test('TURN_PORT / TURNS_PORT override the defaults; garbage ports fall back to them', () => {
      const a = buildIceServers({ TURN_HOST: 'h', TURN_PORT: '80', TURNS_PORT: '5349', ...creds }, Date.now(), { relay: true }).pop().urls;
      assert.deepEqual(a, ['turn:h:80?transport=udp', 'turn:h:80?transport=tcp', 'turns:h:5349?transport=tcp']);
      const b = buildIceServers({ TURN_HOST: 'h', TURN_PORT: 'abc', TURNS_PORT: '99999', ...creds }, Date.now(), { relay: true }).pop().urls;
      assert.deepEqual(b, ['turn:h:3478?transport=udp', 'turn:h:3478?transport=tcp', 'turns:h:443?transport=tcp']);
    });

    test('an explicit TURN_URLS list takes precedence over TURN_HOST', () => {
      const env = { TURN_HOST: 'ignored.example.com', TURN_URLS: 'turns:real.example.com:443?transport=tcp', ...creds };
      assert.deepEqual(buildIceServers(env, Date.now(), { relay: true }).pop().urls, ['turns:real.example.com:443?transport=tcp']);
    });

    test('entries that are not turn:/turns: URLs are dropped (a typo never reaches the browsers) and reported', () => {
      const env = { TURN_URLS: 'turn:ok.example.com:3478, https://oops.example.com, stun:not-a-relay:3478, turns:ok.example.com:443?transport=tcp', ...creds };
      assert.deepEqual(buildIceServers(env, Date.now(), { relay: true }).pop().urls, ['turn:ok.example.com:3478', 'turns:ok.example.com:443?transport=tcp']);
      assert.match(describeTurnConfig(env).warnings.join(' '), /2 TURN entries were ignored/);
    });

    test('the operator is warned when the relay set cannot help UDP-blocked or firewalled networks', () => {
      const udpOnly = describeTurnConfig({ TURN_URLS: 'turn:t.example.com:3478', ...creds });
      assert.deepEqual(udpOnly.transports, ['udp']);
      assert.match(udpOnly.warnings.join(' '), /No TCP or TLS relay URL/);
      assert.match(udpOnly.warnings.join(' '), /No TLS \(turns:\) URL/);

      const noTls = describeTurnConfig({ TURN_URLS: 'turn:t.example.com:3478,turn:t.example.com:3478?transport=tcp', ...creds });
      assert.deepEqual(noTls.transports, ['udp', 'tcp']);
      assert.doesNotMatch(noTls.warnings.join(' '), /No TCP or TLS/);
      assert.match(noTls.warnings.join(' '), /No TLS/);

      const noCreds = describeTurnConfig({ TURN_HOST: 'turn.example.com' });
      assert.equal(noCreds.configured, false);
      assert.match(noCreds.warnings.join(' '), /credentials are missing/);
    });

    test('nothing configured: no relay, no warnings, plain STUN only', () => {
      assert.deepEqual(describeTurnConfig({}), { configured: false, transports: [], warnings: [] });
    });

    test('warnings never contain credentials', () => {
      const text = JSON.stringify(describeTurnConfig({ TURN_URLS: 'turn:t:3478', TURN_USERNAME: 'SECRETUSER', TURN_CREDENTIAL: 'SECRETPASS', TURN_SECRET: 'SECRETKEY' }));
      assert.ok(!/SECRET(USER|PASS|KEY)/.test(text));
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
describe('signaling: session join and message relay', () => {
  let server;
  before(async () => { server = await startServer(); });
  after(async () => { await server.stop(); });

  test('agent creates a session, viewer joins, agent is told to start WebRTC (with ICE servers)', async () => {
    const agent = await makeAgent(server.url, '100001');
    const viewer = await makeViewer(server.url, '100001', { clientId: 'v-1' });
    const notified = await waitLogged(agent, 'agent:client_joined');
    assert.equal(notified.sessionId, '100001');
    assert.ok(Array.isArray(notified.iceServers) && notified.iceServers.length > 0);
    assert.equal(viewer.joined.hostOnline, true);
    assert.equal(viewer.joined.resumed, false);
    assert.deepEqual(viewer.joined.iceServers, notified.iceServers);
  });

  test('offer goes agent->viewer, answer goes viewer->agent, ICE flows both ways, bystanders get nothing', async () => {
    const agent = await makeAgent(server.url, '100002');
    const viewer = await makeViewer(server.url, '100002');
    const bystander = await connect(server.url);
    record(bystander, ['signal:sdp', 'signal:ice']);

    agent.emit('signal:sdp', { sessionId: '100002', to: 'client', sdp: { type: 'offer', sdp: 'v=0 offer' } });
    const offer = await waitEvent(viewer, 'signal:sdp');
    assert.equal(offer.sdp.type, 'offer');

    viewer.emit('signal:sdp', { sessionId: '100002', to: 'agent', sdp: { type: 'answer', sdp: 'v=0 answer' } });
    const answer = await waitEvent(agent, 'signal:sdp');
    assert.equal(answer.sdp.type, 'answer');

    agent.emit('signal:ice', { sessionId: '100002', to: 'client', candidate: { candidate: 'candidate:1 1 udp 1 10.0.0.1 1 typ host' } });
    viewer.emit('signal:ice', { sessionId: '100002', to: 'agent', candidate: { candidate: 'candidate:2 1 udp 1 10.0.0.2 2 typ srflx' } });
    assert.match((await waitEvent(viewer, 'signal:ice')).candidate.candidate, /typ host/);
    assert.match((await waitEvent(agent, 'signal:ice')).candidate.candidate, /typ srflx/);

    await sleep(150);
    assert.equal(bystander.log.length, 0);
  });

  test('sockets that are not part of the session cannot inject signaling', async () => {
    const agent = await makeAgent(server.url, '100003');
    const viewer = await makeViewer(server.url, '100003');
    const intruder = await connect(server.url);
    record(intruder, ['signal:undeliverable']);
    const before = count(agent, 'signal:sdp');

    intruder.emit('signal:sdp', { sessionId: '100003', to: 'agent', sdp: { type: 'answer', sdp: 'evil' } });
    intruder.emit('signal:ice', { sessionId: '100003', to: 'client', candidate: { candidate: 'x' } });
    await sleep(250);

    assert.equal(count(agent, 'signal:sdp'), before);
    assert.equal(count(viewer, 'signal:ice'), 0);
    assert.equal(count(intruder, 'signal:undeliverable'), 2);
    assert.equal(intruder.log[0].data.reason, 'not_allowed');
  });

  test('a peer cannot signal in the other peer\'s direction', async () => {
    const agent = await makeAgent(server.url, '100004');
    const viewer = await makeViewer(server.url, '100004');
    viewer.emit('signal:sdp', { sessionId: '100004', to: 'client', sdp: { type: 'offer', sdp: 'loop' } });
    const reply = await waitEvent(viewer, 'signal:undeliverable');
    assert.equal(reply.reason, 'not_allowed');
    assert.equal(count(agent, 'signal:sdp'), 0);
  });

  test('signaling to an offline peer is reported back instead of silently dropped', async () => {
    const agent = await makeAgent(server.url, '100005');
    // no viewer has joined yet
    agent.emit('signal:sdp', { sessionId: '100005', to: 'client', sdp: { type: 'offer', sdp: 'v=0' } });
    const reply = await waitEvent(agent, 'signal:undeliverable');
    assert.equal(reply.reason, 'peer_offline');
  });

  test('unknown session: structured SESSION_NOT_FOUND error, not retryable once the server is warm', async () => {
    const viewer = await connect(server.url);
    record(viewer, ['error']);
    viewer.emit('client:join_session', { sessionId: '999999' });
    const err = await waitEvent(viewer, 'error');
    assert.equal(err.code, 'SESSION_NOT_FOUND');
    assert.equal(err.retryable, false);
    assert.equal(err.message, 'Session not found');
  });

  test('relay requested but no TURN configured: plain STUN, relayAvailable=false (TURN stays optional)', async () => {
    await makeAgent(server.url, '100009');
    const viewer = await makeViewer(server.url, '100009', { relay: true });
    assert.equal(viewer.joined.relayAvailable, false);
    assert.equal(viewer.joined.relay, false);
    assert.deepEqual(viewer.joined.iceServers.flatMap((s) => [].concat(s.urls)), DEFAULT_STUN_URLS);
  });

  test('malformed payloads never crash the server', async () => {
    const s = await connect(server.url);
    record(s, ['error', 'signal:undeliverable']);
    s.emit('client:join_session', null);
    s.emit('client:join_session', { sessionId: { evil: true } });
    s.emit('signal:sdp', undefined);
    s.emit('signal:ice', { sessionId: 12 });
    s.emit('peer:diag', 'garbage');
    s.emit('client:leave_session', undefined);
    await sleep(300);
    const res = await fetch(`${server.url}/ping`);
    assert.equal(await res.text(), 'pong');
  });

  test('a second viewer displaces the first (which is told); the stale socket\'s disconnect cannot end the new viewer\'s session', async () => {
    const agent = await makeAgent(server.url, '100006');
    const v1 = await makeViewer(server.url, '100006', { clientId: 'one' });
    const v2 = await makeViewer(server.url, '100006', { clientId: 'two' });
    const ended = await waitLogged(v1, 'session:ended');
    assert.equal(ended.reason, 'Another viewer connected');

    v1.disconnect();
    await sleep(900); // longer than the 400ms viewer grace period
    assert.equal(count(agent, 'session:ended'), 0, 'agent must not be told the (new) viewer left');
    agent.emit('signal:sdp', { sessionId: '100006', to: 'client', sdp: { type: 'offer', sdp: 'v=0' } });
    assert.equal((await waitEvent(v2, 'signal:sdp')).sdp.type, 'offer');
  });

  test('duplicate agent:create_session on the same socket does not drop the attached viewer', async () => {
    const agent = await makeAgent(server.url, '100007');
    const viewer = await makeViewer(server.url, '100007');
    await waitLogged(agent, 'agent:client_joined');
    const joinedBefore = count(agent, 'agent:client_joined');
    agent.emit('agent:create_session', { sessionId: '100007', deviceId: 'DEV-TEST-100007' });
    await waitEvent(agent, 'agent:session_created');
    agent.emit('signal:sdp', { sessionId: '100007', to: 'client', sdp: { type: 'offer', sdp: 'v=0' } });
    assert.equal((await waitEvent(viewer, 'signal:sdp')).sdp.type, 'offer');
    assert.equal(count(agent, 'agent:client_joined'), joinedBefore, 'same-socket re-registration must not trigger renegotiation');
  });

  // Used by Render's healthCheckPath and by external uptime monitors (e.g. UptimeRobot) as the keep-alive target.
  test('GET/HEAD /ping is a lightweight health check: no auth, no Origin needed, no rate limit, no database, no session or data changes', async () => {
    const statusBefore = await (await fetch(`${server.url}/signaling-status`)).json();

    const get = await fetch(`${server.url}/ping`);
    assert.equal(get.status, 200);
    assert.equal(await get.text(), 'pong');
    const head = await fetch(`${server.url}/ping`, { method: 'HEAD' }); // UptimeRobot's default method
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');

    // The test server's MongoDB URI is deliberately unreachable: the endpoint must not depend on the database.
    const t0 = Date.now();
    const burst = await Promise.all(Array.from({ length: 400 }, () => fetch(`${server.url}/ping`)));
    assert.ok(burst.every((r) => r.status === 200), 'never rate limited (monitors poll forever)');
    assert.ok(Date.now() - t0 < 5000, 'stays fast with the database unreachable');

    const statusAfter = await (await fetch(`${server.url}/signaling-status`)).json();
    assert.equal(statusAfter.activeSessions, statusBefore.activeSessions, 'health checks never create sessions');
    assert.equal(statusAfter.sessionsWithViewer, statusBefore.sessionsWithViewer);
  });

  test('GET /signaling-status reports TURN state and never exposes session codes', async () => {
    await makeAgent(server.url, '100008');
    const body = await (await fetch(`${server.url}/signaling-status`)).json();
    assert.equal(body.ok, true);
    assert.equal(body.turnConfigured, false);
    assert.ok(body.activeSessions >= 1);
    assert.ok(!JSON.stringify(body).includes('100008'));
  });
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
describe('signaling: reconnection, grace periods and cleanup', () => {
  let server;
  before(async () => { server = await startServer(); });
  after(async () => { await server.stop(); });

  test('agent signaling drop: viewer is told, session survives, returning agent restarts negotiation', async () => {
    const agentA = await makeAgent(server.url, '200001');
    const viewer = await makeViewer(server.url, '200001');
    agentA.disconnect();
    const offline = await waitLogged(viewer, 'session:host_offline');
    assert.equal(offline.sessionId, '200001');

    const agentB = await makeAgent(server.url, '200001'); // agent auto-reconnected
    await waitLogged(viewer, 'session:host_reconnected');
    await waitLogged(agentB, 'agent:client_joined');
    assert.equal(count(agentB, 'agent:client_joined'), 1, 'returning agent must be asked to start a fresh offer');
    assert.equal(count(viewer, 'session:ended'), 0);
  });

  test('agent returning while the viewer\'s P2P link is still up does not force renegotiation', async () => {
    const agentA = await makeAgent(server.url, '200002');
    const viewer = await makeViewer(server.url, '200002');
    viewer.emit('peer:diag', { sessionId: '200002', event: 'connection_state', state: 'connected' });
    await sleep(100);
    agentA.disconnect();
    await waitLogged(viewer, 'session:host_offline');
    const agentB = await makeAgent(server.url, '200002');
    await waitLogged(viewer, 'session:host_reconnected');
    await sleep(300);
    assert.equal(count(agentB, 'agent:client_joined'), 0);
  });

  test('agent gone past the grace period: viewer gets session:ended and the code is freed', async () => {
    const agent = await makeAgent(server.url, '200003');
    const viewer = await makeViewer(server.url, '200003');
    agent.disconnect();
    const ended = await waitEvent(viewer, 'session:ended', 3000);
    assert.equal(ended.reason, 'Host agent disconnected');

    const late = await connect(server.url);
    record(late, ['error']);
    late.emit('client:join_session', { sessionId: '200003' });
    assert.equal((await waitEvent(late, 'error')).code, 'SESSION_NOT_FOUND');
  });

  test('viewer joining while the agent is inside its grace period waits instead of failing', async () => {
    const agentA = await makeAgent(server.url, '200004');
    agentA.disconnect();
    await sleep(80);
    const viewer = await makeViewer(server.url, '200004');
    assert.equal(viewer.joined.hostOnline, false);
    assert.equal(count(viewer, 'error'), 0);

    const agentB = await makeAgent(server.url, '200004');
    await waitLogged(agentB, 'agent:client_joined');
    assert.equal(count(agentB, 'agent:client_joined'), 1, 'agent is asked to negotiate as soon as it is back');
  });

  test('viewer socket drop: agent is NOT told during the grace period; resume keeps the P2P link', async () => {
    const agent = await makeAgent(server.url, '200005');
    const v1 = await makeViewer(server.url, '200005', { clientId: 'tab-a' });
    await waitLogged(agent, 'agent:client_joined');
    const joinsBefore = count(agent, 'agent:client_joined');
    v1.disconnect();
    await sleep(120);
    assert.equal(count(agent, 'session:ended'), 0);

    const v2 = await makeViewer(server.url, '200005', { clientId: 'tab-a', resume: true, peerState: 'connected' });
    assert.equal(v2.joined.resumed, true);
    await sleep(800); // well past the original grace period
    assert.equal(count(agent, 'session:ended'), 0, 'grace timer must be cancelled by the re-join');
    assert.equal(count(agent, 'agent:client_joined'), joinsBefore, 'resume with a live peer must not renegotiate');
  });

  test('viewer re-join without a live peer (page refresh) renegotiates', async () => {
    const agent = await makeAgent(server.url, '200006');
    const v1 = await makeViewer(server.url, '200006', { clientId: 'tab-b' });
    await waitLogged(agent, 'agent:client_joined');
    const joinsBefore = count(agent, 'agent:client_joined');
    v1.disconnect();
    await makeViewer(server.url, '200006', { clientId: 'tab-b' });
    await waitLogged(agent, 'agent:client_joined', { nth: joinsBefore });
    assert.equal(count(agent, 'agent:client_joined'), joinsBefore + 1);
    assert.equal(count(agent, 'session:ended'), 0);
  });

  test('viewer gone past the grace period: agent is told so it can stop capturing', async () => {
    const agent = await makeAgent(server.url, '200007');
    const viewer = await makeViewer(server.url, '200007');
    viewer.disconnect();
    await sleep(150);
    assert.equal(count(agent, 'session:ended'), 0, 'not before the grace period');
    const ended = await waitEvent(agent, 'session:ended', 3000);
    assert.equal(ended.reason, 'Client disconnected');
  });

  test('explicit client:leave_session ends the viewer immediately (no grace period)', async () => {
    const agent = await makeAgent(server.url, '200008');
    const viewer = await makeViewer(server.url, '200008');
    viewer.emit('client:leave_session', { sessionId: '200008' });
    const ended = await waitEvent(agent, 'session:ended', 250);
    assert.equal(ended.reason, 'Client disconnected');
  });

  test('a brand-new viewer can join again after the previous one left', async () => {
    const agent = await makeAgent(server.url, '200009');
    const v1 = await makeViewer(server.url, '200009');
    v1.emit('client:leave_session', { sessionId: '200009' });
    await waitEvent(agent, 'session:ended', 500);
    const v2 = await makeViewer(server.url, '200009');
    assert.equal(v2.joined.hostOnline, true);
    await waitLogged(agent, 'agent:client_joined', { nth: 1 });
    assert.equal(count(agent, 'agent:client_joined'), 2);
  });
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
describe('signaling: cold start (Render restart) handling', () => {
  let server;
  before(async () => { server = await startServer({ COLD_START_GRACE_MS: '60000' }); });
  after(async () => { await server.stop(); });

  test('"not found" right after startup is flagged retryable, and succeeds once the agent has re-registered', async () => {
    const viewer = await connect(server.url);
    record(viewer, ['error', 'client:joined_success']);
    viewer.emit('client:join_session', { sessionId: '300001' });
    const err = await waitEvent(viewer, 'error');
    assert.equal(err.code, 'SESSION_NOT_FOUND');
    assert.equal(err.retryable, true);

    await makeAgent(server.url, '300001'); // agent finished auto-reconnecting
    const joined = waitEvent(viewer, 'client:joined_success');
    viewer.emit('client:join_session', { sessionId: '300001' });
    assert.equal((await joined).hostOnline, true);
  });
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
describe('signaling: TURN delivery and log hygiene', () => {
  let server;
  before(async () => {
    server = await startServer({ TURN_URLS: 'turn:turn.example.com:3478', TURN_SECRET: 'SUPERSECRET_TURN_VALUE' });
  });
  after(async () => { await server.stop(); });

  const hasTurn = (list) => list.some((s) => [].concat(s.urls).some((u) => /^turns?:/.test(u)));

  test('first (direct) join: TURN is configured but NOT handed out; the viewer is only told a relay is available', async () => {
    const agent = await makeAgent(server.url, '400010');
    const viewer = await makeViewer(server.url, '400010');
    const forAgent = await waitLogged(agent, 'agent:client_joined');
    assert.equal(hasTurn(viewer.joined.iceServers), false);
    assert.equal(hasTurn(forAgent.iceServers), false);
    assert.equal(viewer.joined.relayAvailable, true);
    assert.equal(viewer.joined.relay, false);
    assert.equal(forAgent.relay, false);
  });

  test('relay requested after a direct attempt failed: TURN is delivered to BOTH peers', async () => {
    const agent = await makeAgent(server.url, '400001');
    const viewer = await makeViewer(server.url, '400001', { relay: true });
    const forAgent = (await waitLogged(agent, 'agent:client_joined')).iceServers;
    assert.equal(viewer.joined.relay, true);
    for (const list of [viewer.joined.iceServers, forAgent]) {
      const turn = list.find((s) => [].concat(s.urls).some((u) => u.startsWith('turn:')));
      assert.ok(turn, 'TURN entry present');
      assert.match(turn.username, /^\d+:chameleon$/);
      assert.ok(turn.credential);
    }
    const status = await (await fetch(`${server.url}/signaling-status`)).json();
    assert.equal(status.turnConfigured, true);
    assert.equal(status.turnMode, 'fallback-only');
    assert.deepEqual(status.turnTransports, ['udp']);
    assert.ok(status.turnWarnings.some((w) => /No TCP or TLS/.test(w)), 'operator sees that this relay set is UDP-only');
    assert.ok(!JSON.stringify(status).includes('SUPERSECRET'));
  });

  test('failure diagnosis, recovery method and relay transport reported by peers reach the logs (counts and codes only)', async () => {
    await makeAgent(server.url, '400020');
    const viewer = await makeViewer(server.url, '400020');
    viewer.emit('peer:diag', { sessionId: '400020', event: 'failed', code: 'ICE_FAILED', reason: 'ICE_FAILED', candHost: 2, candSrflx: 0, candRelay: 0, iceErrors: 'turns:443=401' });
    viewer.emit('peer:diag', { sessionId: '400020', event: 'recovery', reason: 'PEER_LOST', method: 'ice_restart', relay: true });
    viewer.emit('peer:diag', { sessionId: '400020', event: 'selected_pair', pairType: 'relay<->host', protocol: 'udp', relayProtocol: 'tls' });
    await sleep(300);
    const diags = server.logs.filter((l) => l.startsWith('{')).map((l) => JSON.parse(l)).filter((e) => e.event === 'peer.diag' && e.session === '40****');
    const failed = diags.find((e) => e.diag === 'failed');
    assert.deepEqual([failed.candHost, failed.candSrflx, failed.candRelay, failed.iceErrors, failed.level], [2, 0, 0, 'turns:443=401', 'warn']);
    assert.equal(diags.find((e) => e.diag === 'recovery').method, 'ice_restart');
    assert.equal(diags.find((e) => e.diag === 'selected_pair').relayProtocol, 'tls');
  });

  test('a later direct re-join drops the relay again (the decision is per attempt)', async () => {
    const agent = await makeAgent(server.url, '400011');
    await makeViewer(server.url, '400011', { relay: true, clientId: 'r' });
    await waitLogged(agent, 'agent:client_joined');
    await makeViewer(server.url, '400011', { clientId: 'r' }); // new page / new session: direct first again
    const second = await waitLogged(agent, 'agent:client_joined', { nth: 1 });
    assert.equal(second.relay, false);
    assert.equal(hasTurn(second.iceServers), false);
  });

  test('host reconnecting while a viewer waits on a relay attempt gets the same relay decision', async () => {
    const agentA = await makeAgent(server.url, '400012');
    await makeViewer(server.url, '400012', { relay: true });
    agentA.disconnect();
    await sleep(100);
    const agentB = await makeAgent(server.url, '400012');
    const joined = await waitLogged(agentB, 'agent:client_joined');
    assert.equal(joined.relay, true);
    assert.equal(hasTurn(joined.iceServers), true);
  });

  test('structured lifecycle logs exist and never contain SDP bodies, IP addresses, secrets or full session codes', async () => {
    const agent = await makeAgent(server.url, '124026');
    const viewer = await makeViewer(server.url, '124026');
    agent.emit('signal:sdp', { sessionId: '124026', to: 'client', sdp: { type: 'offer', sdp: 'v=0\r\no=CANARY_SDP_BODY 1 1 IN IP4 198.51.100.77' } });
    await waitEvent(viewer, 'signal:sdp');
    viewer.emit('signal:sdp', { sessionId: '124026', to: 'agent', sdp: { type: 'answer', sdp: 'v=0\r\no=CANARY_SDP_BODY' } });
    await waitEvent(agent, 'signal:sdp');
    agent.emit('signal:ice', { sessionId: '124026', to: 'client', candidate: { candidate: 'candidate:1 1 udp 2122260223 203.0.113.9 54321 typ host', sdpMid: '0' } });
    await waitEvent(viewer, 'signal:ice');
    viewer.emit('peer:diag', { sessionId: '124026', event: 'connection_state', state: 'connected', token: 'SHOULD_NOT_APPEAR', candidate: '203.0.113.9' });
    viewer.emit('peer:diag', { sessionId: '124026', event: 'failed', reason: 'ice timeout', code: 'ICE_FAILED' });
    await sleep(200); // let the packets flush before the socket closes
    viewer.disconnect();
    await sleep(300);

    const text = server.logs.join('\n');
    for (const forbidden of ['CANARY_SDP_BODY', '198.51.100.77', '203.0.113.9', 'SUPERSECRET_TURN_VALUE', 'SHOULD_NOT_APPEAR', '124026']) {
      assert.ok(!text.includes(forbidden), `logs leaked: ${forbidden}`);
    }
    const events = server.logs.filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));
    const names = new Set(events.map((e) => e.event));
    for (const expected of ['socket.connected', 'session.created', 'session.waiting_for_peer', 'client.joined', 'peer.detected', 'signal.sdp', 'signal.ice', 'peer.diag', 'socket.disconnected']) {
      assert.ok(names.has(expected), `missing log event ${expected}`);
    }
    const sdpLogs = events.filter((e) => e.event === 'signal.sdp');
    assert.deepEqual(sdpLogs.map((e) => [e.from, e.to, e.descriptionType]), [['agent', 'client', 'offer'], ['client', 'agent', 'answer']]);
    const ice = events.find((e) => e.event === 'signal.ice');
    assert.equal(ice.candidateType, 'host');
    assert.equal(ice.protocol, 'udp');
    assert.equal(ice.session, '12****');
    assert.ok(events.some((e) => e.event === 'peer.diag' && e.level === 'warn' && e.code === 'ICE_FAILED'), 'failures are logged at warn level with a reason');
  });

  test('peer:diag is ignored from non-members and rate limited', async () => {
    await makeAgent(server.url, '400002');
    const intruder = await connect(server.url);
    const marker = server.logs.length;
    intruder.emit('peer:diag', { sessionId: '400002', event: 'connection_state', state: 'connected' });
    await sleep(200);
    assert.ok(!server.logs.slice(marker).some((l) => l.includes('"event":"peer.diag"')));
  });
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
// Managed TURN (Cloudflare Realtime TURN): the response shape below is the one in Cloudflare's documentation.
const CF_RESPONSE = {
  iceServers: [
    { urls: ['stun:stun.cloudflare.com:3478'] },
    {
      urls: [
        'turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:443?transport=udp',
        'turn:turn.cloudflare.com:3478?transport=tcp', 'turn:turn.cloudflare.com:80?transport=tcp',
        'turns:turn.cloudflare.com:5349?transport=tcp', 'turns:turn.cloudflare.com:443?transport=tcp',
        'turn:turn.cloudflare.com:53?transport=udp',
      ],
      username: 'CF_TEMP_USER_abc123',
      credential: 'CF_TEMP_CRED_xyz789',
    },
  ],
};

const stubFetch = (status, body, calls = []) => async (url, opts) => {
  calls.push({ url, opts });
  return { ok: status >= 200 && status < 300, status, json: async () => body };
};
const cfEnv = { CLOUDFLARE_TURN_KEY_ID: 'KEY123', CLOUDFLARE_TURN_API_TOKEN: 'API_TOKEN_SECRET_VALUE' };

describe('managed TURN provider (Cloudflare Realtime TURN)', () => {
  test('requests short-lived credentials exactly as the API documents (POST, bearer token, JSON ttl)', async () => {
    const calls = [];
    const p = createTurnProvider({ ...cfEnv, CLOUDFLARE_TURN_TTL_SECONDS: '7200' }, { fetchImpl: stubFetch(201, CF_RESPONSE, calls) });
    assert.equal(await p.start(), true);
    p.stop();
    assert.equal(calls[0].url, 'https://rtc.live.cloudflare.com/v1/turn/keys/KEY123/credentials/generate-ice-servers');
    assert.equal(calls[0].opts.method, 'POST');
    assert.equal(calls[0].opts.headers.Authorization, 'Bearer API_TOKEN_SECRET_VALUE');
    assert.equal(calls[0].opts.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(calls[0].opts.body), { ttl: 7200 });
  });

  test('keeps only usable TURN entries (credentials present, turn:/turns: URLs, no browser-blocked port 53)', async () => {
    const p = createTurnProvider(cfEnv, { fetchImpl: stubFetch(201, CF_RESPONSE) });
    await p.start(); p.stop();
    const servers = p.getRelayServers();
    assert.equal(servers.length, 1);
    assert.equal(servers[0].username, 'CF_TEMP_USER_abc123');
    assert.ok(!servers[0].urls.some((u) => /:53(\?|$)/.test(u)));
    assert.deepEqual(describeTurnConfig({}, p).transports, ['udp', 'tcp', 'tls'], 'UDP + TCP + TLS(443) are all offered');
    assert.equal(isTurnConfigured({}, p), true);
  });

  test('is a complete no-op when not configured (TURN stays optional)', async () => {
    let called = false;
    const p = createTurnProvider({}, { fetchImpl: async () => { called = true; } });
    assert.equal(await p.start(), false);
    assert.equal(called, false);
    assert.equal(p.status().state, 'disabled');
    assert.deepEqual(p.getRelayServers(), []);
    assert.equal(isTurnConfigured({}, p), false);
  });

  test('rejected credentials/token: relay stays disabled and the status says why (no silent "relay available")', async () => {
    const p = createTurnProvider(cfEnv, { fetchImpl: stubFetch(401, {}) });
    assert.equal(await p.start(), false); p.stop();
    assert.equal(p.status().state, 'error');
    assert.equal(p.status().lastError, 'HTTP 401');
    assert.equal(isTurnConfigured({}, p), false);
    assert.match(describeTurnConfig({}, p).warnings.join(' '), /no credentials are available \(HTTP 401\)/);
    assert.deepEqual(buildIceServers({}, Date.now(), { relay: true, provider: p }).flatMap((s) => [].concat(s.urls)), DEFAULT_STUN_URLS);
  });

  test('a response without TURN entries is an error, not an empty "success"', async () => {
    const p = createTurnProvider(cfEnv, { fetchImpl: stubFetch(201, { iceServers: [{ urls: ['stun:x:3478'] }] }) });
    assert.equal(await p.start(), false); p.stop();
    assert.equal(p.status().lastError, 'response contained no TURN entries');
  });

  test('credentials are never served once (nearly) expired, and a failed refresh keeps valid ones', async () => {
    let t = 1_000_000;
    let status = 201;
    const p = createTurnProvider({ ...cfEnv, CLOUDFLARE_TURN_TTL_SECONDS: '1000' }, { fetchImpl: async () => ({ ok: status === 201, status, json: async () => CF_RESPONSE }), now: () => t });
    await p.start();
    assert.equal(p.getRelayServers().length, 1);
    status = 503; t += 500_000;
    await p.refresh();
    assert.equal(p.getRelayServers().length, 1, 'still valid: kept after a failed refresh');
    assert.equal(p.status().state, 'ok');
    t += 450_000; // 950s of 1000s used: inside the last 10%
    assert.equal(p.getRelayServers().length, 0, 'nearly expired credentials are not handed out');
    p.stop();
  });

  test('never leaks the API token or issued credentials through status, warnings or errors', async () => {
    const p = createTurnProvider(cfEnv, { fetchImpl: async () => { throw new Error('connect ECONNREFUSED API_TOKEN_SECRET_VALUE'); } });
    await p.start(); p.stop();
    const text = JSON.stringify([p.status(), describeTurnConfig({}, p)]);
    assert.ok(!text.includes('API_TOKEN_SECRET_VALUE'));
    assert.equal(p.status().lastError, 'request failed');
  });

  test('relay credentials only come with a relay request; an explicit TURN_HOST/TURN_URLS config takes precedence', async () => {
    const p = createTurnProvider(cfEnv, { fetchImpl: stubFetch(201, CF_RESPONSE) });
    await p.start(); p.stop();
    assert.deepEqual(buildIceServers({}, Date.now(), { relay: false, provider: p }).flatMap((s) => [].concat(s.urls)), DEFAULT_STUN_URLS, 'direct attempt: plain STUN');
    assert.equal(buildIceServers({}, Date.now(), { relay: true, provider: p }).pop().username, 'CF_TEMP_USER_abc123');
    const own = { TURN_HOST: 'own.example.com', TURN_USERNAME: 'u', TURN_CREDENTIAL: 'p' };
    assert.equal(buildIceServers(own, Date.now(), { relay: true, provider: p }).pop().username, 'u');
  });

  describe('end to end against a mock of the Cloudflare API', () => {
    let mock; let mockUrl; const requests = [];
    let mockStatus = 201;
    let server;

    before(async () => {
      mock = http.createServer((req, res) => {
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          requests.push({ method: req.method, url: req.url, auth: req.headers.authorization, body });
          res.writeHead(mockStatus, { 'content-type': 'application/json' });
          res.end(mockStatus === 201 ? JSON.stringify(CF_RESPONSE) : '{}');
        });
      });
      await new Promise((r) => mock.listen(0, '127.0.0.1', r));
      mockUrl = `http://127.0.0.1:${mock.address().port}`;
      server = await startServer({ ...cfEnv, CLOUDFLARE_TURN_API_BASE: mockUrl });
      await sleep(400);
    });
    after(async () => { await server.stop(); mock.close(); });

    test('the server fetched credentials at startup and reports an operational relay with UDP+TCP+TLS', async () => {
      assert.equal(requests[0].method, 'POST');
      assert.equal(requests[0].url, '/v1/turn/keys/KEY123/credentials/generate-ice-servers');
      assert.equal(requests[0].auth, 'Bearer API_TOKEN_SECRET_VALUE');
      const st = await (await fetch(`${server.url}/signaling-status`)).json();
      assert.equal(st.turnConfigured, true);
      assert.deepEqual(st.turnTransports, ['udp', 'tcp', 'tls']);
      assert.equal(st.turnProvider.state, 'ok');
      assert.ok(!JSON.stringify(st).includes('API_TOKEN_SECRET_VALUE'));
    });

    test('direct join gets plain STUN; the relay join gets the temporary credentials for BOTH peers', async () => {
      const agent = await makeAgent(server.url, '500001');
      const direct = await makeViewer(server.url, '500001', { clientId: 'd' });
      assert.equal(direct.joined.relayAvailable, true);
      assert.ok(!JSON.stringify(direct.joined.iceServers).includes('CF_TEMP_CRED'), 'no TURN credential on the direct attempt');
      const relayed = await makeViewer(server.url, '500001', { clientId: 'd', relay: true });
      const forAgent = (await waitLogged(agent, 'agent:client_joined', { nth: 1 })).iceServers;
      for (const list of [relayed.joined.iceServers, forAgent]) {
        const turn = list.find((x) => x.username === 'CF_TEMP_USER_abc123');
        assert.ok(turn && turn.credential === 'CF_TEMP_CRED_xyz789');
        assert.ok(turn.urls.some((u) => u.startsWith('turns:turn.cloudflare.com:443')));
      }
    });

    test('server logs never contain the API token or the issued credentials', async () => {
      await sleep(200);
      const text = server.logs.join('\n');
      for (const secret of ['API_TOKEN_SECRET_VALUE', 'CF_TEMP_USER_abc123', 'CF_TEMP_CRED_xyz789']) assert.ok(!text.includes(secret), `leaked ${secret}`);
      assert.ok(server.logs.some((l) => l.includes('turn.provider_refreshed')), 'the refresh itself is logged (without secrets)');
    });

    test('a rejected token at startup yields relayAvailable=false and a clear status (not a silent claim)', async () => {
      mockStatus = 401;
      const bad = await startServer({ ...cfEnv, CLOUDFLARE_TURN_API_BASE: mockUrl });
      try {
        await sleep(400);
        const st = await (await fetch(`${bad.url}/signaling-status`)).json();
        assert.equal(st.turnConfigured, false);
        assert.equal(st.turnProvider.state, 'error');
        assert.equal(st.turnProvider.lastError, 'HTTP 401');
        assert.ok(st.turnWarnings.some((w) => /no credentials are available/.test(w)));
        await makeAgent(bad.url, '500002');
        const v = await makeViewer(bad.url, '500002', { relay: true });
        assert.equal(v.joined.relayAvailable, false);
        assert.ok(bad.logs.some((l) => l.includes('relay fallback is DISABLED')), 'loud startup warning');
      } finally { await bad.stop(); mockStatus = 201; }
    });
  });
});
