/**
 * Regression tests for the viewer connection lifecycle (src/lib/connectionManager.js).
 *
 * Each test reproduces a failure mode that left the UI stuck on "Establishing Link..." or tore down a
 * working session. Sockets and RTCPeerConnections are fakes; timers are mocked so every timeout and
 * retry path is exercised deterministically.
 *
 * Run: npm test
 */
/* global setImmediate */
import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ConnectionManager, DEFAULT_ICE_SERVERS, DEFAULT_TIMEOUTS, MESSAGES, extractFingerprint } from './connectionManager.js';

// ── fakes ─────────────────────────────────────────────────────────────────────────────────────────
class FakeSocket {
  constructor() {
    this.handlers = {};
    this.emitted = [];       // client -> server
    this.connected = false;
    this.disconnectCalls = 0;
  }
  on(event, fn) { (this.handlers[event] = this.handlers[event] || []).push(fn); return this; }
  removeAllListeners() { this.handlers = {}; }
  listenerCount() { return Object.values(this.handlers).reduce((n, a) => n + a.length, 0); }
  emit(event, ...args) { this.emitted.push([event, ...args]); }
  disconnect() { this.disconnectCalls += 1; this.connected = false; }
  connect() { this.connected = true; this.serverSend('connect'); }
  // test helpers (server -> client)
  serverSend(event, ...args) { (this.handlers[event] || []).slice().forEach((fn) => fn(...args)); }
  up() { this.connected = true; this.serverSend('connect'); }
  sent(event) { return this.emitted.filter((e) => e[0] === event).map((e) => e[1]); }
}

class FakePeer {
  constructor(cfg) {
    this.cfg = cfg;
    this.connectionState = 'new';
    this.iceConnectionState = 'new';
    this.iceGatheringState = 'new';
    this.signalingState = 'stable';
    this.closed = false;
    this.candidates = [];
    this.remote = null;
    this.offerOpts = [];
    this.statsMap = new Map();
  }
  async setRemoteDescription(d) { this.remote = d; this.signalingState = d.type === 'answer' ? 'stable' : 'have-remote-offer'; }
  async createAnswer() { return { type: 'answer', sdp: 'v=0\r\na=fingerprint:sha-256 LOCAL:FP\r\n' }; }
  async createOffer(opts) {
    this.offerOpts.push(opts || {});
    return { type: 'offer', sdp: `v=0\r\na=ice-ufrag:LOCAL${this.offerOpts.length}\r\na=fingerprint:sha-256 LOCAL:FP\r\n` };
  }
  async setLocalDescription(d) { this.localDescription = d; this.signalingState = d.type === 'offer' ? 'have-local-offer' : 'stable'; }
  async addIceCandidate(c) {
    if (!this.remote) throw new Error('addIceCandidate before remote description');
    this.candidates.push(c);
  }
  async getStats() { return this.statsMap; }
  close() { this.closed = true; this.signalingState = 'closed'; }
  setState(state) { this.connectionState = state; if (this.onconnectionstatechange) this.onconnectionstatechange(); }
}

const offerSdp = (fp = 'AA:BB:CC') => ({ type: 'offer', sdp: `v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\na=fingerprint:sha-256 ${fp}\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n` });
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r)); };

const TURN_LIST = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'turn:turn.example.com:3478', username: 'u', credential: 'p' }];

function rig({ timeouts, sessionId = '123456' } = {}) {
  const r = { statuses: [], peers: [], sockets: [], closedPeers: [], connectedCalls: [], logs: [] };
  r.m = new ConnectionManager({
    signalingUrl: 'http://signal.test',
    sessionId,
    clientId: 'tab-1',
    ioFactory: () => { const s = new FakeSocket(); r.sockets.push(s); return s; },
    rtcFactory: (cfg) => { const p = new FakePeer(cfg); r.peers.push(p); return p; },
    logger: {
      info: (e, f) => r.logs.push({ level: 'info', e, f }),
      warn: (e, f) => r.logs.push({ level: 'warn', e, f }),
      error: (e, f) => r.logs.push({ level: 'error', e, f }),
    },
    hooks: {
      onStatus: (s) => r.statuses.push(s),
      onPeer: () => {},
      onPeerConnected: (p, info) => r.connectedCalls.push(info),
      onPeerClosed: (p) => r.closedPeers.push(p),
    },
    timeouts,
  });
  r.sock = () => r.sockets[r.sockets.length - 1];
  r.last = () => r.statuses[r.statuses.length - 1];
  r.errors = () => r.statuses.filter((s) => s.status === 'error');
  r.phases = () => r.statuses.map((s) => `${s.status}:${s.phase}`);
  // Drive the happy prefix: connect + joined + offer, leaving the answer sent.
  r.joinAndOffer = async ({ fp, ice = TURN_LIST, hostOnline = true } = {}) => {
    r.sock().up();
    r.sock().serverSend('client:joined_success', { sessionId, hostOnline, resumed: false, iceServers: ice });
    r.sock().serverSend('signal:sdp', { sdp: offerSdp(fp) });
    await flush();
  };
  return r;
}

describe('ConnectionManager', () => {
  beforeEach(() => mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 }));
  afterEach(() => mock.timers.reset());

  // ── happy path ─────────────────────────────────────────────────────────────────────────────────
  describe('negotiation', () => {
    test('join -> offer -> answer -> ICE -> connected, and nothing fires afterwards', async () => {
      const r = rig();
      r.m.start();
      assert.equal(r.last().phase, 'server');
      r.sock().up();
      assert.deepEqual(r.sock().sent('client:join_session'), [{ sessionId: '123456', clientId: 'tab-1', resume: false, peerState: 'none', relay: false }]);

      r.sock().serverSend('client:joined_success', { sessionId: '123456', hostOnline: true, iceServers: TURN_LIST });
      assert.equal(r.last().phase, 'waiting_host');

      r.sock().serverSend('signal:sdp', { sdp: offerSdp() });
      await flush();
      assert.equal(r.peers.length, 1);
      const answers = r.sock().sent('signal:sdp');
      assert.equal(answers.length, 1);
      assert.equal(answers[0].to, 'agent');
      assert.equal(answers[0].sdp.type, 'answer');
      assert.equal(r.last().phase, 'negotiating');

      r.peers[0].onicecandidate({ candidate: { candidate: 'candidate:1 1 udp 1 10.0.0.9 5000 typ host', type: 'host' } });
      const ice = r.sock().sent('signal:ice');
      assert.equal(ice.length, 1);
      assert.equal(ice[0].to, 'agent');

      r.peers[0].setState('connected');
      assert.equal(r.last().status, 'connected');
      assert.deepEqual(r.connectedCalls, [{ firstTime: true }]);

      mock.timers.tick(10 * 60 * 1000);
      assert.equal(r.errors().length, 0, 'no timer may fire once connected');
      assert.equal(r.last().status, 'connected');
    });

    test('uses the ICE servers (incl. TURN) delivered by the signaling server', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer();
      assert.deepEqual(r.peers[0].cfg.iceServers, TURN_LIST);
    });

    test('falls back to reachable STUN servers only (no dead openrelay TURN) when the server sends none', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer({ ice: null });
      assert.deepEqual(r.peers[0].cfg.iceServers, DEFAULT_ICE_SERVERS);
      const urls = JSON.stringify(DEFAULT_ICE_SERVERS);
      assert.ok(!/openrelay|metered|:443/.test(urls));
    });

    test('remote ICE candidates that arrive before the offer is applied are queued, then drained', async () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      r.sock().serverSend('signal:ice', { candidate: { candidate: 'candidate:early' } });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp() });
      r.sock().serverSend('signal:ice', { candidate: { candidate: 'candidate:late' } });
      await flush();
      assert.deepEqual(r.peers[0].candidates.map((c) => c.candidate).sort(), ['candidate:early', 'candidate:late']);
    });

    test('pooled candidates that arrive before the offer are kept; stale ones from a previous host peer (other ufrag) are dropped', async () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      const sdp = { type: 'offer', sdp: 'v=0\r\na=ice-ufrag:NEW1\r\na=fingerprint:sha-256 AA:AA\r\n' };
      r.sock().serverSend('signal:ice', { candidate: { candidate: 'candidate:pooled', usernameFragment: 'NEW1' } });
      r.sock().serverSend('signal:ice', { candidate: { candidate: 'candidate:stale', usernameFragment: 'OLD0' } });
      r.sock().serverSend('signal:sdp', { sdp });
      await flush();
      assert.deepEqual(r.peers[0].candidates.map((c) => c.candidate), ['candidate:pooled']);
      r.sock().serverSend('signal:ice', { candidate: { candidate: 'candidate:stale2', usernameFragment: 'OLD0' } });
      await flush();
      assert.deepEqual(r.peers[0].candidates.map((c) => c.candidate), ['candidate:pooled'], 'stale candidates never reach the live peer');
    });

    test('an offer from a rebuilt host peer (new DTLS fingerprint) gets a fresh RTCPeerConnection; an ICE-restart offer does not', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer({ fp: 'AA:AA' });
      r.peers[0].setState('connected');

      r.sock().serverSend('signal:sdp', { sdp: offerSdp('AA:AA') }); // same host peer renegotiating
      await flush();
      assert.equal(r.peers.length, 1);

      r.sock().serverSend('signal:sdp', { sdp: offerSdp('BB:BB') }); // host rebuilt its peer
      await flush();
      assert.equal(r.peers.length, 2);
      assert.equal(r.peers[0].closed, true);
      assert.ok(r.closedPeers.includes(r.peers[0]));
      assert.equal(r.sock().sent('signal:sdp').length, 3, 'every offer is answered');
    });

    test('extractFingerprint reads the DTLS fingerprint', () => {
      assert.equal(extractFingerprint('v=0\r\na=fingerprint:sha-256 ab:cd:ef\r\n'), 'SHA-256 AB:CD:EF');
      assert.equal(extractFingerprint('no fingerprint here'), null);
    });
  });

  // ── the stuck-forever failure modes ────────────────────────────────────────────────────────────
  describe('never stuck on "Establishing Link..."', () => {
    test('host never sends an offer: one automatic retry, then a clear error and the host is released', async () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true });

      mock.timers.tick(DEFAULT_TIMEOUTS.offerMs);
      assert.equal(r.sock().sent('client:join_session').length, 2, 'renegotiation attempt = re-join');
      assert.equal(r.last().phase, 'retrying');
      r.sock().serverSend('client:joined_success', { hostOnline: true });

      mock.timers.tick(DEFAULT_TIMEOUTS.offerMs);
      assert.equal(r.last().status, 'error');
      assert.equal(r.last().message, MESSAGES.HOST_NO_RESPONSE);
      assert.equal(r.sock().sent('client:leave_session').length, 1);
      assert.equal(r.sock().disconnectCalls, 0, 'the connected socket is kept open briefly so the failure diagnosis can flush');
      mock.timers.tick(300);
      assert.equal(r.sock().disconnectCalls, 1);
    });

    test('ICE never connects (no usable path / dead TURN): retries once, then reports a connectivity error', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer();
      assert.equal(r.last().phase, 'negotiating');

      mock.timers.tick(DEFAULT_TIMEOUTS.iceMs);
      assert.equal(r.peers[0].closed, true, 'stale peer is closed before retrying');
      assert.equal(r.last().phase, 'retrying');
      assert.equal(r.sock().sent('client:join_session').length, 2);

      r.sock().serverSend('client:joined_success', { hostOnline: true });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp('CC:CC') });
      await flush();
      assert.equal(r.peers.length, 2, 'retry builds a brand-new peer connection');

      mock.timers.tick(DEFAULT_TIMEOUTS.iceMs);
      assert.equal(r.last().status, 'error');
      assert.equal(r.last().message, MESSAGES.ICE_FAILED);
      assert.match(r.last().message, /TURN/);
      assert.equal(r.peers[1].closed, true);

      const before = r.statuses.length;
      mock.timers.tick(10 * 60 * 1000);
      assert.equal(r.statuses.length, before, 'terminal: no further activity');
    });

    test('a retry that succeeds ends in "connected" and resets the attempt counter', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceMs);
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp('DD:DD') });
      await flush();
      r.peers[1].setState('connected');
      assert.equal(r.last().status, 'connected');
      assert.equal(r.errors().length, 0);
      mock.timers.tick(5 * 60 * 1000);
      assert.equal(r.last().status, 'connected');
    });

    test('server unreachable (Render cold start): explains the wait, then fails with a message', () => {
      const r = rig();
      r.m.start();
      mock.timers.tick(DEFAULT_TIMEOUTS.coldStartHintMs);
      assert.equal(r.last().phase, 'server_wake');
      assert.match(r.last().message, /Waking up the server/);
      mock.timers.tick(DEFAULT_TIMEOUTS.serverConnectMs);
      assert.equal(r.last().status, 'error');
      assert.equal(r.last().message, MESSAGES.SERVER_UNREACHABLE);
      assert.equal(r.sock().disconnectCalls, 1);
    });

    test('server that finishes waking up in time: connects normally and never errors', () => {
      const r = rig();
      r.m.start();
      mock.timers.tick(45_000);
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      mock.timers.tick(DEFAULT_TIMEOUTS.serverConnectMs);
      assert.equal(r.errors().filter((e) => e.code === 'SERVER_UNREACHABLE').length, 0);
    });

    test('join request that is never acknowledged is retried, then fails', () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      for (let i = 1; i < DEFAULT_TIMEOUTS.maxJoinAttempts; i++) {
        mock.timers.tick(DEFAULT_TIMEOUTS.joinAckMs);
        assert.equal(r.sock().sent('client:join_session').length, i + 1);
      }
      mock.timers.tick(DEFAULT_TIMEOUTS.joinAckMs);
      assert.equal(r.last().message, MESSAGES.JOIN_TIMEOUT);
    });
  });

  // ── invalid / expired codes ────────────────────────────────────────────────────────────────────
  describe('session codes', () => {
    test('invalid or expired code on a warm server fails immediately with a clear message', () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND', retryable: false });
      assert.equal(r.last().status, 'error');
      assert.equal(r.last().message, MESSAGES.SESSION_NOT_FOUND);
      assert.equal(r.sock().sent('client:join_session').length, 1, 'no pointless retries');
    });

    test('older servers (no error code) are still understood', () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('error', { message: 'Session not found' });
      assert.equal(r.last().message, MESSAGES.SESSION_NOT_FOUND);
    });

    test('"not found" right after a server restart is retried while the host reconnects, then succeeds', () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND', retryable: true });
      assert.notEqual(r.last().status, 'error');
      mock.timers.tick(DEFAULT_TIMEOUTS.notFoundRetryIntervalMs);
      assert.equal(r.sock().sent('client:join_session').length, 2);
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      assert.equal(r.last().phase, 'waiting_host');
      assert.equal(r.errors().length, 0);
    });

    test('retryable "not found" gives up after the retry window', () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      const answerNotFound = () => r.sock().serverSend('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND', retryable: true });
      answerNotFound();
      for (let t = 0; t < DEFAULT_TIMEOUTS.notFoundRetryWindowMs + DEFAULT_TIMEOUTS.notFoundRetryIntervalMs && r.last().status !== 'error'; t += DEFAULT_TIMEOUTS.notFoundRetryIntervalMs) {
        mock.timers.tick(DEFAULT_TIMEOUTS.notFoundRetryIntervalMs);
        answerNotFound();
      }
      assert.equal(r.last().status, 'error');
      assert.equal(r.last().message, MESSAGES.SESSION_NOT_FOUND);
    });
  });

  // ── host / network interruptions ───────────────────────────────────────────────────────────────
  describe('reconnection', () => {
    test('host drops while we are waiting: shows reconnecting, resumes when it returns, fails if it never does', () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      r.sock().serverSend('session:host_offline', { graceMs: 20000 });
      assert.equal(r.last().status, 'reconnecting');
      assert.equal(r.last().phase, 'host_offline');
      r.sock().serverSend('session:host_reconnected', {});
      assert.equal(r.last().phase, 'waiting_host');

      r.sock().serverSend('session:host_offline', { graceMs: 20000 });
      mock.timers.tick(DEFAULT_TIMEOUTS.hostOfflineMs + 20000);
      assert.equal(r.last().status, 'error');
      assert.equal(r.last().message, MESSAGES.HOST_OFFLINE);
    });

    test('server says the session ended because the host did not return: final error (no retry storm)', () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      r.sock().serverSend('session:host_offline', { graceMs: 20000 });
      r.sock().serverSend('session:ended', { reason: 'Host agent disconnected' });
      assert.equal(r.last().message, MESSAGES.HOST_OFFLINE);
      assert.equal(r.sock().sent('client:join_session').length, 1);
    });

    test('legacy server (instant "Host agent disconnected", no grace): keeps re-joining for a while before giving up', () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      r.sock().serverSend('session:ended', { reason: 'Host agent disconnected' });
      assert.equal(r.last().status, 'reconnecting');
      mock.timers.tick(DEFAULT_TIMEOUTS.notFoundRetryIntervalMs);
      assert.equal(r.sock().sent('client:join_session').length, 2);
      // host comes back on the legacy server
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      assert.equal(r.last().phase, 'waiting_host');

      // ...or never does
      r.sock().serverSend('session:ended', { reason: 'Host agent disconnected' });
      let guard = 0;
      while (r.last().status !== 'error' && guard++ < 40) {
        mock.timers.tick(DEFAULT_TIMEOUTS.notFoundRetryIntervalMs);
        r.sock().serverSend('error', { message: 'Session not found' });
      }
      assert.equal(r.last().message, MESSAGES.HOST_OFFLINE);
    });

    test('another viewer took over the session: clear final message', () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      r.sock().serverSend('session:ended', { reason: 'Another viewer connected' });
      assert.equal(r.last().status, 'error');
      assert.equal(r.last().message, 'Connection closed: Another viewer connected');
    });

    test('signaling socket drops while the P2P link is up: UI is undisturbed and the link is kept (resume)', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer();
      r.peers[0].setState('connected');
      const statusCount = r.statuses.length;

      r.sock().connected = false;
      r.sock().serverSend('disconnect', 'transport close');
      assert.equal(r.statuses.length, statusCount, 'no UI change');
      assert.equal(r.peers[0].closed, false);

      r.sock().up(); // Socket.IO auto-reconnected
      const joins = r.sock().sent('client:join_session');
      assert.deepEqual(joins[joins.length - 1], { sessionId: '123456', clientId: 'tab-1', resume: true, peerState: 'connected', relay: false });
      r.sock().serverSend('client:joined_success', { hostOnline: true, resumed: true });
      assert.equal(r.statuses.length, statusCount);
      assert.equal(r.peers.length, 1);
      mock.timers.tick(5 * 60 * 1000);
      assert.equal(r.errors().length, 0);
    });

    test('server restarts while the P2P link is up: keeps retrying quietly, never errors, resumes once the host re-registers', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer();
      r.peers[0].setState('connected');
      const statusCount = r.statuses.length;

      r.sock().connected = false;
      r.sock().serverSend('disconnect', 'transport close'); // Render restarted
      r.sock().up();                                         // server is back, but its session map is empty
      r.sock().serverSend('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND', retryable: true });
      for (let i = 0; i < 40; i++) { // far beyond the normal "not found" retry window
        mock.timers.tick(DEFAULT_TIMEOUTS.notFoundRetryIntervalMs);
        r.sock().serverSend('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND', retryable: true });
      }
      assert.equal(r.statuses.length, statusCount, 'UI is never disturbed while media is flowing');
      assert.equal(r.errors().length, 0);
      assert.equal(r.peers[0].closed, false);
      const joins = r.sock().sent('client:join_session');
      const rejoins = joins.slice(1); // everything after the initial join
      assert.ok(rejoins.length > 10 && rejoins.every((j) => j.resume === true && j.peerState === 'connected'));

      r.sock().serverSend('client:joined_success', { hostOnline: true, resumed: true }); // host re-registered
      assert.equal(r.statuses.length, statusCount);
      mock.timers.tick(5 * 60 * 1000);
      assert.equal(r.errors().length, 0);
    });

    test('signaling socket drops mid-negotiation: the half-built peer is discarded and negotiation restarts cleanly', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer();
      r.sock().connected = false;
      r.sock().serverSend('disconnect', 'transport close');
      r.sock().up();
      assert.equal(r.peers[0].closed, true);
      const joins = r.sock().sent('client:join_session');
      assert.equal(joins[joins.length - 1].resume, false);
      assert.equal(joins[joins.length - 1].peerState, 'none');
    });

    test('server forcibly closes our socket: we reconnect instead of hanging', () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().connected = false;
      let reconnected = false;
      r.sock().connect = () => { reconnected = true; };
      r.sock().serverSend('disconnect', 'io server disconnect');
      assert.equal(reconnected, true);
    });

    test('peer "disconnected" that recovers within the grace period costs nothing', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer();
      r.peers[0].setState('connected');
      r.peers[0].setState('disconnected');
      mock.timers.tick(DEFAULT_TIMEOUTS.disconnectGraceMs - 1000);
      r.peers[0].setState('connected');
      mock.timers.tick(5 * 60 * 1000);
      assert.equal(r.peers[0].closed, false);
      assert.equal(r.last().status, 'connected');
      assert.equal(r.sock().sent('client:join_session').length, 1);
    });

    test('peer stays "disconnected": ICE restart on the SAME peer first, then a full renegotiation if that does not help', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer();
      r.peers[0].setState('connected');
      r.peers[0].setState('disconnected');
      mock.timers.tick(DEFAULT_TIMEOUTS.disconnectGraceMs);
      await flush();
      assert.equal(r.peers[0].closed, false, 'the same peer connection is kept for the restart');
      assert.equal(r.last().status, 'reconnecting');
      assert.equal(r.last().phase, 'ice_restart');
      assert.equal(r.sock().sent('client:join_session').length, 1, 'no renegotiation yet');
      const offers = r.sock().sent('signal:sdp').filter((s) => s.sdp.type === 'offer');
      assert.equal(offers.length, 1);
      assert.equal(offers[0].to, 'agent');
      assert.deepEqual(r.peers[0].offerOpts, [{ iceRestart: true }]);

      mock.timers.tick(DEFAULT_TIMEOUTS.iceRestartMs); // the restart did not bring the link back
      assert.equal(r.peers[0].closed, true);
      assert.equal(r.sock().sent('client:join_session').length, 2);

      r.sock().serverSend('client:joined_success', { hostOnline: true });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp('EE:EE') });
      await flush();
      r.peers[1].setState('connected');
      assert.equal(r.last().status, 'connected');
    });

    test('peer "failed": ICE restart immediately (no waiting), full renegotiation if it fails, a clear error if that fails too', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer();
      r.peers[0].setState('connected');
      r.peers[0].setState('failed');
      await flush();
      assert.equal(r.sock().sent('signal:sdp').filter((s) => s.sdp.type === 'offer').length, 1, 'ICE restart offer sent at once');
      assert.equal(r.sock().sent('client:join_session').length, 1);

      mock.timers.tick(DEFAULT_TIMEOUTS.iceRestartMs);
      assert.equal(r.sock().sent('client:join_session').length, 2, 'then a full renegotiation');
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp('FF:FF') });
      await flush();
      r.peers[1].setState('failed');
      await flush();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceRestartMs);
      assert.equal(r.last().status, 'error');
      assert.equal(r.last().message, MESSAGES.PEER_LOST);
    });
  });

  // ── ICE restart on an established link ──────────────────────────────────────────────────────────
  describe('ICE restart: the first recovery step for a lost link (network change, Wi-Fi <-> mobile)', () => {
    const offerWithUfrag = (ufrag, fp = 'AA:BB:CC') => ({ type: 'offer', sdp: `v=0\r\na=ice-ufrag:${ufrag}\r\na=fingerprint:sha-256 ${fp}\r\n` });
    const answerWithUfrag = (ufrag, fp = 'AA:BB:CC') => ({ type: 'answer', sdp: `v=0\r\na=ice-ufrag:${ufrag}\r\na=fingerprint:sha-256 ${fp}\r\n` });

    async function connectedRig() {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      r.sock().serverSend('signal:sdp', { sdp: offerWithUfrag('OLD1') });
      await flush();
      r.peers[0].setState('connected');
      return r;
    }

    test('success: the host answers the restart, the SAME peer reconnects, nothing is renegotiated', async () => {
      const r = await connectedRig();
      r.peers[0].setState('failed');
      await flush();
      assert.equal(r.last().phase, 'ice_restart');

      r.sock().serverSend('signal:sdp', { sdp: answerWithUfrag('NEW2') });
      await flush();
      assert.equal(r.peers[0].remote.type, 'answer', 'the answer was applied to the existing peer');
      r.peers[0].setState('connected');
      assert.equal(r.last().status, 'connected');
      assert.equal(r.peers.length, 1);
      assert.equal(r.peers[0].closed, false);
      assert.equal(r.sock().sent('client:join_session').length, 1);
      mock.timers.tick(10 * 60 * 1000);
      assert.equal(r.errors().length, 0);
      assert.equal(r.sock().sent('client:join_session').length, 1, 'the restart timer was cancelled');
    });

    test('candidates with the new ICE ufrag that arrive BEFORE the answer are buffered and applied after it; old-ufrag ones are dropped', async () => {
      const r = await connectedRig();
      r.peers[0].setState('failed');
      await flush();
      r.sock().serverSend('signal:ice', { candidate: { candidate: 'candidate:new-early', usernameFragment: 'NEW2' } });
      r.sock().serverSend('signal:ice', { candidate: { candidate: 'candidate:old-late', usernameFragment: 'OLD1' } });
      await flush();
      assert.deepEqual(r.peers[0].candidates.map((c) => c.candidate), ['candidate:old-late'], 'new-ufrag candidate must wait for the answer');
      r.sock().serverSend('signal:sdp', { sdp: answerWithUfrag('NEW2') });
      await flush();
      assert.ok(r.peers[0].candidates.some((c) => c.candidate === 'candidate:new-early'), 'buffered candidate applied after the answer');
      r.sock().serverSend('signal:ice', { candidate: { candidate: 'candidate:old-after', usernameFragment: 'OLD1' } });
      await flush();
      assert.ok(!r.peers[0].candidates.some((c) => c.candidate === 'candidate:old-after'), 'stale (old ufrag) candidates are no longer applied');
    });

    test('a restart issued while the network is still down is re-issued until the link returns (then no more offers)', async () => {
      const r = await connectedRig();
      r.peers[0].setState('failed');
      await flush();
      assert.equal(r.peers[0].offerOpts.length, 1);
      r.sock().serverSend('signal:sdp', { sdp: answerWithUfrag('NEW1') }); // host answered, but the network is still down
      await flush();

      mock.timers.tick(DEFAULT_TIMEOUTS.iceRestartRetryMs);
      await flush();
      assert.equal(r.peers[0].offerOpts.length, 2, 'second ICE restart while still down');
      assert.deepEqual(r.peers[0].offerOpts[1], { iceRestart: true });
      assert.equal(r.sock().sent('client:join_session').length, 1, 'still no renegotiation');

      r.sock().serverSend('signal:sdp', { sdp: answerWithUfrag('NEW2') });
      await flush();
      r.peers[0].setState('connected'); // network is back
      mock.timers.tick(60 * 1000);
      await flush();
      assert.equal(r.peers[0].offerOpts.length, 2, 'no further restarts after success');
      assert.equal(r.last().status, 'connected');
      assert.equal(r.errors().length, 0);
    });

    test('a restart is not stacked on top of one the host has not answered yet; the overall window still ends in a renegotiation', async () => {
      const r = await connectedRig();
      r.peers[0].setState('failed');
      await flush();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceRestartRetryMs * 3);
      await flush();
      assert.equal(r.peers[0].offerOpts.length, 1, 'no answer yet: no second offer');
      mock.timers.tick(DEFAULT_TIMEOUTS.iceRestartMs);
      assert.equal(r.sock().sent('client:join_session').length, 2, 'window exhausted: full renegotiation');
      assert.equal(r.peers[0].closed, true);
    });

    test('a "failed" event while the restart is in flight does not abort it', async () => {
      const r = await connectedRig();
      r.peers[0].setState('failed');
      await flush();
      r.peers[0].setState('failed');
      r.peers[0].setState('disconnected');
      assert.equal(r.sock().sent('client:join_session').length, 1, 'still waiting for the restart');
      assert.equal(r.peers[0].closed, false);
      r.sock().serverSend('signal:sdp', { sdp: answerWithUfrag('NEW2') });
      await flush();
      r.peers[0].setState('connected');
      assert.equal(r.last().status, 'connected');
    });

    test('never attempted before the link has been established once (initial failures use the normal retry / relay fallback)', async () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp() });
      await flush();
      r.peers[0].setState('failed');
      assert.equal(r.peers[0].offerOpts.length, 0, 'no ICE restart offer');
      assert.equal(r.sock().sent('client:join_session').length, 2, 'renegotiates through the host instead');
    });

    test('restart fails to produce an offer: falls straight back to a full renegotiation', async () => {
      const r = await connectedRig();
      r.peers[0].createOffer = async () => { throw new Error('createOffer failed'); };
      r.peers[0].setState('failed');
      await flush();
      assert.equal(r.sock().sent('client:join_session').length, 2);
      assert.equal(r.peers[0].closed, true);
    });

    test('signaling socket is down: no restart offer is attempted, recovery waits for the reconnect', async () => {
      const r = await connectedRig();
      r.sock().connected = false;
      r.sock().serverSend('disconnect', 'transport close');
      r.peers[0].setState('failed');
      await flush();
      assert.equal(r.peers[0].offerOpts.length, 0);
    });

    test('an answer with no outstanding offer (or from a rebuilt host) is ignored', async () => {
      const r = await connectedRig();
      r.sock().serverSend('signal:sdp', { sdp: answerWithUfrag('ZZZ') });
      await flush();
      assert.equal(r.peers[0].remote.type, 'offer', 'untouched');

      r.peers[0].setState('failed');
      await flush();
      r.sock().serverSend('signal:sdp', { sdp: answerWithUfrag('NEW9', 'DE:AD:BE') }); // different DTLS fingerprint
      await flush();
      assert.equal(r.peers[0].remote.type, 'offer', 'answer from a different host peer is not applied');
    });

    test('the recovery path is reported to the server logs (method, relay flag)', async () => {
      const r = await connectedRig();
      r.peers[0].setState('failed');
      await flush();
      const rec = r.sock().sent('peer:diag').find((d) => d.event === 'recovery');
      assert.equal(rec.method, 'ice_restart');
      assert.equal(rec.reason, 'PEER_LOST');
    });
  });

  // ── meaningful diagnostics when every path fails ────────────────────────────────────────────────
  describe('diagnosis when all connection paths fail', () => {
    const cand = (type) => ({ candidate: `candidate:1 1 udp 1 10.0.0.1 5000 typ ${type}`, type });

    async function failedRig({ relayAvailable, gatherPerAttempt }) {
      const r = rig();
      r.m.start();
      r.sock().up();
      let attempt = 0;
      const offerAndGather = async () => {
        r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable, iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        r.sock().serverSend('signal:sdp', { sdp: offerSdp(`F${attempt}:00`) });
        await flush();
        const peer = r.peers[r.peers.length - 1];
        gatherPerAttempt[Math.min(attempt, gatherPerAttempt.length - 1)](peer);
        attempt += 1;
      };
      await offerAndGather();
      mock.timers.tick(relayAvailable ? DEFAULT_TIMEOUTS.iceDirectMs : DEFAULT_TIMEOUTS.iceMs);
      await offerAndGather();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceMs);
      return r;
    }

    test('only host candidates (no STUN address): says UDP appears blocked', async () => {
      const r = await failedRig({ relayAvailable: false, gatherPerAttempt: [(p) => p.onicecandidate({ candidate: cand('host') })] });
      assert.equal(r.last().status, 'error');
      assert.match(r.last().detail, /UDP traffic appears to be blocked/);
      assert.match(r.last().technical, /srflx=0/);
    });

    test('STUN address found but no direct path and no relay configured: says so', async () => {
      const r = await failedRig({ relayAvailable: false, gatherPerAttempt: [(p) => { p.onicecandidate({ candidate: cand('host') }); p.onicecandidate({ candidate: cand('srflx') }); }] });
      assert.match(r.last().detail, /no relay server is configured/);
      assert.match(r.last().technical, /relay=not-configured/);
    });

    test('relay tried but TURN gave no address (unreachable / bad credentials): names the relay and its error codes', async () => {
      const r = await failedRig({
        relayAvailable: true,
        gatherPerAttempt: [
          (p) => { p.onicecandidate({ candidate: cand('host') }); p.onicecandidate({ candidate: cand('srflx') }); },
          (p) => { p.onicecandidate({ candidate: cand('host') }); p.onicecandidate({ candidate: cand('srflx') }); p.onicecandidateerror({ url: 'turns:turn.example.com:443', errorCode: 401 }); p.onicecandidateerror({ url: 'stun:stun.l.google.com:19302', errorCode: 701 }); },
        ],
      });
      assert.equal(r.last().message, MESSAGES.ICE_FAILED_RELAY);
      assert.match(r.last().detail, /did not provide an address/);
      assert.match(r.last().technical, /relay=tried/);
      assert.match(r.last().technical, /relay-errors=turns:443=401/);
      assert.ok(!/701/.test(r.last().technical), 'routine STUN lookup noise is not reported');
    });

    test('relay allocated but the host still unreachable: says so', async () => {
      const r = await failedRig({
        relayAvailable: true,
        gatherPerAttempt: [
          (p) => { p.onicecandidate({ candidate: cand('host') }); p.onicecandidate({ candidate: cand('srflx') }); },
          (p) => { p.onicecandidate({ candidate: cand('host') }); p.onicecandidate({ candidate: cand('relay') }); },
        ],
      });
      assert.match(r.last().detail, /host could not be reached through the relay/);
      assert.match(r.last().technical, /relay=1/);
    });

    test('the diagnosis is also reported to the server logs, with counts only', async () => {
      const r = await failedRig({ relayAvailable: false, gatherPerAttempt: [(p) => p.onicecandidate({ candidate: cand('host') })] });
      const failed = r.sockets[0].sent('peer:diag').find((d) => d.event === 'failed');
      assert.equal(failed.candHost, 2);
      assert.equal(failed.candSrflx, 0);
      assert.equal(failed.candRelay, 0);
      assert.ok(!JSON.stringify(failed).includes('10.0.0.1'), 'no addresses are reported');
    });

    test('non-connectivity failures carry no network diagnosis', () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      mock.timers.tick(DEFAULT_TIMEOUTS.offerMs);
      r.sock().serverSend('client:joined_success', { hostOnline: true });
      mock.timers.tick(DEFAULT_TIMEOUTS.offerMs);
      assert.equal(r.last().message, MESSAGES.HOST_NO_RESPONSE);
      assert.equal(r.last().detail, '');
    });

    test('the transport that carried the media (udp / tcp / tls) is reported for a relayed pair', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer();
      r.peers[0].statsMap = new Map([
        ['T', { id: 'T', type: 'transport', selectedCandidatePairId: 'P' }],
        ['P', { id: 'P', type: 'candidate-pair', localCandidateId: 'L', remoteCandidateId: 'R' }],
        ['L', { id: 'L', type: 'local-candidate', candidateType: 'relay', protocol: 'udp', relayProtocol: 'tls' }],
        ['R', { id: 'R', type: 'remote-candidate', candidateType: 'host' }],
      ]);
      r.peers[0].setState('connected');
      await flush();
      const sel = r.sock().sent('peer:diag').find((d) => d.event === 'selected_pair');
      assert.equal(sel.pairType, 'relay<->host');
      assert.equal(sel.relayProtocol, 'tls');
    });
  });

  // ── TURN is optional and fallback-only ──────────────────────────────────────────────────────────
  describe('TURN relay: optional, used only as a fallback after a direct attempt fails', () => {
    const STUN_ONLY = [{ urls: 'stun:stun.l.google.com:19302' }];
    const WITH_TURN = [...STUN_ONLY, { urls: 'turn:turn.example.com:3478', username: 'u', credential: 'p' }];

    test('first attempt never asks for a relay, even when the server has one: direct-only, exactly the TURN-free behaviour', async () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable: true, relay: false, iceServers: STUN_ONLY });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp() });
      await flush();
      assert.equal(r.sock().sent('client:join_session')[0].relay, false);
      assert.deepEqual(r.peers[0].cfg.iceServers, STUN_ONLY, 'the peer connection has no TURN server on the direct attempt');
    });

    test('direct connection succeeds: relay is never requested and no timer ever escalates', async () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable: true, iceServers: STUN_ONLY });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp() });
      await flush();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceDirectMs - 1000);
      r.peers[0].setState('connected');
      mock.timers.tick(10 * 60 * 1000);
      assert.equal(r.sock().sent('client:join_session').length, 1);
      assert.equal(r.last().status, 'connected');
    });

    test('direct attempt fails quickly (short timeout) and the relay is requested for the next attempt, which then connects', async () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable: true, iceServers: STUN_ONLY });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp() });
      await flush();

      mock.timers.tick(DEFAULT_TIMEOUTS.iceDirectMs);
      assert.equal(r.peers[0].closed, true);
      const joins = r.sock().sent('client:join_session');
      assert.equal(joins.length, 2);
      assert.equal(joins[1].relay, true, 'fallback: relay requested');
      assert.equal(joins[1].resume, false);
      assert.match(r.last().message, /relay/i);
      assert.equal(r.errors().length, 0, 'not an error: the fallback is automatic');

      r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable: true, relay: true, iceServers: WITH_TURN });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp('R1:R1') });
      await flush();
      assert.deepEqual(r.peers[1].cfg.iceServers, WITH_TURN, 'the retry peer includes the TURN server');
      r.peers[1].setState('connected');
      assert.equal(r.last().status, 'connected');
      assert.equal(r.errors().length, 0);
    });

    test('relay attempt also fails (e.g. bad TURN credentials): ends in a clear relay-specific error, never a spinner', async () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable: true, iceServers: STUN_ONLY });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp() });
      await flush();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceDirectMs);
      r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable: true, relay: true, iceServers: WITH_TURN });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp('R2:R2') });
      await flush();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceMs); // the relay attempt is given the patient timeout
      assert.equal(r.last().status, 'error');
      assert.equal(r.last().message, MESSAGES.ICE_FAILED_RELAY);
      assert.equal(r.sock().sent('client:join_session').length, 2, 'no third attempt');
    });

    test('no relay configured on the server: never requests one, waits the patient timeout for the direct attempt, then reports a direct-connectivity error', async () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable: false, iceServers: STUN_ONLY });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp() });
      await flush();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceDirectMs + 1000);
      assert.equal(r.sock().sent('client:join_session').length, 1, 'a slow-but-working direct attempt is not interrupted at the short timeout');
      assert.equal(r.peers[0].closed, false);

      mock.timers.tick(DEFAULT_TIMEOUTS.iceMs); // direct attempt exhausted its patient timeout
      assert.ok(r.sock().sent('client:join_session').every((j) => j.relay === false), 'relay is never requested');
      r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable: false, iceServers: STUN_ONLY });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp('N1:N1') });
      await flush();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceMs);
      assert.equal(r.last().status, 'error');
      assert.equal(r.last().message, MESSAGES.ICE_FAILED);
      assert.match(r.last().message, /optional relay/i);
    });

    test('a host that never answers does not trigger the relay (it is a connectivity fallback, not a retry hammer)', () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable: true, iceServers: STUN_ONLY });
      mock.timers.tick(DEFAULT_TIMEOUTS.offerMs);
      r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable: true, iceServers: STUN_ONLY });
      mock.timers.tick(DEFAULT_TIMEOUTS.offerMs);
      assert.equal(r.last().message, MESSAGES.HOST_NO_RESPONSE);
      assert.ok(r.sock().sent('client:join_session').every((j) => j.relay === false));
    });

    test('an established direct link that dies (network change) is recovered through the relay when one exists', async () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable: true, iceServers: STUN_ONLY });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp() });
      await flush();
      r.peers[0].setState('connected');
      r.peers[0].setState('failed');
      await flush();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceRestartMs); // ICE restart first; the relay comes with the renegotiation
      const joins = r.sock().sent('client:join_session');
      assert.equal(joins[joins.length - 1].relay, true);
    });

    test('starting a new session resets the relay decision (a fresh connection is direct-first again)', async () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable: true, iceServers: STUN_ONLY });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp() });
      await flush();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceDirectMs); // fell back to relay
      assert.equal(r.sock().sent('client:join_session')[1].relay, true);

      r.m.start();
      r.sock().up();
      assert.equal(r.sock().sent('client:join_session')[0].relay, false);
    });

    test('server logs see the fallback decision via diagnostics', async () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true, relayAvailable: true, iceServers: STUN_ONLY });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp() });
      await flush();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceDirectMs);
      const rec = r.sock().sent('peer:diag').find((d) => d.event === 'recovery');
      assert.ok(rec);
      assert.equal(rec.relay, true);
      assert.equal(rec.reason, 'ICE_FAILED');
    });
  });

  // ── duplicate listeners / stale sockets ────────────────────────────────────────────────────────
  describe('cleanup', () => {
    test('start() twice never leaves two live sockets: the first is closed and its listeners removed', () => {
      const r = rig();
      r.m.start();
      const first = r.sock();
      first.up();
      r.m.start();
      assert.equal(r.sockets.length, 2);
      assert.equal(first.disconnectCalls, 1);
      assert.equal(first.listenerCount(), 0);
      const statusCount = r.statuses.length;
      first.serverSend('client:joined_success', { hostOnline: true }); // late event from the dead socket
      first.serverSend('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND' });
      assert.equal(r.statuses.length, statusCount, 'events from a stale socket are ignored');
    });

    test('disconnect() (Back to Home / unmount): leaves the session, closes socket + peer, removes listeners, is idempotent', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer();
      const socket = r.sock();
      r.m.disconnect();
      r.m.disconnect();
      assert.equal(socket.sent('client:leave_session').length, 1);
      assert.equal(socket.disconnectCalls, 1);
      assert.equal(socket.listenerCount(), 0);
      assert.equal(r.peers[0].closed, true);

      const before = r.statuses.length;
      mock.timers.tick(10 * 60 * 1000);
      socket.serverSend('signal:sdp', { sdp: offerSdp() });
      await flush();
      assert.equal(r.statuses.length, before, 'no status updates after disconnect');
      assert.equal(r.peers.length, 1, 'no peers created after disconnect');
    });

    test('a late answer/ICE for a peer that was replaced does not touch the new peer', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer({ fp: 'AA:AA' });
      r.sock().serverSend('signal:sdp', { sdp: offerSdp('BB:BB') });
      await flush();
      assert.equal(r.peers.length, 2);
      r.peers[0].onicecandidate && r.peers[0].onicecandidate({ candidate: { candidate: 'stale' } });
      assert.equal(r.sock().sent('signal:ice').length, 0, 'closed peers cannot emit ICE');
    });
  });

  // ── logging & diagnostics ──────────────────────────────────────────────────────────────────────
  describe('logging', () => {
    test('structured lifecycle logs exist, and never contain SDP bodies, IP addresses or the full session code', async () => {
      const r = rig();
      r.m.start();
      r.sock().up();
      r.sock().serverSend('client:joined_success', { hostOnline: true, iceServers: TURN_LIST });
      r.sock().serverSend('signal:sdp', { sdp: { type: 'offer', sdp: 'v=0\r\na=fingerprint:sha-256 AA:BB\r\no=SECRET_SDP_BODY 198.51.100.7\r\n' } });
      await flush();
      r.peers[0].onicecandidate({ candidate: { candidate: 'candidate:1 1 udp 1 203.0.113.9 5000 typ srflx', type: 'srflx' } });
      r.peers[0].setState('connected');
      await flush();

      const events = new Set(r.logs.map((l) => l.e));
      for (const expected of ['connect_start', 'socket_connected', 'join_sent', 'joined', 'waiting_for_peer', 'offer_received', 'answer_sent', 'ice_candidate_sent', 'connection_state', 'connection_established']) {
        assert.ok(events.has(expected), `missing log event ${expected}`);
      }
      const text = JSON.stringify(r.logs);
      for (const forbidden of ['SECRET_SDP_BODY', '198.51.100.7', '203.0.113.9', '123456', 'credential', '"p"']) {
        assert.ok(!text.includes(forbidden), `log leaked ${forbidden}`);
      }
      assert.ok(r.logs.every((l) => l.f.session === '12****'));
    });

    test('lifecycle events and failure reasons are reported to the server for the Render logs', async () => {
      const r = rig();
      r.m.start();
      await r.joinAndOffer();
      r.peers[0].setState('connected');
      mock.timers.tick(0);
      const diag = r.sock().sent('peer:diag');
      const names = diag.map((d) => d.event);
      for (const expected of ['joined', 'offer_received', 'answer_sent', 'connection_state', 'connected']) {
        assert.ok(names.includes(expected), `missing diag ${expected}`);
      }
      assert.ok(diag.every((d) => d.sessionId === '123456'));

      // failure path
      const r2 = rig();
      r2.m.start();
      await r2.joinAndOffer();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceMs);
      r2.sock().serverSend('client:joined_success', { hostOnline: true });
      r2.sock().serverSend('signal:sdp', { sdp: offerSdp('99:99') });
      await flush();
      mock.timers.tick(DEFAULT_TIMEOUTS.iceMs);
      const failed = r2.sockets[0].sent('peer:diag').find((d) => d.event === 'failed');
      assert.ok(failed, 'failure is reported');
      assert.equal(failed.code, 'ICE_FAILED');
    });
  });
});
