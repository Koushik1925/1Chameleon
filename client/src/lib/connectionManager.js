/**
 * ConnectionManager — owns the signaling socket and the RTCPeerConnection for ONE viewer session.
 *
 * Why this exists (see the investigation notes in the PR description):
 *  - The UI used to sit on "Establishing Link..." forever: there was no timeout or failure state for
 *    "host never sent an offer" or "ICE never connected", and Socket.IO connect errors (a Render cold
 *    start) were invisible.
 *  - Re-joins (socket reconnect, Retry button, host restart) reused a stale RTCPeerConnection, so a new
 *    offer from a rebuilt host peer could never be applied.
 *  - Listeners/sockets were never cleaned up (the cleanup returned by handleJoinSession was discarded),
 *    so "Back to Home", Retry and React re-mounts left ghost sockets attached to the session.
 *
 * The manager is framework-agnostic (no React, no globals except timers) so it can be unit-tested with
 * fake sockets / peer connections. Everything the UI needs arrives through `hooks`.
 *
 * TURN is optional and FALLBACK-ONLY: the first attempt always uses plain STUN (the app's original,
 * TURN-free behaviour). Only if that direct attempt fails AND the server reports a relay is configured does
 * the next attempt ask for it ({ relay: true } on the join), and the server then adds it for both peers.
 *
 * Recovery ladder for an ESTABLISHED link that is lost (network change, Wi-Fi <-> mobile, NAT rebind):
 *   1. ICE restart on the SAME peer connection (viewer sends an iceRestart offer; the host answers it).
 *      Keeps the DTLS session, tracks and data channels, and works with every deployed agent version.
 *   2. Full renegotiation through the host (new peer on both sides; the relay is added if one exists).
 *   3. A clear error with a diagnosis of WHICH paths were tried and why none worked.
 *
 * Phases while status === 'connecting':
 *   server -> joining -> waiting_host -> negotiating   (and 'retrying', 'server_wake', 'host_offline')
 */

// Only servers verified reachable. The signaling server sends the authoritative list (including TURN)
// with the join acknowledgement; this is the fallback if it ever does not.
export const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

export const DEFAULT_TIMEOUTS = {
  serverConnectMs: 90000,        // Render free instances can take ~1 min to wake
  coldStartHintMs: 4000,         // show the "waking up" explanation after this long without a socket
  joinAckMs: 10000,
  maxJoinAttempts: 3,
  notFoundRetryWindowMs: 20000,  // "session not found" right after a server restart: the host is still reconnecting
  notFoundRetryIntervalMs: 2000,
  legacyHostGoneRetryMs: 30000,  // servers without a grace period end the session at once; keep retrying
  offerMs: 15000,                // joined, host online, but no offer
  iceDirectMs: 12000,            // direct attempt when a relay fallback exists: direct paths connect within seconds
  iceMs: 30000,                  // answer sent but never "connected" (no fallback to try, or the relay attempt): be patient
  disconnectGraceMs: 6000,       // 'disconnected' is often transient; give ICE time to recover
  iceRestartMs: 20000,           // total time ICE restarts get to bring the link back, else renegotiate fully
  iceRestartRetryMs: 5000,       // a restart issued while the network is still down finds nothing: re-issue it this often
  hostOfflineMs: 45000,          // wait for a host that dropped (server grace is 20s)
  maxNegotiationAttempts: 2,     // initial attempt + one full renegotiation
};

export const MESSAGES = {
  SERVER_UNREACHABLE: 'Could not reach the signaling server. It may be starting up or offline — please try again in a minute.',
  JOIN_TIMEOUT: 'The signaling server did not respond to the join request. Please retry.',
  SESSION_NOT_FOUND: 'Session not found. The code is invalid or has expired — check the code shown on the host device.',
  HOST_NO_RESPONSE: 'The host device did not respond. Make sure the Chameleon desktop agent is running, online and allowed to capture the screen.',
  ICE_FAILED: 'Could not establish a direct peer-to-peer connection with the host. One or both devices may be on a restrictive network (for example a mobile carrier or corporate NAT). An optional relay (TURN) server on the signaling server would let such networks connect.',
  ICE_FAILED_RELAY: 'Could not connect to the host, even through the relay server. Check that both devices are online and that the relay (TURN) credentials configured on the signaling server are valid.',
  PEER_LOST: 'Peer connection lost and could not be recovered.',
  HOST_OFFLINE: 'Connection lost permanently. Host is offline.',
  SDP_ERROR: 'The secure handshake with the host failed.',
};

const defaultLogger = {
  info: (event, fields) => console.info('[Chameleon]', event, JSON.stringify(fields || {})),
  warn: (event, fields) => console.warn('[Chameleon]', event, JSON.stringify(fields || {})),
  error: (event, fields) => console.error('[Chameleon]', event, JSON.stringify(fields || {})),
};

// The session code is the join credential for a remote desktop: never put it in logs in full.
const maskSession = (id) => {
  const s = String(id == null ? '' : id);
  return s.length <= 2 ? '**' : s.slice(0, 2) + '*'.repeat(Math.min(s.length - 2, 6));
};

/** DTLS fingerprint of an SDP: changes whenever the remote side builds a brand-new RTCPeerConnection. */
export function extractFingerprint(sdp) {
  const m = /^a=fingerprint:(\S+\s+\S+)/m.exec(sdp || '');
  return m ? m[1].toUpperCase() : null;
}

/** ICE username fragment of an SDP: identifies which host peer a trickled candidate belongs to. */
export function extractIceUfrag(sdp) {
  const m = /^a=ice-ufrag:(\S+)/m.exec(sdp || '');
  return m ? m[1] : null;
}

const MAX_QUEUED_CANDIDATES = 200;

const randomId = () => {
  try {
    if (globalThis.crypto && globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  } catch { /* fall through */ }
  return 'c-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
};

export class ConnectionManager {
  /**
   * @param {object} opts
   * @param {string} opts.signalingUrl
   * @param {string} opts.sessionId
   * @param {Function} opts.ioFactory       (url, options) => socket   (socket.io-client's `io`)
   * @param {Function} [opts.rtcFactory]    (config) => RTCPeerConnection
   * @param {object} [opts.hooks]           onStatus, onPeer, onPeerConnected, onPeerClosed
   * @param {object} [opts.timeouts]        overrides for DEFAULT_TIMEOUTS
   * @param {string} [opts.clientId]        stable per-tab viewer id
   */
  constructor({ signalingUrl, sessionId, ioFactory, rtcFactory, hooks = {}, timeouts = {}, logger = defaultLogger, clientId, now = () => Date.now() }) {
    this.signalingUrl = signalingUrl;
    this.sessionId = String(sessionId);
    this.ioFactory = ioFactory;
    this.rtcFactory = rtcFactory || ((cfg) => new RTCPeerConnection(cfg));
    this.hooks = hooks;
    this.cfg = { ...DEFAULT_TIMEOUTS, ...timeouts };
    this.logger = logger;
    this.clientId = clientId || randomId();
    this.now = now;

    this.gen = 0;
    this.destroyed = false;
    this.finished = false;
    this.socket = null;
    this.peer = null;
    this.timers = {};
    this.iceServers = DEFAULT_ICE_SERVERS;
    this.iceQueue = [];
    this.remoteDescSet = false;
    this.remoteFingerprint = null;
    this.remoteUfrag = null;
    this.relayAvailable = false; // server has an optional TURN relay configured
    this.useRelay = false;       // request it (fallback) - only after a direct attempt failed
    this.iceRestartTried = false; // one ICE restart per loss of an established link
    this.gatherLog = [];          // per-peer candidate gathering summary, for the failure diagnosis
    this.remoteCands = { received: 0, applied: 0, rejected: 0, duplicates: 0, seen: new Set() }; // candidates FROM the host
    this.socketEverConnected = false;
    this.joined = false;
    this.joinAttempts = 0;
    this.attempts = 0;
    this.connectedOnce = false;
    this.notFoundDeadline = null;
    this.legacyRetryDeadline = null;
    this.sawHostOffline = false;
    this.lastStatusKey = '';
    this.startedAt = 0;
  }

  // ── public API ────────────────────────────────────────────────────────────────────────────────

  /** Begin (or restart) the connection. Safe to call repeatedly: any previous socket/peer is disposed first. */
  start() {
    if (this.destroyed) return;
    this.gen += 1;
    this.finished = false;
    this.clearAllTimers();
    this.teardownSocket(false);
    this.teardownPeer();
    this.iceQueue = [];
    this.relayAvailable = false;
    this.useRelay = false;
    this.iceRestartTried = false;
    this.gatherLog = [];
    this.remoteCands = { received: 0, applied: 0, rejected: 0, duplicates: 0, seen: new Set() };
    this.joined = false;
    this.joinAttempts = 0;
    this.attempts = 0;
    this.connectedOnce = false;
    this.socketEverConnected = false;
    this.notFoundDeadline = null;
    this.legacyRetryDeadline = null;
    this.sawHostOffline = false;
    this.lastStatusKey = '';
    this.startedAt = this.now();

    this.log('info', 'connect_start', {});
    this.setStatus('connecting', 'server', 'Contacting signaling server…');

    // NB: Socket.IO v4 ignores client-side pingInterval/pingTimeout (the server dictates them), so none are passed.
    const socket = this.ioFactory(this.signalingUrl, { reconnectionDelayMax: 5000 });
    this.socket = socket;
    this.bindSocket(socket, this.gen);

    this.setTimer('serverConnect', this.cfg.serverConnectMs, () => {
      this.fail('SERVER_UNREACHABLE', MESSAGES.SERVER_UNREACHABLE);
    });
    this.setTimer('coldStartHint', this.cfg.coldStartHintMs, () => {
      if (!socket.connected) {
        this.setStatus('connecting', 'server_wake', 'Waking up the server — free hosting instances can take up to a minute…');
      }
    });
  }

  /**
   * Viewer aborts / component unmounts / page is closing. Idempotent; leaves nothing behind.
   * This is the ONLY place that logs `disconnected_by_viewer`, and it is final: the peer connection (and both
   * input data channels inside it) is closed for good. `reason` says who asked: 'user' (Disconnect / Cancel),
   * 'unmount' (the viewer route was left, e.g. browser Back), 'pagehide' (real unload / refresh), 'replaced'
   * (a new session is starting).
   */
  disconnect(reason = 'viewer') {
    if (this.destroyed) return;
    this.destroyed = true;
    this.gen += 1;
    this.clearAllTimers();
    this.teardownSocket(true);
    this.teardownPeer();
    this.log('info', 'disconnected_by_viewer', { reason });
  }

  /**
   * The page is visible / online / restored again. Mobile browsers throttle timers in the background, so a
   * link that dropped meanwhile would wait for stale grace timers: start recovery now instead. Never ends or
   * rebuilds a healthy session.
   */
  resume(trigger) {
    if (this.destroyed || this.finished) return;
    this.log('info', 'resume', { trigger });
    const socket = this.socket;
    if (socket && !socket.connected) {
      socket.connect(); // no-op while Socket.IO is already (re)connecting; the 'connect' handler re-joins
      return;
    }
    const peer = this.peer;
    if (!peer || !this.connectedOnce) return;
    const state = peer.connectionState;
    if (state !== 'disconnected' && state !== 'failed') return; // healthy (or still negotiating): leave it alone
    this.clearTimer('disconnect');
    if (this.timers.iceRestart) return; // a restart is already in flight
    this.recoverPeer('PEER_LOST');
  }

  getPeer() { return this.peer; }
  getSocket() { return this.socket; }

  // ── socket wiring ─────────────────────────────────────────────────────────────────────────────

  bindSocket(socket, gen) {
    // Every handler is bound to a generation: late callbacks from a disposed attempt are ignored.
    const on = (event, handler) => socket.on(event, (...args) => {
      if (gen !== this.gen || this.destroyed) return;
      handler(...args);
    });

    on('connect', () => this.onSocketConnect());
    on('connect_error', (err) => this.log('warn', 'socket_connect_error', { message: err && err.message }));
    on('disconnect', (reason) => this.onSocketDisconnect(reason, socket));
    on('client:joined_success', (info) => this.onJoined(info || {}));
    on('error', (err) => this.onServerError(err || {}));
    on('session:ended', (data) => this.onSessionEnded((data && data.reason) || 'Session ended'));
    on('session:host_offline', (data) => this.onHostOffline(data || {}));
    on('session:host_reconnected', () => this.onHostReconnected());
    on('signal:sdp', (data) => {
      this.onRemoteSdp(data && data.sdp).catch((e) => this.log('error', 'sdp_handler_crashed', { message: e && e.message }));
    });
    on('signal:ice', (data) => this.onRemoteIce(data && data.candidate));
    on('signal:undeliverable', (data) => this.log('warn', 'signal_undeliverable', { reason: data && data.reason, event: data && data.event }));
    // Cloud-relay frames (RemoteView renders them directly from the socket): flip to connected on the first one.
    on('relay:frame', () => { if (!this.finished) this.markConnected('relay'); });
  }

  onSocketConnect() {
    const reconnect = this.socketEverConnected;
    this.socketEverConnected = true;
    this.clearTimer('serverConnect');
    this.clearTimer('coldStartHint');
    this.log('info', reconnect ? 'socket_reconnected' : 'socket_connected', {});

    const peerUp = !!this.peer && this.peer.connectionState === 'connected';
    if (reconnect && !peerUp) {
      // Any negotiation that was in flight was addressed to our previous socket id: start over cleanly.
      this.clearTimer('offer');
      this.clearTimer('ice');
      this.teardownPeer();
    }
    this.sendJoin({ resume: reconnect && peerUp });
  }

  onSocketDisconnect(reason, socket) {
    this.log('warn', 'socket_disconnected', { reason });
    this.joined = false;
    this.clearTimer('joinAck');
    if (reason === 'io server disconnect') socket.connect(); // server closed us: Socket.IO will not retry by itself
    if (this.peer && this.peer.connectionState === 'connected') return; // media does not need the signaling socket
    this.clearTimer('offer');
    this.setStatus(this.connectedOnce ? 'reconnecting' : 'connecting', 'server', 'Reconnecting to the signaling server…');
    this.setTimer('serverConnect', this.cfg.serverConnectMs, () => this.fail('SERVER_UNREACHABLE', MESSAGES.SERVER_UNREACHABLE));
  }

  sendJoin({ resume = false, quiet = false } = {}) {
    if (!this.socket) return;
    const peerState = this.peer ? this.peer.connectionState : 'none';
    if (!quiet) {
      this.setStatus(this.connectedOnce && !resume ? 'reconnecting' : 'connecting', 'joining', 'Joining session…', { keepConnected: resume });
    }
    this.socket.emit('client:join_session', { sessionId: this.sessionId, clientId: this.clientId, resume, peerState, relay: this.useRelay });
    this.log('info', 'join_sent', { resume, peerState, relay: this.useRelay });
    this.setTimer('joinAck', this.cfg.joinAckMs, () => {
      this.joinAttempts += 1;
      if (this.joinAttempts >= this.cfg.maxJoinAttempts) {
        this.fail('JOIN_TIMEOUT', MESSAGES.JOIN_TIMEOUT);
      } else {
        this.log('warn', 'join_timeout_retry', { attempt: this.joinAttempts + 1 });
        this.sendJoin({ resume, quiet: true });
      }
    });
  }

  onJoined(info) {
    this.clearTimer('joinAck');
    this.joinAttempts = 0;
    this.joined = true;
    this.notFoundDeadline = null;
    if (Array.isArray(info.iceServers) && info.iceServers.length > 0) this.iceServers = info.iceServers;
    this.relayAvailable = info.relayAvailable === true;
    this.log('info', 'joined', { hostOnline: info.hostOnline !== false, resumed: !!info.resumed, iceServers: this.iceServers.length, relayAvailable: this.relayAvailable, relay: this.useRelay });
    this.diag('joined', {});

    if (info.resumed && this.peer && this.peer.connectionState === 'connected') return; // link never went down

    if (info.hostOnline === false) {
      this.enterHostOffline(this.cfg.hostOfflineMs);
      return;
    }
    this.enterWaitingForHost();
  }

  enterWaitingForHost() {
    this.clearTimer('hostOffline');
    this.setStatus(this.connectedOnce ? 'reconnecting' : 'connecting', 'waiting_host', this.useRelay ? 'Direct connection failed — retrying through a relay server…' : 'Waiting for the host device to respond…');
    this.log('info', 'waiting_for_peer', {});
    this.diag('host_waiting', {});
    this.setTimer('offer', this.cfg.offerMs, () => this.retryNegotiation('HOST_NO_RESPONSE'));
  }

  enterHostOffline(ms) {
    this.sawHostOffline = true;
    this.clearTimer('offer');
    this.clearTimer('ice');
    this.setStatus('reconnecting', 'host_offline', 'The host went offline. Waiting for it to come back…');
    this.log('warn', 'host_offline', {});
    this.setTimer('hostOffline', ms, () => this.fail('HOST_OFFLINE', MESSAGES.HOST_OFFLINE));
  }

  onHostOffline(data) {
    this.sawHostOffline = true;
    if (this.peer && this.peer.connectionState === 'connected') {
      this.log('warn', 'host_signaling_offline_peer_up', {}); // media may keep flowing; wait for the peer state to decide
      return;
    }
    this.legacyRetryDeadline = null;
    this.enterHostOffline(Math.max(this.cfg.hostOfflineMs, (Number(data.graceMs) || 0) + 10000));
  }

  onHostReconnected() {
    this.log('info', 'host_reconnected', {});
    this.clearTimer('hostOffline');
    if (this.peer && this.peer.connectionState === 'connected') return;
    this.enterWaitingForHost();
  }

  onServerError(err) {
    const code = err.code || (err.message === 'Session not found' ? 'SESSION_NOT_FOUND' : 'SERVER_ERROR');
    if (code === 'SESSION_NOT_FOUND') {
      if (this.peerIsUp()) {
        // The media path does not need signaling. The server most likely restarted and the host has not
        // re-registered yet: keep trying quietly, never fail or disturb a working session.
        return this.scheduleRejoin('server_restarted_peer_up');
      }
      const now = this.now();
      if (this.legacyRetryDeadline && now < this.legacyRetryDeadline) {
        return this.scheduleRejoin('host_returning');
      }
      if (err.retryable) {
        if (!this.notFoundDeadline) this.notFoundDeadline = now + this.cfg.notFoundRetryWindowMs;
        if (now < this.notFoundDeadline) return this.scheduleRejoin('server_restarting');
      }
      return this.fail('SESSION_NOT_FOUND', MESSAGES.SESSION_NOT_FOUND);
    }
    this.fail(code, err.message || 'Unknown error');
  }

  peerIsUp() {
    return !!this.peer && this.peer.connectionState === 'connected';
  }

  scheduleRejoin(why) {
    this.clearTimer('joinAck');
    if (!this.peerIsUp()) {
      this.setStatus(this.connectedOnce || this.legacyRetryDeadline ? 'reconnecting' : 'connecting', 'waiting_host', 'Looking for the host device…');
    }
    this.log('info', 'rejoin_scheduled', { why });
    // Evaluated when the timer fires: the peer may have connected / dropped in the meantime.
    this.setTimer('rejoin', this.cfg.notFoundRetryIntervalMs, () => {
      const resume = this.peerIsUp();
      this.sendJoin({ resume, quiet: true });
    });
  }

  onSessionEnded(reason) {
    this.log('warn', 'session_ended', { reason });
    if (/^(host )?agent disconnected$/i.test(reason)) {
      // Servers with a reconnect grace period only send this once the grace has expired: final.
      // Older servers send it immediately, so keep trying to re-join for a while before giving up.
      if (!this.sawHostOffline && !this.legacyRetryDeadline) {
        this.legacyRetryDeadline = this.now() + this.cfg.legacyHostGoneRetryMs;
        this.teardownPeer();
        this.setStatus('reconnecting', 'host_offline', 'The host went offline. Waiting for it to come back…');
        return this.scheduleRejoin('legacy_host_gone');
      }
      return this.fail('HOST_OFFLINE', MESSAGES.HOST_OFFLINE);
    }
    this.fail('SESSION_ENDED', `Connection closed: ${reason}`);
  }

  // ── WebRTC negotiation ────────────────────────────────────────────────────────────────────────

  createPeer() {
    this.teardownPeer();
    const peer = this.rtcFactory({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 4,   // pre-gather candidates before negotiation starts
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });
    this.peer = peer;
    this.remoteDescSet = false;
    this.remoteFingerprint = null;
    this.remoteUfrag = null;
    // NB: iceQueue is deliberately kept. The host pre-gathers candidates (iceCandidatePoolSize), so some
    // can arrive BEFORE its offer. Stale ones from a previous host peer are filtered out by ufrag below.
    const gen = this.gen;
    const live = () => gen === this.gen && this.peer === peer && !this.destroyed;

    // What did this peer manage to gather? (host / srflx via STUN / relay via TURN) Used to explain a failure.
    const gather = { useRelay: this.useRelay, host: 0, srflx: 0, prflx: 0, relayed: 0, errors: [] };
    this.gatherLog.push(gather);
    if (this.gatherLog.length > 4) this.gatherLog.shift();
    this.iceRestartTried = false;

    peer.onicecandidateerror = (e) => {
      if (!live()) return;
      const url = String((e && e.url) || '');
      // STUN "701" lookups for IPv6/unreachable names are routine noise; only relay errors explain a failure.
      if (/^turns?:/i.test(url)) {
        const port = (/:(\d+)/.exec(url) || [])[1] || '';
        const tag = `${url.split(':')[0]}${port ? ':' + port : ''}=${e.errorCode}`;
        if (!gather.errors.includes(tag) && gather.errors.length < 6) gather.errors.push(tag);
        this.log('warn', 'relay_candidate_error', { server: tag });
      }
    };
    peer.onicecandidate = (event) => {
      if (!live() || !this.socket) return;
      if (event.candidate) {
        const kind = event.candidate.type || 'unknown';
        if (kind === 'host') gather.host += 1;
        else if (kind === 'srflx') gather.srflx += 1;
        else if (kind === 'prflx') gather.prflx += 1;
        else if (kind === 'relay') gather.relayed += 1;
        this.socket.emit('signal:ice', { sessionId: this.sessionId, candidate: event.candidate, to: 'agent' });
        this.log('info', 'ice_candidate_sent', { candidateType: kind });
      } else {
        this.log('info', 'ice_gathering_complete', {});
      }
    };
    peer.oniceconnectionstatechange = () => {
      if (!live()) return;
      this.log('info', 'ice_connection_state', { state: peer.iceConnectionState });
      this.diag('ice_connection_state', { state: peer.iceConnectionState });
    };
    peer.onicegatheringstatechange = () => {
      if (!live()) return;
      this.log('info', 'ice_gathering_state', { state: peer.iceGatheringState });
    };
    peer.onconnectionstatechange = () => { if (live()) this.onPeerState(peer); };

    if (this.hooks.onPeer) this.hooks.onPeer(peer);
    return peer;
  }

  async onRemoteSdp(description) {
    if (!description || !description.type) return;
    const gen = this.gen;
    if (description.type === 'answer') return this.onRemoteAnswer(description);
    if (description.type !== 'offer') {
      this.log('warn', 'unexpected_sdp_type', { type: description.type });
      return;
    }
    this.clearTimer('offer');
    this.clearTimer('hostOffline');
    this.log('info', 'offer_received', { bytes: (description.sdp || '').length });
    this.diag('offer_received', {});

    const fingerprint = extractFingerprint(description.sdp);
    const hostRebuilt = !!this.peer && !!this.remoteFingerprint && !!fingerprint && fingerprint !== this.remoteFingerprint;
    if (!this.peer || this.peer.signalingState === 'closed' || hostRebuilt) {
      if (hostRebuilt) this.log('info', 'host_peer_rebuilt', {});
      this.createPeer();
    }
    const peer = this.peer;
    const stale = () => gen !== this.gen || this.peer !== peer || this.destroyed;

    try {
      this.remoteFingerprint = fingerprint || this.remoteFingerprint;
      this.remoteUfrag = extractIceUfrag(description.sdp) || this.remoteUfrag;
      await peer.setRemoteDescription(description);
      if (stale()) return;
      this.remoteDescSet = true;
      await this.drainIceQueue(peer);
      if (stale()) return;

      const answer = await peer.createAnswer();
      if (stale()) return;
      await peer.setLocalDescription(answer);
      if (stale() || !this.socket) return;
      this.socket.emit('signal:sdp', { sessionId: this.sessionId, sdp: peer.localDescription, to: 'agent' });
      this.log('info', 'answer_sent', { bytes: ((peer.localDescription && peer.localDescription.sdp) || '').length });
      this.diag('answer_sent', {});

      if (peer.connectionState !== 'connected') {
        this.setStatus(this.connectedOnce ? 'reconnecting' : 'connecting', 'negotiating', this.useRelay ? 'Negotiating a link through a relay server…' : 'Negotiating a secure peer-to-peer link…');
        const directWithFallback = this.relayAvailable && !this.useRelay;
        this.setTimer('ice', directWithFallback ? this.cfg.iceDirectMs : this.cfg.iceMs, () => this.retryNegotiation('ICE_FAILED'));
      }
    } catch (err) {
      if (stale()) return;
      this.log('error', 'sdp_error', { message: err && err.message });
      this.retryNegotiation('SDP_ERROR');
    }
  }

  /** Apply queued remote candidates that belong to the freshly applied remote description (stale ones are dropped). */
  async drainIceQueue(peer) {
    const queued = this.iceQueue.filter((c) => this.candidateMatchesRemote(c));
    this.remoteCands.rejected += this.iceQueue.length - queued.length; // stale: belonged to a previous host peer
    this.iceQueue = [];
    for (const candidate of queued) {
      await peer.addIceCandidate(candidate).then(
        () => { this.remoteCands.applied += 1; },
        (e) => { this.remoteCands.rejected += 1; this.log('warn', 'queued_ice_rejected', { message: e && e.message }); }
      );
    }
  }

  /**
   * The host's answer to OUR offer (an ICE restart). Any other answer is stale: either we have no outstanding
   * offer, or it comes from a host peer that has since been rebuilt.
   */
  async onRemoteAnswer(description) {
    const gen = this.gen;
    const peer = this.peer;
    if (!peer || peer.signalingState !== 'have-local-offer') {
      this.log('warn', 'stale_answer_ignored', { signalingState: peer ? peer.signalingState : 'no-peer' });
      return;
    }
    const fingerprint = extractFingerprint(description.sdp);
    if (this.remoteFingerprint && fingerprint && fingerprint !== this.remoteFingerprint) {
      this.log('warn', 'answer_from_rebuilt_host_ignored', {});
      return;
    }
    const stale = () => gen !== this.gen || this.peer !== peer || this.destroyed;
    try {
      this.remoteUfrag = extractIceUfrag(description.sdp) || this.remoteUfrag;
      await peer.setRemoteDescription(description);
      if (stale()) return;
      this.remoteDescSet = true;
      this.log('info', 'answer_received', { bytes: (description.sdp || '').length });
      this.diag('answer_received', {});
      await this.drainIceQueue(peer);
    } catch (err) {
      if (stale()) return;
      this.log('error', 'sdp_error', { message: err && err.message });
      this.clearTimer('iceRestart');
      this.retryNegotiation('SDP_ERROR');
    }
  }

  /** A candidate belongs to the current host peer unless it names a different ICE ufrag than its offer. */
  candidateMatchesRemote(candidate) {
    const ufrag = candidate && candidate.usernameFragment;
    return !ufrag || !this.remoteUfrag || ufrag === this.remoteUfrag;
  }

  onRemoteIce(candidate) {
    // A null/empty candidate is the host's end-of-candidates marker: trickle ICE needs nothing from us.
    if (!candidate || !candidate.candidate) return;
    this.remoteCands.received += 1;
    const key = `${candidate.candidate}|${candidate.usernameFragment || ''}`;
    if (this.remoteCands.seen.has(key)) { this.remoteCands.duplicates += 1; return; } // retransmitted: ignore safely
    this.remoteCands.seen.add(key);
    this.log('info', 'ice_candidate_received', { candidateType: (/\btyp\s+(\w+)/.exec(candidate.candidate) || [])[1] || 'unknown' });
    if (this.peer && this.remoteDescSet && this.candidateMatchesRemote(candidate)) {
      const peer = this.peer;
      peer.addIceCandidate(candidate).then(
        () => { this.remoteCands.applied += 1; },
        (e) => {
          this.remoteCands.rejected += 1;
          if (peer === this.peer) this.log('warn', 'ice_candidate_rejected', { message: e && e.message });
        }
      );
    } else if (this.iceQueue.length < MAX_QUEUED_CANDIDATES) {
      this.iceQueue.push(candidate); // remote description not applied yet (or it is for the host's next peer)
    }
  }

  onPeerState(peer) {
    const state = peer.connectionState;
    this.log('info', 'connection_state', { state });
    this.diag('connection_state', { state });
    if (state === 'connected') {
      this.markConnected('webrtc');
    } else if (state === 'disconnected') {
      // Frequently transient (brief packet loss / network switch). Give ICE a chance before recovering.
      if (!this.timers.disconnect && !this.timers.iceRestart) {
        this.setTimer('disconnect', this.cfg.disconnectGraceMs, () => this.recoverPeer('PEER_LOST'));
      }
    } else if (state === 'failed') {
      this.clearTimer('disconnect');
      if (this.timers.iceRestart) return; // an ICE restart is already in flight: let it (or its timer) decide
      this.recoverPeer(this.connectedOnce ? 'PEER_LOST' : 'ICE_FAILED');
    }
  }

  /** An established link was lost: ICE restart on the same peer first, full renegotiation if that is not possible. */
  recoverPeer(reason) {
    if (this.finished || this.destroyed) return;
    const peer = this.peer;
    const canRestart = this.connectedOnce && !this.iceRestartTried && !!peer && peer.signalingState === 'stable'
      && typeof peer.createOffer === 'function' && !!this.socket && this.socket.connected;
    if (canRestart) return this.startIceRestart(reason);
    this.retryNegotiation(reason);
  }

  async startIceRestart(reason) {
    this.iceRestartTried = true;
    this.log('warn', 'ice_restart_start', { reason });
    this.diag('recovery', { reason, method: 'ice_restart', relay: this.useRelay });
    this.setStatus('reconnecting', 'ice_restart', 'The network changed — re-establishing the connection…');
    // If restarts do not bring the link back in time, fall back to a full renegotiation.
    this.setTimer('iceRestart', this.cfg.iceRestartMs, () => this.retryNegotiation(reason));
    await this.sendIceRestartOffer(reason, 1);
  }

  /**
   * One ICE restart: a fresh offer (new ufrag) makes BOTH sides gather again on whatever network is up now.
   * A restart issued while the network is still down gathers nothing, and nothing would ever retry it - so while
   * the link stays down it is re-issued every iceRestartRetryMs (once the previous one has been answered).
   */
  async sendIceRestartOffer(reason, n) {
    const gen = this.gen;
    const peer = this.peer;
    const stale = () => gen !== this.gen || this.peer !== peer || this.destroyed;
    try {
      const offer = await peer.createOffer({ iceRestart: true });
      if (stale()) return;
      await peer.setLocalDescription(offer);
      if (stale() || !this.socket) return;
      this.socket.emit('signal:sdp', { sessionId: this.sessionId, sdp: peer.localDescription, to: 'agent' });
      this.log('info', 'ice_restart_offer_sent', { n, bytes: ((peer.localDescription && peer.localDescription.sdp) || '').length });
    } catch (err) {
      if (stale()) return;
      this.log('error', 'ice_restart_error', { message: err && err.message });
      this.clearTimer('iceRestart');
      this.clearTimer('iceRestartRetry');
      return this.retryNegotiation(reason);
    }
    const again = () => {
      if (stale() || peer.connectionState === 'connected') return;
      if (peer.signalingState === 'stable') this.sendIceRestartOffer(reason, n + 1); // previous restart answered, link still down
      else this.setTimer('iceRestartRetry', this.cfg.iceRestartRetryMs, again);    // still waiting for the host's answer
    };
    this.setTimer('iceRestartRetry', this.cfg.iceRestartRetryMs, again);
  }

  markConnected(via) {
    this.clearTimer('ice');
    this.clearTimer('offer');
    this.clearTimer('disconnect');
    this.clearTimer('hostOffline');
    this.clearTimer('rejoin');
    this.clearTimer('joinAck');
    if (this.timers.iceRestart) this.log('info', 'ice_restart_succeeded', {});
    this.clearTimer('iceRestart');
    this.clearTimer('iceRestartRetry');
    this.iceRestartTried = false;
    this.attempts = 0;
    this.legacyRetryDeadline = null;
    const firstTime = !this.connectedOnce;
    this.connectedOnce = true;
    this.log('info', 'connection_established', { via, elapsedMs: this.now() - this.startedAt });
    this.diag('connected', { elapsedMs: this.now() - this.startedAt });
    this.setStatus('connected', 'connected', '');
    if (via === 'webrtc' && this.peer) {
      if (this.hooks.onPeerConnected) this.hooks.onPeerConnected(this.peer, { firstTime });
      this.reportSelectedPair(this.peer);
    }
  }

  async reportSelectedPair(peer) {
    try {
      const stats = await peer.getStats();
      let pairId = null;
      stats.forEach((r) => { if (r.type === 'transport' && r.selectedCandidatePairId) pairId = r.selectedCandidatePairId; });
      let pair = null;
      stats.forEach((r) => { if (pairId ? r.id === pairId : (r.type === 'candidate-pair' && r.state === 'succeeded')) pair = pair || r; });
      if (!pair) return;
      const local = stats.get(pair.localCandidateId);
      const remote = stats.get(pair.remoteCandidateId);
      const pairType = `${(local && local.candidateType) || '?'}<->${(remote && remote.candidateType) || '?'}`;
      const protocol = (local && local.protocol) || 'unknown';
      // For a relayed pair this is the transport to the TURN server: udp, tcp or tls (443).
      const relayProtocol = local && local.candidateType === 'relay' ? (local.relayProtocol || 'unknown') : undefined;
      // Direct unless either end of the nominated pair is a TURN relay candidate.
      const route = (local && local.candidateType === 'relay') || (remote && remote.candidateType === 'relay') ? 'relayed' : 'direct';
      this.log('info', 'selected_pair', { pairType, protocol, relayProtocol, route, remoteCandidates: this.remoteCands.received });
      this.diag('selected_pair', relayProtocol ? { pairType, protocol, relayProtocol, route } : { pairType, protocol, route });
    } catch { /* stats are best-effort */ }
  }

  /**
   * Tear the peer down and negotiate again from scratch through the host (client:join_session makes the
   * host build a brand-new offer). Works with every deployed agent version. After the allowed attempts
   * the viewer gets a real error instead of an endless spinner.
   */
  retryNegotiation(reason) {
    if (this.finished || this.destroyed) return;
    this.clearTimer('offer');
    this.clearTimer('ice');
    this.clearTimer('disconnect');
    this.clearTimer('iceRestart');
    this.clearTimer('iceRestartRetry');
    this.attempts += 1;
    this.log('warn', 'negotiation_failed', { reason, attempt: this.attempts, of: this.cfg.maxNegotiationAttempts });
    this.diag('timeout', { reason, code: reason, attempt: this.attempts });

    if (this.attempts >= this.cfg.maxNegotiationAttempts) {
      const message = reason === 'HOST_NO_RESPONSE' ? MESSAGES.HOST_NO_RESPONSE
        : reason === 'PEER_LOST' ? MESSAGES.PEER_LOST
          : reason === 'SDP_ERROR' ? MESSAGES.SDP_ERROR
            : (this.useRelay ? MESSAGES.ICE_FAILED_RELAY : MESSAGES.ICE_FAILED);
      return this.fail(reason, message);
    }

    // Direct connectivity failed. If (and only if) the server has an optional relay, use it for the next attempt.
    const connectivityFailure = reason === 'ICE_FAILED' || reason === 'PEER_LOST';
    const switchToRelay = connectivityFailure && this.relayAvailable && !this.useRelay;
    if (switchToRelay) {
      this.useRelay = true;
      this.log('info', 'relay_fallback', { reason });
    }

    this.teardownPeer();
    this.setStatus(
      this.connectedOnce ? 'reconnecting' : 'connecting',
      'retrying',
      switchToRelay
        ? 'Direct connection failed. Retrying through a relay server…'
        : `Retrying the connection (attempt ${this.attempts + 1}/${this.cfg.maxNegotiationAttempts})…`
    );
    this.diag('recovery', { reason, method: 'renegotiate', attempt: this.attempts + 1, relay: this.useRelay });
    // If the signaling socket is down, its 'connect' handler will send the join.
    if (this.socket && this.socket.connected) this.sendJoin({ resume: false, quiet: true });
  }

  /**
   * Explain WHY every path failed, from what the peers actually gathered. Only for connectivity failures.
   * Returns { detail, technical, stats } or null.
   */
  diagnose(code) {
    if (code !== 'ICE_FAILED' && code !== 'PEER_LOST') return null;
    const sum = { host: 0, srflx: 0, prflx: 0, relayed: 0 };
    const errors = [];
    let relayTried = false;
    for (const g of this.gatherLog) {
      sum.host += g.host; sum.srflx += g.srflx; sum.prflx += g.prflx;
      if (g.useRelay) { relayTried = true; sum.relayed += g.relayed; }
      for (const e of g.errors) if (!errors.includes(e)) errors.push(e);
    }
    const publicAddr = sum.srflx + sum.prflx;
    const rc = this.remoteCands;
    let detail;
    if (rc.received === 0) {
      detail = 'No network candidates were received from the host, so no connection could even be attempted. The host agent may be outdated or its signaling is being blocked.';
    } else if (publicAddr === 0) {
      detail = 'No public network address could be discovered (STUN). UDP traffic appears to be blocked or filtered on this network.';
    } else if (!this.relayAvailable) {
      detail = 'Both devices exchanged network candidates but no direct path could be established, and no relay server is configured to fall back to. This is typical of symmetric or carrier-grade NAT, or a firewall.';
    } else if (relayTried && sum.relayed === 0) {
      detail = 'No direct path worked, and the relay server did not provide an address (unreachable, blocked, or its credentials were rejected).';
    } else if (relayTried) {
      detail = 'No direct path worked, and the host could not be reached through the relay server either.';
    } else {
      detail = 'No direct path to the host worked.';
    }
    const relayState = this.relayAvailable ? (relayTried ? 'tried' : 'available') : 'not-configured';
    const technical = `candidates host=${sum.host} srflx=${sum.srflx + sum.prflx} relay=${sum.relayed}; remote=${rc.received} (applied ${rc.applied}, rejected ${rc.rejected}, duplicate ${rc.duplicates}); relay=${relayState}${errors.length ? '; relay-errors=' + errors.join(',') : ''}`;
    return { detail, technical, stats: { candHost: sum.host, candSrflx: publicAddr, candRelay: sum.relayed, candRemote: rc.received, iceErrors: errors.join(',') } };
  }

  fail(code, message) {
    if (this.finished || this.destroyed) return;
    this.finished = true;
    const diagnosis = this.diagnose(code);
    this.log('error', 'connection_failed', { code, reason: message, ...(diagnosis ? diagnosis.stats : {}) });
    this.diag('failed', { code, reason: code, ...(diagnosis ? diagnosis.stats : {}) });
    this.clearAllTimers();
    this.teardownSocket(true, { flushMs: 250 });
    this.teardownPeer();
    this.setStatus('error', 'failed', message, { code, detail: diagnosis && diagnosis.detail, technical: diagnosis && diagnosis.technical });
  }

  // ── plumbing ──────────────────────────────────────────────────────────────────────────────────

  setStatus(status, phase, message, extra = {}) {
    if (this.destroyed) return;
    const key = `${status}|${phase}|${message}|${extra.code || ''}|${extra.detail || ''}`;
    if (key === this.lastStatusKey) return;
    // While a live P2P link is being kept across a signaling reconnect, do not disturb the UI.
    if (extra.keepConnected && this.lastStatusKey.startsWith('connected|')) return;
    this.lastStatusKey = key;
    if (this.hooks.onStatus) {
      this.hooks.onStatus({ status, phase, message, code: extra.code || null, detail: extra.detail || '', technical: extra.technical || '', attempt: this.attempts + 1 });
    }
  }

  teardownPeer() {
    const peer = this.peer;
    if (!peer) return;
    this.peer = null;
    this.remoteDescSet = false;
    this.remoteFingerprint = null;
    this.remoteUfrag = null;
    this.remoteCands.seen.clear();
    peer.onicecandidate = null;
    peer.onicecandidateerror = null;
    peer.oniceconnectionstatechange = null;
    peer.onicegatheringstatechange = null;
    peer.onconnectionstatechange = null;
    peer.ontrack = null;
    peer.ondatachannel = null;
    try { peer.close(); } catch { /* already closed */ }
    if (this.hooks.onPeerClosed) this.hooks.onPeerClosed(peer);
  }

  teardownSocket(leave, { flushMs = 0 } = {}) {
    const socket = this.socket;
    if (!socket) return;
    this.socket = null;
    if (leave && socket.connected && this.joined) {
      // Tell the server we are really leaving so the host stops capturing at once (no reconnect grace).
      try { socket.emit('client:leave_session', { sessionId: this.sessionId }); } catch { /* socket closing */ }
    }
    if (socket.removeAllListeners) socket.removeAllListeners();
    if (flushMs > 0 && socket.connected) {
      // Closing right after emit() can drop the last packets. On failure those carry the leave notice and the
      // diagnosis (WHY it failed), which must reach the server logs, so let them flush before closing the transport.
      setTimeout(() => socket.disconnect(), flushMs);
    } else {
      socket.disconnect();
    }
  }

  setTimer(name, ms, fn) {
    this.clearTimer(name);
    const gen = this.gen;
    this.timers[name] = setTimeout(() => {
      delete this.timers[name];
      if (gen !== this.gen || this.destroyed) return;
      fn();
    }, ms);
  }

  clearTimer(name) {
    if (this.timers[name]) {
      clearTimeout(this.timers[name]);
      delete this.timers[name];
    }
  }

  clearAllTimers() {
    for (const name of Object.keys(this.timers)) this.clearTimer(name);
  }

  /** Structured console log. Never includes SDP, ICE addresses, tokens or the full session code. */
  log(level, event, fields) {
    const logger = this.logger[level] || this.logger.info;
    logger(event, { ts: new Date().toISOString(), session: maskSession(this.sessionId), ...fields });
  }

  /** Report a lifecycle event to the server so it appears in the Render logs next to the server-side events. */
  diag(event, fields) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('peer:diag', { sessionId: this.sessionId, event, ...fields });
    }
  }
}
