import test from 'node:test';
import assert from 'node:assert/strict';
import { LatencyTuner, setReceiverLatency, LATENCY } from './latencyTuner.js';
import { buildOverlayLines } from './overlayText.js';
import { perfBus } from './perfBus.js';

const calm = { hasVideo: true, jitterMs: 2, freezeCount: 0, framesDroppedDelta: 0 };
const rough = { hasVideo: true, jitterMs: 35, freezeCount: 0, framesDroppedDelta: 0 };

test('asks for the minimum playout buffer on connect', () => {
  const receiver = { jitterBufferTarget: null, playoutDelayHint: undefined };
  const tuner = new LatencyTuner(receiver);
  assert.equal(tuner.supported, true);
  assert.equal(receiver.jitterBufferTarget, 0);
  assert.equal(receiver.playoutDelayHint, 0);
});

test('a browser with neither knob is left alone and the tuner reports itself unsupported', () => {
  const tuner = new LatencyTuner({});
  assert.equal(tuner.supported, false);
  assert.equal(tuner.update(rough), null);
  assert.equal(setReceiverLatency(null, 0), false);
});

test('a setter that throws (out of range) is swallowed', () => {
  const receiver = {};
  Object.defineProperty(receiver, 'jitterBufferTarget', { set() { throw new RangeError('nope'); }, get() { return 0; }, enumerable: true });
  assert.doesNotThrow(() => setReceiverLatency(receiver, 50));
});

test('one rough second changes nothing; sustained jitter adds a small cushion', () => {
  const receiver = { jitterBufferTarget: null };
  const tuner = new LatencyTuner(receiver);
  tuner.update(rough);
  assert.equal(receiver.jitterBufferTarget, 0);
  tuner.update(rough);
  assert.equal(receiver.jitterBufferTarget, LATENCY.cushionMs);
});

test('new freezes or dropped frames also count as rough', () => {
  const receiver = { jitterBufferTarget: null };
  const tuner = new LatencyTuner(receiver);
  tuner.update({ ...calm, freezeCount: 0 });
  tuner.update({ ...calm, freezeCount: 1 });
  tuner.update({ ...calm, freezeCount: 2 });
  assert.equal(receiver.jitterBufferTarget, LATENCY.cushionMs);

  const other = { jitterBufferTarget: null };
  const t2 = new LatencyTuner(other);
  t2.update({ ...calm, framesDroppedDelta: 5 });
  t2.update({ ...calm, framesDroppedDelta: 5 });
  assert.equal(other.jitterBufferTarget, LATENCY.cushionMs);
});

test('the cushion is only released after a long calm period (no flapping)', () => {
  const receiver = { jitterBufferTarget: null };
  const tuner = new LatencyTuner(receiver);
  tuner.update(rough); tuner.update(rough);
  assert.equal(receiver.jitterBufferTarget, LATENCY.cushionMs);

  for (let i = 0; i < LATENCY.calmSamplesToRelease - 1; i++) tuner.update(calm);
  assert.equal(receiver.jitterBufferTarget, LATENCY.cushionMs, 'still cushioned just before the calm period completes');
  tuner.update(rough);                                          // a hiccup resets the calm counter
  for (let i = 0; i < LATENCY.calmSamplesToRelease - 1; i++) tuner.update(calm);
  assert.equal(receiver.jitterBufferTarget, LATENCY.cushionMs);
  tuner.update(calm);
  assert.equal(receiver.jitterBufferTarget, 0);
});

test('metrics without video (renegotiating) are ignored', () => {
  const receiver = { jitterBufferTarget: null };
  const tuner = new LatencyTuner(receiver);
  tuner.update({ hasVideo: false, jitterMs: 500, freezeCount: 9, framesDroppedDelta: 99 });
  tuner.update({ hasVideo: false, jitterMs: 500, freezeCount: 9, framesDroppedDelta: 99 });
  assert.equal(receiver.jitterBufferTarget, 0);
});

// ── overlay text + perf state ──

const METRICS = {
  fps: 29.6, width: 1280, height: 720, bitrateKbps: 1980, rttMs: 41.2, lossPct: 0.4, jitterMs: 3, decodeMs: 3.1, jitterBufferMs: 12,
  framesDroppedTotal: 3, freezeCount: 0, codec: 'H264', decoder: 'ExternalDecoder (D3D11VideoDecoder)', hardwareDecoder: true,
  route: 'direct', relayProtocol: '', transport: 'udp', candidatePair: 'host↔srflx',
};

test('overlay shows FPS, resolution, bitrate, RTT, loss, route, codec and dropped frames', () => {
  const text = buildOverlayLines(METRICS, null, null, 30).join('\n');
  assert.match(text, /FPS\s+30\s+\(shown 30\)\s+1280×720/);
  assert.match(text, /Bitrate\s+1\.98 Mbps/);
  assert.match(text, /RTT\s+41 ms\s+Loss 0\.4%/);
  assert.match(text, /Route\s+DIRECT P2P udp/);
  assert.match(text, /Codec\s+H264.*HW decode/);
  assert.match(text, /Dropped\s+3 frames/);
  assert.match(text, /no host stats/);
});

test('overlay marks a relayed connection and includes host-side encode time and input latency when known', () => {
  const host = { label: '720p30', preset: 'balanced', encodeMs: 5.2, limit: 'none', targetKbps: 2000, sentKbps: 1900, sentFps: 30, availKbps: 6000, hardwareEncoder: false, encoder: 'OpenH264' };
  const text = buildOverlayLines({ ...METRICS, route: 'relayed', relayProtocol: 'udp' }, host, { rttMs: 48, hostMs: 2 }, null).join('\n');
  assert.match(text, /RELAY \(TURN\/udp\)/);
  assert.match(text, /encode 5\.2 ms/);
  assert.match(text, /SW OpenH264/);
  assert.match(text, /Input\s+48 ms round trip\s+\(host queue 2 ms\)/);
});

test('overlay copes with missing values without printing NaN or undefined', () => {
  const text = buildOverlayLines({ ...METRICS, rttMs: null, decodeMs: null, jitterBufferMs: null, codec: '', decoder: '', width: 0, height: 0, route: 'unknown' }, null, null, null).join('\n');
  assert.doesNotMatch(text, /NaN|undefined|null/);
});

test('perfBus returns host stats and input latency only while fresh', () => {
  perfBus.reset();
  assert.equal(perfBus.getHost(), null);
  perfBus.setHost({ type: 'host_stats', label: '720p30' });
  assert.equal(perfBus.getHost().label, '720p30');
  perfBus.setInputLatency({ rttMs: 40, hostMs: 1 });
  assert.deepEqual(perfBus.getInput(), { rttMs: 40, hostMs: 1 });
  assert.equal(perfBus.getHost(-1), null, 'stale host stats are hidden');
  perfBus.reset();
  assert.equal(perfBus.getInput(), null);
});
