/**
 * statsMonitor.js — ONE getStats() poller per peer connection, shared by every UI that shows stream health.
 *
 * Before this, the toolbar, the mobile overlay, RemoteView and the adaptive-bitrate loop each polled getStats() on
 * their own timer (four calls per second or two seconds, each walking the whole stats graph). Now a single poll runs
 * about once per second, only while something is subscribed, and everyone reads the same computed metrics.
 *
 * `snapshotFromReport` and `computeMetrics` are pure so they can be unit tested without a browser.
 */

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Reduce an RTCStatsReport to the few fields we need. Tolerates missing reports (renegotiation, no video yet). */
export function snapshotFromReport(report, t) {
  const byId = {};
  let inbound = null;
  let selectedPairId = null;
  report.forEach((r) => {
    byId[r.id] = r;
    if (r.type === 'inbound-rtp' && (r.kind === 'video' || r.mediaType === 'video')) inbound = r;
    else if (r.type === 'transport' && r.selectedCandidatePairId) selectedPairId = r.selectedCandidatePairId;
  });
  let pair = null;
  report.forEach((r) => {
    if (r.type !== 'candidate-pair') return;
    if (selectedPairId ? r.id === selectedPairId : (r.state === 'succeeded' && (r.nominated || !pair))) pair = r;
  });
  const local = pair ? byId[pair.localCandidateId] : null;
  const remote = pair ? byId[pair.remoteCandidateId] : null;
  const codec = inbound && inbound.codecId ? byId[inbound.codecId] : null;
  const relayed = !!((local && local.candidateType === 'relay') || (remote && remote.candidateType === 'relay'));

  return {
    t,
    hasVideo: !!inbound,
    framesDecoded: inbound ? num(inbound.framesDecoded) : 0,
    framesReceived: inbound ? num(inbound.framesReceived) : 0,
    framesDropped: inbound ? num(inbound.framesDropped) : 0,
    bytesReceived: inbound ? num(inbound.bytesReceived) : 0,
    packetsReceived: inbound ? num(inbound.packetsReceived) : 0,
    packetsLost: inbound ? num(inbound.packetsLost) : 0,
    totalDecodeTime: inbound ? num(inbound.totalDecodeTime) : 0,
    jitterBufferDelay: inbound ? num(inbound.jitterBufferDelay) : 0,
    jitterBufferEmittedCount: inbound ? num(inbound.jitterBufferEmittedCount) : 0,
    freezeCount: inbound ? num(inbound.freezeCount) : 0,
    totalFreezesDuration: inbound ? num(inbound.totalFreezesDuration) : 0,
    nackCount: inbound ? num(inbound.nackCount) : 0,
    pliCount: inbound ? num(inbound.pliCount) : 0,
    jitterSec: inbound ? num(inbound.jitter) : 0,
    width: inbound ? num(inbound.frameWidth) : 0,
    height: inbound ? num(inbound.frameHeight) : 0,
    reportedFps: inbound ? num(inbound.framesPerSecond) : 0,
    decoder: inbound ? inbound.decoderImplementation || '' : '',
    hardwareDecoder: inbound ? inbound.powerEfficientDecoder === true : false,
    codec: codec && codec.mimeType ? codec.mimeType.replace(/^video\//i, '') : '',
    rttSec: pair ? (Number.isFinite(pair.currentRoundTripTime) ? pair.currentRoundTripTime
      : (num(pair.responsesReceived) > 0 ? num(pair.totalRoundTripTime) / pair.responsesReceived : null)) : null,
    hasPair: !!pair,
    route: pair ? (relayed ? 'relayed' : 'direct') : 'unknown',
    relayProtocol: relayed && local && local.relayProtocol ? local.relayProtocol : '',
    transport: local && local.protocol ? local.protocol : '',
    localType: local ? local.candidateType || '' : '',
    remoteType: remote ? remote.candidateType || '' : ''
  };
}

const perFrameMs = (num_, den) => (den > 0 ? (num_ / den) * 1000 : null);

/**
 * True when `cur` is a usable continuation of `prev`: both saw a video stream, time moved forward and no counter went
 * backwards (a backwards counter means a new peer / renegotiated receiver / stats reset - the rate across it is junk).
 */
function hasValidInterval(prev, cur) {
  if (!prev || !prev.hasVideo || !cur.hasVideo) return false;
  if (!(cur.t > prev.t)) return false;
  return cur.framesDecoded >= prev.framesDecoded && cur.bytesReceived >= prev.bytesReceived;
}

/**
 * Per-interval metrics from two snapshots (prev may be null on the first poll).
 *
 * `fps` and `bitrateKbps` are `null` ("unknown") until a real interval has been measured: the first poll, no video
 * yet, or a counter reset after a reconnect. They are 0 only when video really was received at 0 (paused / static).
 * They come from framesDecoded / bytesReceived deltas, never from the browser's `framesPerSecond`, which is often
 * missing or 0 even while video plays.
 */
export function computeMetrics(prev, cur) {
  const valid = hasValidInterval(prev, cur);
  const dt = valid ? Math.max(0.001, (cur.t - prev.t) / 1000) : 0;
  const d = (k) => (prev ? Math.max(0, cur[k] - prev[k]) : 0);
  const lostDelta = d('packetsLost');
  const recvDelta = d('packetsReceived');
  const framesDelta = d('framesDecoded');
  return {
    hasVideo: cur.hasVideo,
    fps: valid ? framesDelta / dt : null,
    width: cur.width,
    height: cur.height,
    bitrateKbps: valid ? (d('bytesReceived') * 8) / dt / 1000 : null,
    rttMs: cur.rttSec === null ? null : cur.rttSec * 1000,
    lossPct: valid && recvDelta + lostDelta > 0 ? (lostDelta / (recvDelta + lostDelta)) * 100 : 0,
    jitterMs: cur.jitterSec * 1000,
    decodeMs: valid ? perFrameMs(cur.totalDecodeTime - prev.totalDecodeTime, framesDelta) : null,
    jitterBufferMs: valid ? perFrameMs(cur.jitterBufferDelay - prev.jitterBufferDelay, cur.jitterBufferEmittedCount - prev.jitterBufferEmittedCount) : null,
    framesDroppedTotal: cur.framesDropped,
    framesDroppedDelta: d('framesDropped'),
    freezeCount: cur.freezeCount,
    freezeSeconds: cur.totalFreezesDuration,
    nackDelta: d('nackCount'),
    pliDelta: d('pliCount'),
    codec: cur.codec,
    decoder: cur.decoder,
    hardwareDecoder: cur.hardwareDecoder,
    route: cur.route,
    relayProtocol: cur.relayProtocol,
    transport: cur.transport,
    candidatePair: cur.localType && cur.remoteType ? `${cur.localType}↔${cur.remoteType}` : ''
  };
}

/**
 * Strings for the toolbar / mobile overlay. "—" means "not measured yet" - never a fake 0.
 * (`Math.round(null)` and `null / 1000` are both 0, which is exactly the bug this guards against.)
 */
export function displayStats(m) {
  const known = (v) => typeof v === 'number' && Number.isFinite(v);
  return {
    ping: m && known(m.rttMs) ? String(Math.round(m.rttMs)) : '—',
    fps: m && known(m.fps) ? String(Math.round(m.fps)) : '—',
    bitrate: m && known(m.bitrateKbps) ? (m.bitrateKbps / 1000).toFixed(1) : '—'
  };
}

/** Append a unit only to a measured value ("61" -> "61ms"), leaving the "unknown" dash bare. */
export const withUnit = (value, unit, gap = '') => (value === '—' ? value : `${value}${gap}${unit}`);

/** Coarse connection quality for badges, from round-trip time. */
export function qualityFromRtt(rttMs) {
  if (rttMs === null || rttMs === undefined) return 'good';
  if (rttMs < 80) return 'excellent';
  if (rttMs < 150) return 'good';
  if (rttMs < 300) return 'fair';
  return 'poor';
}

export class StatsMonitor {
  // The timer functions are wrapped: calling the bare global as `this.fn()` throws "Illegal invocation" in browsers.
  constructor(peer, { intervalMs = 1000, now = () => Date.now(), setIntervalFn = (...a) => setInterval(...a), clearIntervalFn = (...a) => clearInterval(...a) } = {}) {
    this.peer = peer;
    this.intervalMs = intervalMs;
    this.now = now;
    this.setIntervalFn = setIntervalFn;
    this.clearIntervalFn = clearIntervalFn;
    this.listeners = new Set();
    this.timer = null;
    this.prev = null;
    this.last = null;
    this.polling = false;
  }

  /** Listener is called with the latest metrics immediately (if any) and then about once per second. */
  subscribe(fn) {
    this.listeners.add(fn);
    if (this.last) fn(this.last);
    if (!this.timer) this.start();
    return () => {
      this.listeners.delete(fn);
      if (this.listeners.size === 0) this.stop();
    };
  }

  start() {
    if (this.timer) return;
    this.timer = this.setIntervalFn(() => this.poll(), this.intervalMs);
  }

  stop() {
    if (this.timer) this.clearIntervalFn(this.timer);
    this.timer = null;
    this.prev = null; // the next start must not compute a rate across the gap
  }

  async poll() {
    if (this.polling) return; // a slow getStats() must never stack up
    const peer = this.peer;
    if (!peer || peer.connectionState === 'closed') return;
    this.polling = true;
    try {
      const report = await peer.getStats();
      const snap = snapshotFromReport(report, this.now());
      const metrics = computeMetrics(this.prev, snap);
      this.prev = snap;
      this.last = metrics;
      for (const fn of this.listeners) {
        try { fn(metrics); } catch { /* a bad listener must not stop the others */ }
      }
    } catch {
      /* stats are best effort (peer closing / renegotiating) */
    } finally {
      this.polling = false;
    }
  }
}

const monitors = new WeakMap();

/** The shared monitor for a peer (created on first use). */
export function getStatsMonitor(peer) {
  let monitor = monitors.get(peer);
  if (!monitor) {
    monitor = new StatsMonitor(peer);
    monitors.set(peer, monitor);
  }
  return monitor;
}
