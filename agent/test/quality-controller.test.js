'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
    LADDER,
    PRESETS,
    QualityController,
    presetForLegacyLabel,
    extractSample
} = require('../src/lib/qualityController');

/** Deterministic clock + a helper that feeds N one-second samples. */
function setup(preset = 'balanced') {
    const clock = { t: 1_000_000 };
    const qc = new QualityController({ preset, now: () => clock.t });
    const feed = (n, sample) => {
        let last;
        for (let i = 0; i < n; i++) {
            clock.t += 1000;
            last = qc.update(typeof sample === 'function' ? sample(i) : sample);
        }
        return last;
    };
    return { clock, qc, feed };
}

const HEALTHY = { rttMs: 30, loss: 0, availableBps: 10_000_000, qualityLimitationReason: 'none', encodeMs: 5, sentKbps: 2000 };

test('presets start where the spec says: Performance 720p30 ~1.5 Mbps, Balanced 720p30, Quality 1080p30 ~4 Mbps', () => {
    assert.deepEqual(
        ['performance', 'balanced', 'quality'].map((p) => { const t = new QualityController({ preset: p }).target(); return [t.height, t.maxFramerate]; }),
        [[720, 30], [720, 30], [1080, 30]]
    );
    assert.equal(LADDER[PRESETS.performance.ceiling].bitrate, 1_500_000);
    assert.equal(LADDER[PRESETS.balanced.ceiling].bitrate, 2_500_000);
    assert.equal(LADDER[PRESETS.quality.ceiling].bitrate, 4_000_000);
});

test('a new session starts at ~2 Mbps and climbs toward the rung bitrate only while the link stays healthy', () => {
    const { qc, feed } = setup('balanced');
    assert.equal(qc.target().maxBitrate, 2_000_000);
    feed(20, HEALTHY);
    assert.equal(qc.target().maxBitrate, 2_500_000);
    assert.equal(qc.target().label, '720p30');
});

test('scaleResolutionDownBy converts the rung height into an encoder scale for the captured height', () => {
    const qc = new QualityController({ preset: 'balanced' });
    assert.equal(qc.target(1080).scaleResolutionDownBy, 1.5);
    assert.equal(qc.target(720).scaleResolutionDownBy, 1);
    assert.equal(qc.target(480).scaleResolutionDownBy, 1, 'never upscale');
    assert.equal(new QualityController({ preset: 'quality' }).target(1080).scaleResolutionDownBy, 1);
});

test('one noisy second changes nothing; sustained loss steps down', () => {
    const { qc, feed } = setup();
    feed(10, HEALTHY);
    const before = qc.rung;
    feed(1, { ...HEALTHY, loss: 0.2 });
    assert.equal(qc.rung, before, 'a single bad sample must not change quality');
    feed(1, HEALTHY);
    assert.equal(qc.rung, before);

    feed(6, { ...HEALTHY, loss: 0.08 });
    assert.ok(qc.rung > before, 'sustained loss should lower quality');
});

test('rising round-trip time over its own baseline (queueing) steps down even though absolute RTT is modest', () => {
    const { qc, feed } = setup();
    feed(10, HEALTHY);
    const before = qc.rung;
    feed(8, { ...HEALTHY, rttMs: 30 + 140 });
    assert.ok(qc.rung > before);
    assert.equal(qc.target().reason, 'delay');
});

test('a high but STABLE RTT (a distant TURN relay) is not treated as congestion', () => {
    const { qc, feed } = setup();
    feed(30, { ...HEALTHY, rttMs: 180 });
    assert.equal(qc.rung, PRESETS.balanced.ceiling);
});

test('an encoder that cannot keep up (CPU limited) lowers the load', () => {
    const { qc, feed } = setup();
    feed(10, HEALTHY);
    const before = qc.rung;
    feed(6, { ...HEALTHY, qualityLimitationReason: 'cpu' });
    assert.ok(qc.rung > before);
    assert.equal(qc.target().reason, 'encoder');
});

test('slow encodes (over 80% of the frame budget) lower the load', () => {
    const { qc, feed } = setup();
    feed(10, HEALTHY);
    const before = qc.rung;
    feed(6, { ...HEALTHY, encodeMs: 30 });
    assert.ok(qc.rung > before);
});

test('a low bandwidth estimate only counts when the encoder is actually trying to use bandwidth', () => {
    // Static desktop: sends ~150 kbps, so a ~300 kbps estimate says nothing about the link.
    const idle = setup();
    idle.feed(30, { ...HEALTHY, availableBps: 300_000, sentKbps: 150 });
    assert.equal(idle.qc.rung, PRESETS.balanced.ceiling);

    // Busy screen pushing its full cap into a ~600 kbps pipe: that is real congestion.
    const busy = setup();
    busy.feed(12, { ...HEALTHY, availableBps: 600_000, sentKbps: 2000 });
    assert.ok(busy.qc.rung > PRESETS.balanced.ceiling);
});

test('the bandwidth estimate is ignored while it is still ramping up after connect', () => {
    const { qc, feed } = setup();
    feed(6, { ...HEALTHY, availableBps: 300_000, sentKbps: 2000 }); // 6 s < 8 s warm-up
    assert.equal(qc.rung, PRESETS.balanced.ceiling);
});

test('severe congestion drops two rungs at once', () => {
    const { qc, feed } = setup('quality');
    feed(10, HEALTHY);
    feed(3, { ...HEALTHY, loss: 0.3 });
    assert.ok(qc.rung >= PRESETS.quality.ceiling + 2);
});

test('never goes below the lowest rung or above the preset ceiling', () => {
    const { qc, feed } = setup('performance');
    feed(200, { ...HEALTHY, loss: 0.5 });
    assert.equal(qc.rung, LADDER.length - 1);
    feed(600, HEALTHY);
    assert.ok(qc.rung >= PRESETS.performance.ceiling, 'recovery stops at the preset ceiling');
});

test('recovery is gradual and backs off after each retreat, so it cannot oscillate', () => {
    const { clock, qc, feed } = setup('quality');
    feed(10, HEALTHY);

    feed(4, { ...HEALTHY, loss: 0.08 });               // trouble: retreat
    const low = qc.rung;
    assert.ok(low > 0);
    const downAt = clock.t;

    feed(5, HEALTHY);                                   // too soon to trust the link again
    assert.equal(qc.rung, low, 'no upgrade within the cooldown');

    feed(40, HEALTHY);                                  // calm for a long time
    assert.ok(qc.rung < low, 'quality is restored once the link has been calm for a while');
    assert.ok(qc.rung >= low - 1, 'but only one rung at a time');
    assert.ok(clock.t - downAt >= 30_000, 'backed-off cooldown was respected');
});

test('a flapping link (10 s good, 5 s lossy, repeating) causes far fewer changes than naive per-second switching', () => {
    const { clock, qc } = setup('quality');
    let rungChanges = 0;
    let last = qc.rung;
    for (let i = 0; i < 300; i++) {
        clock.t += 1000;
        const bad = i % 15 >= 10;
        qc.update({ ...HEALTHY, loss: bad ? 0.06 : 0 });
        if (qc.rung !== last) { rungChanges += 1; last = qc.rung; }
    }
    // 20 bad episodes in 300 s. A naive controller would change quality ~40 times; the back-off must hold it well under that.
    assert.ok(rungChanges <= 24, `expected controlled changes, saw ${rungChanges} rung changes in 300 s`);
});

test('switching preset applies immediately and resets adaptation state', () => {
    const { qc, feed } = setup('quality');
    feed(6, { ...HEALTHY, loss: 0.3 });
    assert.ok(qc.rung > 0);
    const t = qc.setPreset('performance');
    assert.equal(t.preset, 'performance');
    assert.equal(t.height, 720);
    assert.equal(t.maxBitrate, 1_500_000);
    assert.equal(qc.setPreset('nonsense').preset, 'balanced', 'unknown preset falls back safely');
});

test('legacy update_resolution labels from an older viewer map onto a preset ceiling', () => {
    assert.equal(presetForLegacyLabel('1080p60'), 'quality');
    assert.equal(presetForLegacyLabel('1080p'), 'quality');
    assert.equal(presetForLegacyLabel('720p30'), 'balanced');
    assert.equal(presetForLegacyLabel('720p'), 'balanced');
    assert.equal(presetForLegacyLabel('480p30'), 'performance');
    assert.equal(presetForLegacyLabel(undefined), 'performance');
});

// ── extractSample ────────────────────────────────────────────────────────────────────────────────────────

function fakeReport(entries) {
    return { forEach: (fn) => entries.forEach(fn) };
}

function report({ framesEncoded, totalEncodeTime, bytesSent, packetsSent, packetsLost, relayed }) {
    return fakeReport([
        { id: 'o1', type: 'outbound-rtp', kind: 'video', codecId: 'c1', framesEncoded, totalEncodeTime, bytesSent, packetsSent, frameWidth: 1280, frameHeight: 720, qualityLimitationReason: 'none', encoderImplementation: 'libvpx', powerEfficientEncoder: false },
        { id: 'r1', type: 'remote-inbound-rtp', kind: 'video', packetsLost, roundTripTime: 0.045 },
        { id: 'c1', type: 'codec', mimeType: 'video/VP8' },
        { id: 't1', type: 'transport', selectedCandidatePairId: 'p1' },
        { id: 'p1', type: 'candidate-pair', localCandidateId: 'l1', remoteCandidateId: 'm1', availableOutgoingBitrate: 3_000_000, currentRoundTripTime: 0.05 },
        { id: 'l1', type: 'local-candidate', candidateType: relayed ? 'relay' : 'host', relayProtocol: relayed ? 'udp' : undefined },
        { id: 'm1', type: 'remote-candidate', candidateType: 'srflx' }
    ]);
}

test('extractSample turns two stats snapshots into per-interval rates', () => {
    const first = extractSample(report({ framesEncoded: 100, totalEncodeTime: 0.5, bytesSent: 1_000_000, packetsSent: 1000, packetsLost: 0 }), undefined, 10_000);
    assert.equal(first.sample.sentFps, null, 'no rate on the first snapshot');

    const second = extractSample(report({ framesEncoded: 130, totalEncodeTime: 0.62, bytesSent: 1_250_000, packetsSent: 1200, packetsLost: 10 }), first.state, 11_000);
    assert.equal(Math.round(second.sample.sentFps), 30);
    assert.equal(Math.round(second.sample.encodeMs * 10) / 10, 4);          // 0.12 s / 30 frames
    assert.equal(Math.round(second.sample.sentKbps), 2000);                 // 250 kB in 1 s
    assert.ok(Math.abs(second.sample.loss - 10 / 210) < 1e-9);
    assert.equal(second.sample.rttMs, 45);
    assert.equal(second.sample.availableBps, 3_000_000);
    assert.equal(second.info.codec, 'VP8');
    assert.equal(second.info.route, 'direct');
    assert.equal(second.info.width, 1280);
});

test('extractSample reports a relayed route when either end of the selected pair is a TURN relay candidate', () => {
    const r = extractSample(report({ framesEncoded: 1, totalEncodeTime: 0, bytesSent: 1, packetsSent: 1, packetsLost: 0, relayed: true }), undefined, 1);
    assert.equal(r.info.route, 'relayed');
    assert.equal(r.info.relayProtocol, 'udp');
});

test('extractSample tolerates an empty report (renegotiation) without throwing', () => {
    const r = extractSample(fakeReport([]), undefined, 1);
    assert.equal(r.info.route, 'unknown');
    assert.equal(r.sample.rttMs, null);
});

// ── Regression: the viewer-side ABR dropped a healthy stream to 360p20 ──────────────────────────────────────

// RTT values taken from a real session through a TURN relay (43-106 ms, 0% loss). The old viewer-side controller
// compared the VIEWER's availableOutgoingBitrate (it only sends mouse/keyboard, so it is always tiny) with the rung
// bitrate and stepped 1080p -> 720p60 -> 720p30 -> 480p30 -> 360p20 within ~10 s while the link was fine.
const LIVE_RTTS = [48, 43, 82, 106, 92, 60, 55, 70, 47, 88];

for (const preset of Object.keys(PRESETS)) {
    test(`REGRESSION: a healthy relayed link (RTT 43-106 ms, 0% loss) never leaves the ${preset} ceiling over 3 minutes`, () => {
        const { qc, feed } = setup(preset);
        feed(180, (i) => ({ ...HEALTHY, rttMs: LIVE_RTTS[i % LIVE_RTTS.length], availableBps: 6_000_000, sentKbps: 1800 }));
        assert.equal(qc.rung, PRESETS[preset].ceiling);
        assert.notEqual(LADDER[qc.rung].label, '360p15');
    });
}

test('REGRESSION: a tiny bandwidth estimate on an idle sender (the viewer-style signal) cannot cause a downgrade', () => {
    const { qc, feed } = setup();
    feed(120, (i) => ({ rttMs: LIVE_RTTS[i % LIVE_RTTS.length], loss: 0, availableBps: 60_000, sentKbps: 40, qualityLimitationReason: 'none', encodeMs: 3 }));
    assert.equal(qc.rung, PRESETS.balanced.ceiling);
});

test('REGRESSION: a missing bandwidth estimate (null / 0) never counts as "no bandwidth"', () => {
    const { qc, feed } = setup();
    feed(60, { ...HEALTHY, availableBps: null });
    feed(60, { ...HEALTHY, availableBps: 0 });
    assert.equal(qc.rung, PRESETS.balanced.ceiling);
});

test('quality decisions come only from host-side signals: receiver-reported loss (remote-inbound-rtp) steps down, a healthy report does not', () => {
    const clock = { t: 5_000_000 };
    const qc = new QualityController({ preset: 'balanced', now: () => clock.t });
    let prev;
    let sent = 0;
    let lost = 0;
    let bytes = 0;
    let frames = 0;
    const tick = (lossPerSec) => {
        clock.t += 1000;
        sent += 300; lost += lossPerSec; bytes += 250_000; frames += 30;
        const { sample, state } = extractSample(report({ framesEncoded: frames, totalEncodeTime: frames * 0.006, bytesSent: bytes, packetsSent: sent, packetsLost: lost }), prev, clock.t);
        prev = state;
        return qc.update(sample);
    };
    for (let i = 0; i < 20; i++) tick(0);
    assert.equal(qc.rung, PRESETS.balanced.ceiling, '0% receiver-reported loss keeps full quality');
    let changed = false;
    for (let i = 0; i < 6; i++) changed = tick(30).changed || changed; // 30 of 330 packets lost per second (~9%)
    assert.equal(changed, true, 'receiver-reported loss lowers quality');
    assert.ok(qc.rung > PRESETS.balanced.ceiling);
});
