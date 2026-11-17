import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotFromReport, computeMetrics, qualityFromRtt, displayStats, withUnit, StatsMonitor } from './statsMonitor.js';
import { buildOverlayLines } from './overlayText.js';

const reportOf = (entries) => ({ forEach: (fn) => entries.forEach(fn) });

function entries({ framesDecoded, framesDropped = 0, bytesReceived, packetsReceived, packetsLost = 0, rtt = 0.04, route = 'host', relayProtocol, freezeCount = 0,
  totalDecodeTime = 0, jitterBufferDelay = 0, jitterBufferEmittedCount = 0, jitter = 0.002 }) {
  return [
    { id: 'in', type: 'inbound-rtp', kind: 'video', codecId: 'cd', framesDecoded, framesDropped, bytesReceived, packetsReceived, packetsLost, jitter, totalDecodeTime,
      jitterBufferDelay, jitterBufferEmittedCount, freezeCount, frameWidth: 1280, frameHeight: 720, decoderImplementation: 'ExternalDecoder', powerEfficientDecoder: true },
    { id: 'cd', type: 'codec', mimeType: 'video/H264' },
    { id: 'tr', type: 'transport', selectedCandidatePairId: 'pair' },
    { id: 'pair', type: 'candidate-pair', state: 'succeeded', nominated: true, localCandidateId: 'lc', remoteCandidateId: 'rc', currentRoundTripTime: rtt },
    { id: 'lc', type: 'local-candidate', candidateType: route, protocol: 'udp', relayProtocol },
    { id: 'rc', type: 'remote-candidate', candidateType: 'srflx' },
  ];
}

test('two snapshots become per-interval fps, bitrate, loss, decode time and jitter-buffer delay', () => {
  const a = snapshotFromReport(reportOf(entries({ framesDecoded: 100, bytesReceived: 1_000_000, packetsReceived: 1000, packetsLost: 0, totalDecodeTime: 0.5, jitterBufferDelay: 1, jitterBufferEmittedCount: 100 })), 10_000);
  const b = snapshotFromReport(reportOf(entries({ framesDecoded: 130, bytesReceived: 1_250_000, packetsReceived: 1190, packetsLost: 10, totalDecodeTime: 0.62, jitterBufferDelay: 1.6, jitterBufferEmittedCount: 130, framesDropped: 2, freezeCount: 1 })), 11_000);
  const m = computeMetrics(a, b);

  assert.equal(Math.round(m.fps), 30);
  assert.equal(Math.round(m.bitrateKbps), 2000);
  assert.ok(Math.abs(m.lossPct - (10 / 200) * 100) < 1e-9);
  assert.equal(Math.round(m.rttMs), 40);
  assert.equal(Math.round(m.decodeMs * 10) / 10, 4);          // 0.12 s over 30 frames
  assert.equal(Math.round(m.jitterBufferMs), 20);             // 0.6 s over 30 emitted
  assert.equal(m.framesDroppedTotal, 2);
  assert.equal(m.framesDroppedDelta, 2);
  assert.equal(m.freezeCount, 1);
  assert.equal(m.codec, 'H264');
  assert.equal(m.hardwareDecoder, true);
  assert.equal(m.width, 1280);
  assert.equal(m.height, 720);
});

test('route is "direct" for host/srflx pairs and "relayed" when either end is a TURN relay candidate', () => {
  const direct = snapshotFromReport(reportOf(entries({ framesDecoded: 1, bytesReceived: 1, packetsReceived: 1 })), 1);
  assert.equal(direct.route, 'direct');
  const relayed = snapshotFromReport(reportOf(entries({ framesDecoded: 1, bytesReceived: 1, packetsReceived: 1, route: 'relay', relayProtocol: 'tls' })), 1);
  assert.equal(relayed.route, 'relayed');
  assert.equal(relayed.relayProtocol, 'tls');
  assert.equal(computeMetrics(null, relayed).candidatePair, 'relay↔srflx');
});

test('the first poll has no rate (no previous snapshot) and an empty report does not throw', () => {
  const first = computeMetrics(null, snapshotFromReport(reportOf(entries({ framesDecoded: 50, bytesReceived: 5000, packetsReceived: 50 })), 1));
  assert.equal(first.bitrateKbps, null);   // unknown, NOT a fake 0 Mbps
  assert.equal(first.fps, null);
  assert.equal(first.decodeMs, null);

  const empty = computeMetrics(null, snapshotFromReport(reportOf([]), 1));
  assert.equal(empty.hasVideo, false);
  assert.equal(empty.rttMs, null);
  assert.equal(empty.route, 'unknown');
});

test('a counter that goes backwards (new peer / stats reset) never produces negative rates', () => {
  const a = snapshotFromReport(reportOf(entries({ framesDecoded: 500, bytesReceived: 9_000_000, packetsReceived: 5000 })), 1000);
  const b = snapshotFromReport(reportOf(entries({ framesDecoded: 10, bytesReceived: 1000, packetsReceived: 10 })), 2000);
  const m = computeMetrics(a, b);
  assert.equal(m.fps, null);           // not measurable across a reset: unknown, never negative or a fake 0
  assert.equal(m.bitrateKbps, null);
  assert.ok(m.lossPct >= 0);
});

test('connection quality buckets follow round-trip time', () => {
  assert.deepEqual([30, 100, 200, 500].map(qualityFromRtt), ['excellent', 'good', 'fair', 'poor']);
  assert.equal(qualityFromRtt(null), 'good');
});

test('StatsMonitor polls once per interval for ALL subscribers, only while someone is subscribed', async () => {
  let getStatsCalls = 0;
  let framesDecoded = 0;
  const peer = {
    connectionState: 'connected',
    async getStats() { getStatsCalls += 1; framesDecoded += 30; return reportOf(entries({ framesDecoded, bytesReceived: framesDecoded * 1000, packetsReceived: framesDecoded })); },
  };
  let tick = null;
  let cleared = 0;
  const clock = { t: 0 };
  const monitor = new StatsMonitor(peer, {
    now: () => clock.t,
    setIntervalFn: (fn) => { tick = fn; return 7; },
    clearIntervalFn: () => { cleared += 1; tick = null; },
  });

  const seenA = []; const seenB = [];
  const offA = monitor.subscribe((m) => seenA.push(m));
  const offB = monitor.subscribe((m) => seenB.push(m));
  assert.equal(getStatsCalls, 0);

  clock.t += 1000; await monitor.poll();
  clock.t += 1000; await monitor.poll();
  assert.equal(getStatsCalls, 2, 'two subscribers share one poll per tick');
  assert.equal(seenA.length, 2);
  assert.equal(seenB.length, 2);
  assert.equal(Math.round(seenA[1].fps), 30);

  offA();
  assert.equal(cleared, 0, 'still polling for the remaining subscriber');
  offB();
  assert.equal(cleared, 1, 'no subscribers: polling stops');
  assert.equal(tick, null);
});

test('a slow getStats() never stacks up concurrent polls, and one failing listener does not starve the others', async () => {
  let release; let calls = 0;
  const gate = new Promise((r) => { release = r; });
  const peer = { connectionState: 'connected', async getStats() { calls += 1; await gate; return reportOf(entries({ framesDecoded: 1, bytesReceived: 1, packetsReceived: 1 })); } };
  const monitor = new StatsMonitor(peer, { setIntervalFn: () => 1, clearIntervalFn: () => {} });
  const good = [];
  monitor.subscribe(() => { throw new Error('bad listener'); });
  monitor.subscribe((m) => good.push(m));

  const first = monitor.poll();
  await monitor.poll();            // overlapping call is ignored
  release();
  await first;
  assert.equal(calls, 1);
  assert.equal(good.length, 1);
});

test('polling a closed peer is a no-op', async () => {
  let calls = 0;
  const peer = { connectionState: 'closed', async getStats() { calls += 1; return reportOf([]); } };
  const monitor = new StatsMonitor(peer, { setIntervalFn: () => 1, clearIntervalFn: () => {} });
  await monitor.poll();
  assert.equal(calls, 0);
});

test('default timers work in a browser-like environment where the global setInterval throws if called as a method', () => {
  const realSet = globalThis.setInterval;
  const realClear = globalThis.clearInterval;
  globalThis.setInterval = function strictSetInterval() { if (this && this !== globalThis) throw new TypeError('Illegal invocation'); return 1; };
  globalThis.clearInterval = function strictClearInterval() { if (this && this !== globalThis) throw new TypeError('Illegal invocation'); };
  try {
    const monitor = new StatsMonitor({ connectionState: 'connected', getStats: async () => reportOf([]) });
    const off = monitor.subscribe(() => {});
    assert.doesNotThrow(() => off());
  } finally {
    globalThis.setInterval = realSet;
    globalThis.clearInterval = realClear;
  }
});

// ── Regression: toolbar showed "FPS 0 / 0 Mbps" while video was playing ─────────────────────────────────────────
// Real numbers from a captured session: a relayed 720p stream. fps/bitrate must come from framesDecoded / bytesReceived
// deltas, not from the browser's `framesPerSecond` (absent in that report).

const snap = (frames, bytes, t, extra = {}) => snapshotFromReport(reportOf(entries({ framesDecoded: frames, bytesReceived: bytes, packetsReceived: frames * 4, ...extra })), t);

test('REGRESSION: fps and bitrate are derived from framesDecoded / bytesReceived deltas (no framesPerSecond needed)', () => {
  const a = snap(1000, 10_000_000, 50_000);
  const b = snap(1058, 10_725_000, 52_000);              // 58 frames and 725 kB in 2 s
  assert.equal(a.reportedFps, 0);                        // the browser did not report framesPerSecond
  const m = computeMetrics(a, b);
  assert.equal(m.fps, 29);
  assert.equal(m.bitrateKbps, 2900);
  assert.deepEqual(displayStats(m), { ping: '40', fps: '29', bitrate: '2.9' });
});

test('REGRESSION: before the first measured interval the readout is unknown ("—"), not 0', () => {
  assert.deepEqual(displayStats(null), { ping: '—', fps: '—', bitrate: '—' });
  const first = computeMetrics(null, snap(10, 1000, 1));
  assert.deepEqual(displayStats(first), { ping: '40', fps: '—', bitrate: '—' });
  assert.equal(withUnit('—', 'Mbps', ' '), '—');
  assert.equal(withUnit('2.9', 'Mbps', ' '), '2.9 Mbps');
  assert.match(buildOverlayLines(first, null, null, null)[1], /Bitrate +—/);   // overlay: no "0.00 Mbps" either
});

test('no video yet (renegotiating / empty report) is unknown, not 0 fps', () => {
  const none = snapshotFromReport(reportOf([]), 5000);
  const m = computeMetrics(snap(100, 1000, 4000), none);
  assert.equal(m.fps, null);
  assert.equal(m.bitrateKbps, null);
  assert.equal(displayStats(m).fps, '—');
});

test('paused / static video that really received nothing is a measured 0, not unknown', () => {
  const m = computeMetrics(snap(200, 500_000, 1000), snap(200, 500_000, 2000));
  assert.equal(m.fps, 0);
  assert.equal(m.bitrateKbps, 0);
  assert.deepEqual(displayStats(m), { ping: '40', fps: '0', bitrate: '0.0' });
});

test('a reconnect (counters restart) is unknown for one interval, then correct again', () => {
  const before = snap(5000, 90_000_000, 1000);
  const afterReset = snap(12, 20_000, 2000);
  assert.equal(computeMetrics(before, afterReset).fps, null);
  const next = computeMetrics(afterReset, snap(42, 320_000, 3000));
  assert.equal(next.fps, 30);
  assert.equal(next.bitrateKbps, 2400);
});

test('a non-advancing clock cannot divide by zero', () => {
  const m = computeMetrics(snap(10, 1000, 5000), snap(20, 2000, 5000));
  assert.equal(m.fps, null);
});

test('StatsMonitor end to end: unknown on the first poll, real fps and bitrate from the second', async () => {
  const reports = [entries({ framesDecoded: 100, bytesReceived: 1_000_000, packetsReceived: 400 }), entries({ framesDecoded: 130, bytesReceived: 1_375_000, packetsReceived: 520 })];
  let i = 0;
  let clock = 0;
  const peer = { connectionState: 'connected', getStats: async () => reportOf(reports[Math.min(i++, reports.length - 1)]) };
  const monitor = new StatsMonitor(peer, { now: () => (clock += 1000), setIntervalFn: () => 1, clearIntervalFn: () => {} });
  const seen = [];
  monitor.listeners.add((m) => seen.push(displayStats(m)));
  await monitor.poll();
  await monitor.poll();
  assert.deepEqual(seen[0], { ping: '40', fps: '—', bitrate: '—' });
  assert.deepEqual(seen[1], { ping: '40', fps: '30', bitrate: '3.0' });
});
