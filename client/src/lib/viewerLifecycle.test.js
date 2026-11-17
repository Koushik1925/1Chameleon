/**
 * Regression tests: "mouse and keyboard data channels suddenly close during an active session".
 *
 * Findings these tests pin down (see the investigation report):
 *  1. `disconnected_by_viewer` is logged ONLY by ConnectionManager.disconnect(). Network / ICE / server failures
 *     never log it (they log `connection_failed`), so seeing it means the viewer itself ended the session:
 *     Disconnect/Cancel, a re-join, the viewer route unmounting (browser Back), or `pagehide`.
 *  2. Closing the peer closes BOTH data channels together - they are not independent failures.
 *  3. React's root touch / wheel listeners are passive: preventDefault() is ignored (the console error), so the
 *     browser's own gestures (history-back, pull-to-refresh) run on top of the remote desktop and unload the viewer.
 *  4. A `pagehide` for a page that is only entering the back/forward cache is not a real exit.
 *
 * Browser behaviour is modelled by small fakes; timers are mocked.
 *
 * Run: npm test
 */
/* global setImmediate */
import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ConnectionManager } from './connectionManager.js';
import { SessionChannels } from './sessionChannels.js';
import { bindPageLifecycle } from './pageLifecycle.js';
import { attachInputGuards } from './inputGuards.js';

// ── fakes ─────────────────────────────────────────────────────────────────────────────────────────
class FakeSocket {
  constructor() { this.handlers = {}; this.emitted = []; this.connected = false; this.disconnectCalls = 0; this.connectCalls = 0; }
  on(event, fn) { (this.handlers[event] = this.handlers[event] || []).push(fn); return this; }
  removeAllListeners() { this.handlers = {}; }
  emit(event, ...args) { this.emitted.push([event, ...args]); }
  disconnect() { this.disconnectCalls += 1; this.connected = false; }
  connect() { this.connectCalls += 1; }
  serverSend(event, ...args) { (this.handlers[event] || []).slice().forEach((fn) => fn(...args)); }
  up() { this.connected = true; this.serverSend('connect'); }
  drop(reason = 'transport close') { this.connected = false; this.serverSend('disconnect', reason); }
  sent(event) { return this.emitted.filter((e) => e[0] === event).map((e) => e[1]); }
}

class FakeChannel {
  constructor(label, timeline) { this.label = label; this.readyState = 'open'; this.closeCalls = 0; this.timeline = timeline; }
  /** close() called by APPLICATION code (counted: a second one would be duplicate cleanup). */
  close() { this.closeCalls += 1; this.closeInternally(); }
  /** The browser closing the channel because its peer connection closed (not counted). */
  closeInternally() {
    if (this.readyState === 'closed') return;
    this.readyState = 'closed';
    // Real browsers fire `close` asynchronously, after the call that caused it has returned.
    queueMicrotask(() => { this.timeline.push(`dc:${this.label}:closed`); if (this.onclose) this.onclose(); });
  }
}

class FakePeer {
  constructor(timeline) {
    this.timeline = timeline;
    this.connectionState = 'new';
    this.signalingState = 'stable';
    this.closeCalls = 0;
    this.channels = [];
    this.offerOpts = [];
    this.remote = null;
  }
  async setRemoteDescription(d) { this.remote = d; this.signalingState = d.type === 'answer' ? 'stable' : 'have-remote-offer'; }
  async createAnswer() { return { type: 'answer', sdp: 'v=0\r\na=fingerprint:sha-256 LOCAL:FP\r\n' }; }
  async createOffer(opts) { this.offerOpts.push(opts || {}); return { type: 'offer', sdp: 'v=0\r\na=ice-ufrag:LOCAL1\r\na=fingerprint:sha-256 LOCAL:FP\r\n' }; }
  async setLocalDescription(d) { this.localDescription = d; this.signalingState = d.type === 'offer' ? 'have-local-offer' : 'stable'; }
  async addIceCandidate() {}
  async getStats() { return new Map(); }
  /** The host opens the two input channels; the viewer receives them via ondatachannel. */
  openHostChannels() {
    for (const label of ['mouse', 'keyboard']) {
      const ch = new FakeChannel(label, this.timeline);
      this.channels.push(ch);
      if (this.ondatachannel) this.ondatachannel({ channel: ch });
    }
  }
  close() {
    this.closeCalls += 1;
    if (this.closeCalls === 1) this.timeline.push('peer:closed');
    this.connectionState = 'closed';
    this.signalingState = 'closed';
    for (const ch of this.channels) ch.closeInternally(); // closing the peer closes BOTH channels
  }
  setState(state) { this.connectionState = state; if (this.onconnectionstatechange) this.onconnectionstatechange(); }
}

const offerSdp = { type: 'offer', sdp: 'v=0\r\na=fingerprint:sha-256 AA:BB:CC\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n' };
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r)); };

/** The viewer as App.jsx wires it: ConnectionManager + SessionChannels (+ page lifecycle). */
async function connectedViewer() {
  const v = { timeline: [], sockets: [], peers: [], logs: [], statuses: [], channels: new SessionChannels() };
  v.manager = new ConnectionManager({
    signalingUrl: 'http://signal.test',
    sessionId: '123456',
    clientId: 'tab-1',
    ioFactory: () => { const s = new FakeSocket(); v.sockets.push(s); return s; },
    rtcFactory: () => { const p = new FakePeer(v.timeline); v.peers.push(p); return p; },
    logger: {
      info: (e, f) => { v.logs.push({ e, f }); if (e === 'disconnected_by_viewer') v.timeline.push('log:disconnected_by_viewer'); },
      warn: (e, f) => v.logs.push({ e, f }),
      error: (e, f) => v.logs.push({ e, f }),
    },
    hooks: {
      onStatus: (s) => v.statuses.push(s),
      onPeer: (peer) => {
        v.channels.setPeer(peer);
        peer.ondatachannel = (event) => v.channels.setChannel(event.channel.label, event.channel);
      },
      onPeerClosed: (peer) => { if (v.channels.isPeer(peer)) v.channels.release({ closePeer: false }); },
    },
  });
  v.sock = () => v.sockets[v.sockets.length - 1];
  v.manager.start();
  v.sock().up();
  v.sock().serverSend('client:joined_success', { hostOnline: true, resumed: false, iceServers: [] });
  v.sock().serverSend('signal:sdp', { sdp: offerSdp });
  await flush();
  v.peers[0].openHostChannels();
  v.peers[0].setState('connected');
  v.timeline.length = 0; // only what happens AFTER the healthy session was established
  assert.equal(v.statuses[v.statuses.length - 1].status, 'connected');
  assert.ok(v.peers[0].channels.every((c) => c.readyState === 'open'));
  return v;
}

const channelsOpen = (v) => v.peers[0].channels.every((c) => c.readyState === 'open' && c.closeCalls === 0);

/** Minimal window / document: records listeners, dispatches events to them. */
class FakeTarget {
  constructor() { this.listeners = []; this.visibilityState = 'visible'; }
  addEventListener(type, fn, opts) { this.listeners.push({ type, fn, opts }); }
  removeEventListener(type, fn) { this.listeners = this.listeners.filter((l) => !(l.type === type && l.fn === fn)); }
  fire(type, props = {}) {
    const ev = { type, ...props };
    this.listeners.filter((l) => l.type === type).forEach((l) => l.fn(ev));
  }
  count(type) { return this.listeners.filter((l) => l.type === type).length; }
}

describe('viewer lifecycle: mouse + keyboard channels', () => {
  beforeEach(() => mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 }));
  afterEach(() => mock.timers.reset());

  // ── reproduction of the reported console sequence ──────────────────────────────────────────────
  describe('reproduction of the reported sequence', () => {
    test('REPRODUCED: ending the viewer logs disconnected_by_viewer, then BOTH channels close together with the peer', async () => {
      const v = await connectedViewer();
      v.manager.disconnect('unmount');
      await flush();

      assert.deepEqual(v.timeline.filter((e) => e !== 'peer:closed'),
        ['log:disconnected_by_viewer', 'dc:mouse:closed', 'dc:keyboard:closed'],
        'exactly the console order from production: viewer log first, then the two data channel closes');
      assert.equal(v.peers[0].closeCalls, 1 + 0, 'one peer close (the channels close BECAUSE the peer closed)');
      const log = v.logs.find((l) => l.e === 'disconnected_by_viewer');
      assert.deepEqual({ reason: log.f.reason }, { reason: 'unmount' }, 'the log now says WHO ended the session');
    });

    test('REPRODUCED (old behaviour): an unconditional pagehide -> disconnect() killed a healthy session that was only being frozen into bfcache', async () => {
      const v = await connectedViewer();
      const win = new FakeTarget();
      const legacyLeave = () => v.manager.disconnect(); // what App.jsx did: window.addEventListener('pagehide', leave)
      win.addEventListener('pagehide', legacyLeave);

      win.fire('pagehide', { persisted: true });
      await flush();

      assert.equal(channelsOpen(v), false, 'healthy channels were closed');
      assert.ok(v.timeline.includes('log:disconnected_by_viewer'));
    });

    test('FIXED: the same bfcache pagehide leaves the healthy session and both channels untouched', async () => {
      const v = await connectedViewer();
      const win = new FakeTarget();
      bindPageLifecycle({ win, doc: new FakeTarget(), getManager: () => v.manager });

      win.fire('pagehide', { persisted: true });
      await flush();
      mock.timers.tick(10 * 60 * 1000);

      assert.equal(channelsOpen(v), true);
      assert.equal(v.peers[0].closeCalls, 0);
      assert.equal(v.logs.some((l) => l.e === 'disconnected_by_viewer'), false);
      assert.equal(v.manager.destroyed, false);
    });
  });

  // ── a healthy session survives signaling trouble ───────────────────────────────────────────────
  describe('healthy session', () => {
    for (const reason of ['transport close', 'ping timeout', 'transport error', 'io server disconnect']) {
      test(`signaling socket interruption (${reason}) never closes the peer or the channels`, async () => {
        const v = await connectedViewer();
        const socket = v.sock();
        for (let i = 0; i < 3; i++) {
          socket.drop(reason);
          mock.timers.tick(30 * 1000); // far longer than any grace period
          socket.up();                 // Socket.IO reconnected
          socket.serverSend('client:joined_success', { hostOnline: true, resumed: true });
        }
        mock.timers.tick(10 * 60 * 1000);
        await flush();

        assert.equal(channelsOpen(v), true, 'mouse + keyboard still open');
        assert.equal(v.peers.length, 1, 'no renegotiation');
        assert.equal(v.peers[0].closeCalls, 0);
        assert.equal(v.logs.some((l) => l.e === 'disconnected_by_viewer'), false);
        assert.equal(v.statuses.filter((s) => s.status === 'error').length, 0);
        assert.equal(v.statuses[v.statuses.length - 1].status, 'connected', 'UI never left "connected"');
        const joins = socket.sent('client:join_session');
        assert.ok(joins.slice(1).every((j) => j.resume === true && j.peerState === 'connected'), 'rejoins resume the live link');
      });
    }

    test('socket down for longer than the server restart window: still no teardown while media flows', async () => {
      const v = await connectedViewer();
      v.sock().drop('transport close');
      mock.timers.tick(5 * 60 * 1000);
      assert.equal(channelsOpen(v), true);
      assert.equal(v.manager.destroyed, false);
    });
  });

  // ── recovery after a temporary network interruption ────────────────────────────────────────────
  describe('network interruption', () => {
    test('ICE blip that heals inside the grace period leaves the peer and channels alone', async () => {
      const v = await connectedViewer();
      v.peers[0].setState('disconnected');
      mock.timers.tick(3000);
      v.peers[0].setState('connected');
      mock.timers.tick(60 * 1000);
      assert.equal(channelsOpen(v), true);
      assert.equal(v.peers[0].closeCalls, 0);
    });

    test('a hidden/throttled tab that comes back while ICE is down restarts ICE at once on the SAME peer (channels kept)', async () => {
      const v = await connectedViewer();
      v.peers[0].setState('disconnected'); // timers are throttled in the background: the grace timer never fires
      const doc = new FakeTarget();
      bindPageLifecycle({ win: new FakeTarget(), doc, getManager: () => v.manager });

      doc.fire('visibilitychange'); // tab visible again
      await flush();

      assert.deepEqual(v.peers[0].offerOpts, [{ iceRestart: true }], 'ICE restart offered immediately');
      assert.equal(v.peers[0].closeCalls, 0);
      assert.equal(channelsOpen(v), true, 'the restart keeps the data channels');
      assert.equal(v.peers.length, 1);

      v.peers[0].setState('connected'); // the restart worked
      mock.timers.tick(60 * 1000);
      assert.equal(v.peers.length, 1);
      assert.equal(channelsOpen(v), true);
      assert.equal(v.statuses[v.statuses.length - 1].status, 'connected');
    });

    test('resume() on a healthy link changes nothing; after disconnect() it does nothing at all', async () => {
      const v = await connectedViewer();
      const offers = () => v.peers[0].offerOpts.length;
      v.manager.resume('online');
      v.manager.resume('visible');
      await flush();
      assert.equal(offers(), 0);
      assert.equal(channelsOpen(v), true);

      v.manager.disconnect('user');
      const socketEmits = v.sock().emitted.length;
      v.manager.resume('online');
      assert.equal(v.sock().emitted.length, socketEmits);
      assert.equal(v.sock().connectCalls, 0);
    });

    test('resume() while the signaling socket is down only reconnects it (the join + recovery follow from the connect handler)', async () => {
      const v = await connectedViewer();
      v.sock().drop('transport close');
      v.manager.resume('online');
      assert.equal(v.sock().connectCalls, 1);
      assert.equal(v.peers[0].offerOpts.length, 0);
      assert.equal(v.peers[0].closeCalls, 0);
    });
  });

  // ── explicit disconnect still closes everything, exactly once ──────────────────────────────────
  describe('explicit disconnect and duplicate cleanup', () => {
    test('user disconnect: leave notice, socket closed, peer closed once, both channels closed once, listeners gone, idempotent', async () => {
      const v = await connectedViewer();
      const socket = v.sock();
      v.manager.disconnect('user');
      v.manager.disconnect('user');
      v.manager.disconnect('unmount'); // React cleanup after the click: must be a no-op
      v.channels.release();            // App's own cleanupWebRTC() right after: must be a no-op
      await flush();

      assert.equal(socket.sent('client:leave_session').length, 1);
      assert.equal(socket.disconnectCalls, 1);
      assert.deepEqual(Object.keys(socket.handlers), []);
      assert.equal(v.peers[0].closeCalls, 1, 'peer closed exactly once (no duplicate cleanup)');
      assert.deepEqual(v.peers[0].channels.map((c) => c.closeCalls), [1, 1]);
      assert.equal(v.logs.filter((l) => l.e === 'disconnected_by_viewer').length, 1);
      assert.deepEqual(v.timeline.filter((e) => e.startsWith('dc:')), ['dc:mouse:closed', 'dc:keyboard:closed']);
    });

    test('after disconnect nothing reconnects: late socket events and timers are ignored', async () => {
      const v = await connectedViewer();
      const socket = v.sock();
      v.manager.disconnect('user');
      socket.serverSend('connect');
      socket.serverSend('signal:sdp', { sdp: offerSdp });
      mock.timers.tick(10 * 60 * 1000);
      await flush();
      assert.equal(v.peers.length, 1, 'no new peer');
      assert.equal(v.sockets.length, 1, 'no new socket');
    });

    test('a real unload (pagehide, not persisted) ends the session explicitly with reason "pagehide"; unbinding removes every listener', async () => {
      const v = await connectedViewer();
      const win = new FakeTarget();
      const doc = new FakeTarget();
      let released = 0;
      const unbind = bindPageLifecycle({ win, doc, getManager: () => v.manager, onUnload: () => { released += 1; } });

      win.fire('pagehide', { persisted: false });
      await flush();
      assert.equal(released, 1);
      assert.equal(v.manager.destroyed, true);
      assert.equal(v.logs.find((l) => l.e === 'disconnected_by_viewer').f.reason, 'pagehide');
      assert.equal(v.peers[0].channels.every((c) => c.readyState === 'closed'), true);

      unbind();
      assert.equal(win.count('pagehide') + win.count('pageshow') + win.count('online') + doc.count('visibilitychange'), 0);
    });

    test('the lifecycle always talks to the CURRENT manager (a re-join must not leave a stale handler on the old one)', async () => {
      const first = await connectedViewer();
      const second = await connectedViewer();
      let current = first.manager;
      const win = new FakeTarget();
      bindPageLifecycle({ win, getManager: () => current });

      first.manager.disconnect('replaced');
      current = second.manager;
      win.fire('pagehide', { persisted: false });
      await flush();

      assert.equal(first.logs.filter((l) => l.e === 'disconnected_by_viewer').length, 1, 'old manager: only its own replace');
      assert.equal(second.logs.filter((l) => l.e === 'disconnected_by_viewer').length, 1, 'new manager ended once');
    });
  });
});

describe('SessionChannels', () => {
  const mk = () => {
    const closes = [];
    const channel = (name) => ({ close: () => closes.push(name) });
    const peer = (name) => ({ close: () => closes.push(name) });
    return { closes, channel, peer };
  };

  test('release() is idempotent: each channel and the peer close at most once', () => {
    const { closes, channel, peer } = mk();
    const s = new SessionChannels();
    s.setPeer(peer('peer'));
    s.setChannel('mouse', channel('mouse'));
    s.setChannel('keyboard', channel('keyboard'));
    assert.equal(s.release(), true);
    assert.equal(s.release(), false);
    s.release({ closePeer: false });
    assert.deepEqual(closes, ['mouse', 'keyboard', 'peer']);
  });

  test('closePeer:false (the manager already closed it) closes only the channels', () => {
    const { closes, channel, peer } = mk();
    const s = new SessionChannels();
    s.setPeer(peer('peer'));
    s.setChannel('mouse', channel('mouse'));
    s.release({ closePeer: false });
    assert.deepEqual(closes, ['mouse']);
  });

  test('a replaced peer/channel is closed, and a stale channel is no longer "current" (late events are ignored)', () => {
    const { closes, channel, peer } = mk();
    const s = new SessionChannels();
    const oldMouse = channel('old-mouse');
    s.setPeer(peer('old-peer'));
    s.setChannel('mouse', oldMouse);
    s.setPeer(peer('new-peer'));
    assert.deepEqual(closes, ['old-mouse', 'old-peer']);
    assert.equal(s.isCurrent('mouse', oldMouse), false);
    const newMouse = channel('new-mouse');
    s.setChannel('mouse', newMouse);
    assert.equal(s.isCurrent('mouse', newMouse), true);
    assert.equal(s.isCurrent('mouse', oldMouse), false);
    s.setChannel('mouse', newMouse); // same channel again: not closed
    assert.deepEqual(closes, ['old-mouse', 'old-peer']);
  });
});

describe('passive event listeners (preventDefault must really cancel)', () => {
  /**
   * Browser model: a listener registered with passive:true cannot cancel the event (Chrome logs "Unable to
   * preventDefault inside passive event listener invocation"). An event nobody cancelled gets the browser's
   * default action: a horizontal wheel / swipe is history-back, a downward touch drag is pull-to-refresh.
   */
  class FakeSurface {
    constructor() { this.listeners = []; this.consoleErrors = []; this.browserDefaults = []; }
    addEventListener(type, fn, opts) { this.listeners.push({ type, fn, passive: !!(opts && opts.passive) }); }
    removeEventListener(type, fn) { this.listeners = this.listeners.filter((l) => !(l.type === type && l.fn === fn)); }
    dispatch(type, props = {}) {
      const surface = this;
      let prevented = false;
      for (const l of this.listeners.filter((x) => x.type === type)) {
        const event = {
          type, ...props,
          preventDefault() {
            if (l.passive) surface.consoleErrors.push('Unable to preventDefault inside passive event listener invocation');
            else prevented = true;
          },
        };
        l.fn(event);
      }
      if (!prevented) this.browserDefaults.push(type === 'wheel' ? 'history-back-swipe' : 'pull-to-refresh');
      return prevented;
    }
  }
  /** What React does: one PASSIVE root listener per event type. */
  const reactStyleAttach = (surface, handlers) => {
    for (const type of ['touchstart', 'touchmove', 'wheel']) {
      surface.addEventListener(type, (e) => { e.preventDefault(); handlers[type](e); }, { passive: true });
    }
  };

  test('REPRODUCED: React-style (passive) wheel / touch listeners cannot cancel -> console error, and the browser gesture runs', () => {
    const surface = new FakeSurface();
    const seen = [];
    reactStyleAttach(surface, { touchstart: (e) => seen.push(e.type), touchmove: (e) => seen.push(e.type), wheel: (e) => seen.push(e.type) });

    assert.equal(surface.dispatch('wheel', { deltaX: -120 }), false);
    assert.equal(surface.dispatch('touchmove'), false);
    assert.equal(surface.dispatch('touchstart'), false);

    assert.deepEqual(seen, ['wheel', 'touchmove', 'touchstart'], 'the handlers ran (input was forwarded)...');
    assert.equal(surface.consoleErrors.length, 3, '...but each preventDefault() produced the console error');
    assert.deepEqual(surface.browserDefaults, ['history-back-swipe', 'pull-to-refresh', 'pull-to-refresh'], '...and the browser navigated / refreshed');
  });

  test('FIXED: attachInputGuards registers non-passive listeners, so the events are cancelled and the page stays put', () => {
    const surface = new FakeSurface();
    const seen = [];
    attachInputGuards(surface, () => ({ touchstart: (e) => seen.push(e.type), touchmove: (e) => seen.push(e.type), wheel: (e) => seen.push(e.type) }));

    assert.ok(surface.listeners.length === 3 && surface.listeners.every((l) => l.passive === false), 'all registered passive:false');
    assert.equal(surface.dispatch('wheel', { deltaX: -120 }), true);
    assert.equal(surface.dispatch('touchmove'), true);
    assert.equal(surface.dispatch('touchstart'), true);

    assert.deepEqual(seen, ['wheel', 'touchmove', 'touchstart'], 'input is still forwarded');
    assert.deepEqual(surface.consoleErrors, []);
    assert.deepEqual(surface.browserDefaults, []);
  });

  test('handlers are read at event time (re-renders need no re-registration) and detach removes everything', () => {
    const surface = new FakeSurface();
    let handlers = { wheel: () => { handlers.calls.old += 1; } };
    handlers.calls = { old: 0, new: 0 };
    const detach = attachInputGuards(surface, () => handlers);
    surface.dispatch('wheel');
    handlers = { wheel: () => { handlers.calls.new += 1; }, calls: handlers.calls };
    surface.dispatch('wheel');
    assert.deepEqual(handlers.calls, { old: 1, new: 1 });
    assert.equal(surface.listeners.length, 3, 'still exactly one listener per type');

    detach();
    assert.equal(surface.listeners.length, 0);
    assert.doesNotThrow(() => attachInputGuards(null, () => ({}))(), 'a missing element is harmless');
  });
});
