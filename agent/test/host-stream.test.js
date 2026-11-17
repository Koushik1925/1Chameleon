'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildCaptureConstraints,
    captureHeightForPreset,
    configureTrack,
    preferCodec,
    applyEncoderTarget,
    StreamTuner
} = require('../src/lib/hostStream');

const SDP = [
    'v=0',
    'm=video 9 UDP/TLS/RTP/SAVPF 96 97 102 103 104',
    'a=rtpmap:96 VP8/90000',
    'a=rtpmap:97 rtx/90000',
    'a=rtpmap:102 H264/90000',
    'a=rtpmap:103 rtx/90000',
    'a=rtpmap:104 H264/90000',
    ''
].join('\r\n');

test('capture constraints ask for the streamed size at 30 fps and never impose a minimum size', () => {
    const c = buildCaptureConstraints('screen:1:0', 720).video.mandatory;
    assert.equal(c.chromeMediaSource, 'desktop');
    assert.equal(c.chromeMediaSourceId, 'screen:1:0');
    assert.equal(c.maxHeight, 720);
    assert.equal(c.maxWidth, 1280);
    assert.equal(c.maxFrameRate, 30);
    assert.equal('minWidth' in c, false, 'a minimum size breaks capture on small screens');
    assert.equal(buildCaptureConstraints('x', 1080).video.mandatory.maxWidth, 1920);
});

test('only the Quality preset captures at 1080p', () => {
    assert.equal(captureHeightForPreset('quality'), 1080);
    assert.equal(captureHeightForPreset('balanced'), 720);
    assert.equal(captureHeightForPreset('performance'), 720);
});

test("screen tracks use contentHint 'detail' (measured: 'motion' collapsed resolution to 180-360p, 'text' fell to ~14 fps)", () => {
    const track = {};
    configureTrack(track);
    assert.equal(track.contentHint, 'detail');
    assert.doesNotThrow(() => configureTrack(Object.freeze({})), 'an unsupported/frozen track must not throw');
});

test('preferCodec moves the wanted codec to the front of the m=video line and leaves everything else intact', () => {
    const h264 = preferCodec(SDP, 'H264');
    assert.match(h264, /m=video 9 UDP\/TLS\/RTP\/SAVPF 102 104 96 97 103/);
    const vp8 = preferCodec(SDP, 'vp8');
    assert.match(vp8, /m=video 9 UDP\/TLS\/RTP\/SAVPF 96 97 102 103 104/);
});

test('preferCodec returns the SDP untouched when the codec is not offered, so negotiation can never break', () => {
    assert.equal(preferCodec(SDP, 'AV1'), SDP);
});

function fakeSender(rejectFields = []) {
    const sent = [];
    return {
        sent,
        track: { kind: 'video' },
        getParameters: () => ({ encodings: [{}] }),
        async setParameters(params) {
            const enc = params.encodings[0];
            for (const field of rejectFields) {
                if (field in enc) throw new TypeError(`${field} not supported`);
            }
            sent.push({ ...enc });
        }
    };
}

const TARGET = { maxBitrate: 2_000_000, maxFramerate: 30, scaleResolutionDownBy: 1.5 };

test('applyEncoderTarget sets bitrate, frame rate and downscale in one call when the browser supports them', async () => {
    const sender = fakeSender();
    const result = await applyEncoderTarget(sender, TARGET);
    assert.equal(result.ok, true);
    assert.deepEqual(sender.sent, [{ maxBitrate: 2_000_000, maxFramerate: 30, scaleResolutionDownBy: 1.5 }]);
});

test('applyEncoderTarget drops unsupported fields one at a time instead of failing the whole update', async () => {
    const noScale = fakeSender(['scaleResolutionDownBy']);
    assert.deepEqual((await applyEncoderTarget(noScale, TARGET)).applied, { maxBitrate: 2_000_000, maxFramerate: 30 });

    const bitrateOnly = fakeSender(['scaleResolutionDownBy', 'maxFramerate']);
    assert.deepEqual((await applyEncoderTarget(bitrateOnly, TARGET)).applied, { maxBitrate: 2_000_000 });
});

test('applyEncoderTarget never throws, even when nothing is accepted or there is no sender', async () => {
    const hopeless = fakeSender(['maxBitrate', 'maxFramerate', 'scaleResolutionDownBy']);
    assert.equal((await applyEncoderTarget(hopeless, TARGET)).ok, false);
    assert.equal((await applyEncoderTarget(null, TARGET)).ok, false);
});

// ── StreamTuner ──────────────────────────────────────────────────────────────────────────────────────────

function statsReport({ framesEncoded, bytesSent, packetsSent, packetsLost = 0, availableOutgoingBitrate = 20_000_000, rtt = 0.03, limitation = 'none' }) {
    const entries = [
        { id: 'o', type: 'outbound-rtp', kind: 'video', framesEncoded, totalEncodeTime: framesEncoded * 0.005, bytesSent, packetsSent, frameWidth: 1280, frameHeight: 720, qualityLimitationReason: limitation, encoderImplementation: 'libvpx', powerEfficientEncoder: false },
        { id: 'ri', type: 'remote-inbound-rtp', kind: 'video', packetsLost, roundTripTime: rtt },
        { id: 't', type: 'transport', selectedCandidatePairId: 'p' },
        { id: 'p', type: 'candidate-pair', localCandidateId: 'l', remoteCandidateId: 'r', availableOutgoingBitrate, currentRoundTripTime: rtt },
        { id: 'l', type: 'local-candidate', candidateType: 'host' },
        { id: 'r', type: 'remote-candidate', candidateType: 'host' }
    ];
    return { forEach: (fn) => entries.forEach(fn) };
}

function fakePeer(sender) {
    const peer = {
        connectionState: 'connected',
        reports: [],
        getSenders: () => [sender],
        async getStats() { return peer.reports.shift() || statsReport({ framesEncoded: 0, bytesSent: 0, packetsSent: 0 }); }
    };
    return peer;
}

function makeTuner(overrides = {}) {
    const clock = { t: 5_000_000 };
    const sender = fakeSender();
    const peer = fakePeer(sender);
    const messages = [];
    const logs = [];
    const tuner = new StreamTuner({
        getPeer: () => peer,
        preset: 'balanced',
        now: () => clock.t,
        sendToViewer: (m) => messages.push(m),
        log: (event, fields) => logs.push([event, fields]),
        setIntervalFn: () => 1,
        clearIntervalFn: () => {},
        ...overrides
    });
    tuner.captureHeight = 720;
    // advance one second and feed one stats snapshot through a manual tick
    let frames = 0, bytes = 0, packets = 0, lost = 0;
    const second = async (opts = {}) => {
        clock.t += 1000;
        frames += 30; bytes += opts.bytes ?? 250_000; packets += 200; lost += opts.lost ?? 0;
        peer.reports.push(statsReport({ framesEncoded: frames, bytesSent: bytes, packetsSent: packets, packetsLost: lost, ...opts.report }));
        await tuner.tick();
    };
    return { tuner, sender, peer, messages, logs, clock, second };
}

test('starting the tuner applies the preset target (720p30, ~2 Mbps start) to the sender immediately', async () => {
    const { tuner, sender } = makeTuner();
    await tuner.start();
    assert.equal(sender.sent.length, 1);
    assert.equal(sender.sent[0].maxBitrate, 2_000_000);
    assert.equal(sender.sent[0].maxFramerate, 30);
    assert.equal(sender.sent[0].scaleResolutionDownBy, 1);
});

test('under sustained packet loss the tuner lowers the encoder target through setParameters', async () => {
    const { tuner, sender, second } = makeTuner();
    await tuner.start();
    const before = sender.sent.length;
    for (let i = 0; i < 4; i++) await second({ lost: 40 });          // ~17% loss every second
    assert.ok(sender.sent.length > before, 'a lower target was applied');
    const last = sender.sent[sender.sent.length - 1];
    assert.ok(last.maxBitrate < 2_000_000 || last.scaleResolutionDownBy > 1, 'bitrate or resolution came down');
    assert.ok(tuner.summary().changes >= 1);
});

test('a healthy link produces no churn: no setParameters calls beyond the initial one and the gradual bitrate ramp', async () => {
    const { tuner, sender, second } = makeTuner();
    await tuner.start();
    for (let i = 0; i < 12; i++) await second();
    const resolutionChanges = new Set(sender.sent.map((p) => p.scaleResolutionDownBy));
    assert.equal(resolutionChanges.size, 1, 'resolution never changed on a healthy link');
    assert.ok(sender.sent.length <= 6, `expected only ramp updates, saw ${sender.sent.length}`);
});

test('changing to Quality restarts capture at 1080p, then re-applies scaling for the new size', async () => {
    const heights = [];
    const { tuner, sender } = makeTuner({ onCaptureHeightChange: (h) => { heights.push(h); } });
    await tuner.start();
    await tuner.setPreset('quality');
    assert.deepEqual(heights, [1080]);
    assert.equal(tuner.summary().preset, 'quality');
    await tuner.setCaptureHeight(1080);
    assert.equal(sender.sent[sender.sent.length - 1].scaleResolutionDownBy, 1);

    await tuner.setPreset('balanced');
    assert.deepEqual(heights, [1080, 720], 'switching back restarts capture at 720p');
});

test('switching between presets that share a capture size does not restart capture', async () => {
    const heights = [];
    const { tuner } = makeTuner({ onCaptureHeightChange: (h) => { heights.push(h); } });
    await tuner.start();
    await tuner.setPreset('performance');
    assert.deepEqual(heights, []);
});

test('viewer stats are only sent while the viewer has subscribed (overlay open)', async () => {
    const { tuner, messages, second } = makeTuner();
    await tuner.start();
    await second();
    assert.equal(messages.length, 0);

    tuner.setStatsSubscribed(true);
    await second();
    assert.equal(messages.length, 1);
    assert.equal(messages[0].type, 'host_stats');
    assert.equal(messages[0].width, 1280);
    assert.equal(messages[0].route, 'direct');

    tuner.setStatsSubscribed(false);
    await second();
    assert.equal(messages.length, 1);
});

test('the tuner stays idle until the peer is connected and never overlaps a slow stats call', async () => {
    const { tuner, peer, second } = makeTuner();
    peer.connectionState = 'connecting';
    await second();
    assert.equal(tuner.last, null);

    peer.connectionState = 'connected';
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    peer.getStats = async () => { await gate; return statsReport({ framesEncoded: 30, bytesSent: 1, packetsSent: 1 }); };
    const first = tuner.tick();
    await tuner.tick();                    // second tick while the first is still waiting: must be ignored
    release();
    await first;
    assert.ok(tuner.last);
});

test('a failing stats call is logged and survived', async () => {
    const { tuner, peer, logs } = makeTuner();
    peer.getStats = async () => { throw new Error('closing'); };
    await tuner.tick();
    assert.ok(logs.some(([event]) => event === 'tuner_tick_failed'));
    assert.equal(tuner.busy, false);
});

test('route changes (direct <-> relayed) are logged once per change so relay usage is visible in the agent log', async () => {
    const { tuner, peer, logs, clock } = makeTuner();
    await tuner.start();
    const relayed = (frames) => {
        const r = statsReport({ framesEncoded: frames, bytesSent: frames * 1000, packetsSent: frames });
        const entries = [];
        r.forEach((e) => entries.push(e.id === 'l' ? { ...e, candidateType: 'relay', relayProtocol: 'udp' } : e));
        return { forEach: (fn) => entries.forEach(fn) };
    };
    for (let i = 1; i <= 3; i++) { clock.t += 1000; peer.reports.push(relayed(30 * i)); await tuner.tick(); }
    const routeLogs = logs.filter(([event]) => event === 'stream_route');
    assert.equal(routeLogs.length, 1);
    assert.equal(routeLogs[0][1].route, 'relayed');
    assert.equal(routeLogs[0][1].relayProtocol, 'udp');
});

test('default timers work in a browser-like environment where the global setInterval throws if called as a method', async () => {
    const realSet = globalThis.setInterval;
    const realClear = globalThis.clearInterval;
    globalThis.setInterval = function strictSetInterval() { if (this && this !== globalThis) throw new TypeError('Illegal invocation'); return 1; };
    globalThis.clearInterval = function strictClearInterval() { if (this && this !== globalThis) throw new TypeError('Illegal invocation'); };
    try {
        const tuner = new StreamTuner({ getPeer: () => null });
        await tuner.start();
        assert.doesNotThrow(() => tuner.stop());
    } finally {
        globalThis.setInterval = realSet;
        globalThis.clearInterval = realClear;
    }
});

test('a legacy update_resolution that trails a quality_preset (the current viewer sends both) is ignored; standalone ones still map to a preset', () => {
    const { legacyResolutionToPreset, LEGACY_TWIN_WINDOW_MS } = require('../src/lib/hostStream');
    const t = 1_000_000;
    assert.equal(legacyResolutionToPreset('480p30', t - 50, t), null, 'twin of a preset message just received');
    assert.equal(legacyResolutionToPreset('480p30', 0, t), 'performance', 'older viewer that never sent a preset');
    assert.equal(legacyResolutionToPreset('1080p30', t - LEGACY_TWIN_WINDOW_MS - 1, t), 'quality', 'a later, separate manual choice still works');
});
