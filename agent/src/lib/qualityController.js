'use strict';
/**
 * Host-side adaptive quality controller.
 *
 * Why it lives on the HOST: only the sender sees the signals that matter for a screen stream - the bandwidth
 * estimate (availableOutgoingBitrate), encode time, qualityLimitationReason, and the loss the viewer reports back
 * (remote-inbound-rtp). Before, a second controller ran in the viewer (guessing from receive-side stats) and sent
 * `update_resolution` messages that fought this one over the same encoder.
 *
 * Principles
 *  - Responsiveness over fidelity: when in doubt lower resolution / fps, never let a queue build.
 *  - Downgrade fast (2 bad seconds), upgrade slowly (10 good seconds), and back off after every downgrade so the
 *    stream cannot oscillate between two rungs.
 *  - Only the encoder is steered (maxBitrate, maxFramerate, scaleResolutionDownBy via RTCRtpSender.setParameters);
 *    the capture stays at one size so a rung change never restarts capture or renegotiates.
 *
 * Pure logic, no WebRTC/Electron imports: unit tested in test/quality-controller.test.js.
 */

// Best first. `height` is the encoded height (the encoder scales the captured frame down to it).
const LADDER = [
    { label: '1080p30', height: 1080, fps: 30, bitrate: 4_000_000 },
    { label: '720p30', height: 720, fps: 30, bitrate: 2_500_000 },
    { label: '720p30-lite', height: 720, fps: 30, bitrate: 1_500_000 },
    { label: '540p30', height: 540, fps: 30, bitrate: 1_000_000 },
    { label: '540p20', height: 540, fps: 20, bitrate: 700_000 },
    { label: '360p15', height: 360, fps: 15, bitrate: 400_000 }
];

// A preset is the BEST rung the controller may reach (`ceiling` is an index into LADDER) plus how fast to try.
// Treat these as starting targets: the controller goes lower whenever the network or the encoder cannot keep up.
const PRESETS = {
    performance: { label: 'Performance', ceiling: 2 }, // 720p, 30 fps, ~1.5 Mbps
    balanced: { label: 'Balanced', ceiling: 1 },       // 720p, 30 fps, ~2.5 Mbps
    quality: { label: 'Quality', ceiling: 0 }          // 1080p, 30 fps, ~4 Mbps
};
const DEFAULT_PRESET = 'balanced';
// A new session starts conservatively (~2 Mbps) and climbs to the rung's bitrate while the link stays healthy.
const START_BITRATE_CAP = 2_000_000;

const CFG = {
    emaAlpha: 0.3,
    badSamplesToDown: 2,
    goodSamplesToUp: 10,
    minHoldDownMs: 3000,        // never change twice within this window when stepping down
    baseUpCooldownMs: 15000,    // minimum time at a rung before trying a better one
    maxUpCooldownMs: 60000,
    cooldownDecayMs: 60000,     // this long without a downgrade resets the back-off
    lossBad: 0.03,
    lossSevere: 0.10,
    lossGood: 0.01,
    bloatBadMs: 80,             // RTT above the lowest seen = queueing somewhere on the path
    bloatGoodMs: 40,
    availBadRatio: 0.85,        // BWE below 85% of the rung bitrate cannot carry that rung
    availSevereRatio: 0.5,
    availUpRatio: 1.3,          // BWE must exceed the NEXT rung's bitrate by 30% before stepping up
    encodeBudgetRatio: 0.8,     // encode time above 80% of the frame interval = encoder is the bottleneck
    warmupMs: 8000,             // ignore the bandwidth estimate while it is still ramping up
    demandRatio: 0.6,           // sending >= 60% of the cap = the estimate is a real limit
    appLimitedRatio: 0.5,       // sending < 50% of the cap = nothing to learn from the estimate
    rampGrowth: 1.25            // bitrate cap grows 25% per healthy window until it reaches the rung bitrate
};

function clampPreset(name) {
    return Object.prototype.hasOwnProperty.call(PRESETS, name) ? name : DEFAULT_PRESET;
}

/** Map a legacy `update_resolution` label from an older viewer onto a preset ceiling. */
function presetForLegacyLabel(label) {
    const l = String(label || '').toLowerCase();
    if (l.startsWith('1080')) return 'quality';
    if (l.startsWith('720p60') || l.startsWith('720p30') || l === '720p' || l === '720') return 'balanced';
    return 'performance'; // 480p / 360p / anything unknown: be conservative
}

class QualityController {
    /**
     * @param {object} [opts]
     * @param {string} [opts.preset]
     * @param {function} [opts.now]  ms clock (injectable for tests)
     */
    constructor({ preset = DEFAULT_PRESET, now = () => Date.now() } = {}) {
        this.now = now;
        this.setPreset(preset, { silent: true });
    }

    setPreset(name, { silent = false } = {}) {
        this.preset = clampPreset(name);
        this.ceiling = PRESETS[this.preset].ceiling;
        this.rung = this.ceiling;                 // start at the best rung the preset allows
        this.bitrateCap = Math.min(LADDER[this.rung].bitrate, START_BITRATE_CAP);
        this.badSamples = 0;
        this.goodSamples = 0;
        this.upCooldownMs = CFG.baseUpCooldownMs;
        this.startedAt = this.now();
        this.lastChangeAt = this.startedAt;
        this.lastDownAt = 0;
        this.cpuStreak = 0;
        this.ema = { rtt: null, loss: 0, avail: null };
        this.minRtt = Infinity;
        this.lastReason = silent ? 'init' : 'preset';
        return this.target();
    }

    /** The encoder settings for the current rung. `captureHeight` converts the target height into a scale factor. */
    target(captureHeight) {
        const rung = LADDER[this.rung];
        const bitrate = Math.min(this.bitrateCap, rung.bitrate);
        return {
            preset: this.preset,
            rung: this.rung,
            label: rung.label,
            height: rung.height,
            maxFramerate: rung.fps,
            maxBitrate: Math.round(bitrate),
            scaleResolutionDownBy: captureHeight ? Math.max(1, captureHeight / rung.height) : 1,
            reason: this.lastReason
        };
    }

    /**
     * Feed one ~1 s sample. Returns { changed, target }.
     * sample: { rttMs, loss (0..1, over this interval), availableBps, qualityLimitationReason,
     *           encodeMs (avg per frame), sentFps, captureHeight }
     */
    update(sample) {
        const now = this.now();
        const s = sample || {};
        const a = CFG.emaAlpha;
        const rtt = Number.isFinite(s.rttMs) && s.rttMs > 0 ? s.rttMs : null;
        const loss = Number.isFinite(s.loss) ? Math.max(0, s.loss) : 0;
        const avail = Number.isFinite(s.availableBps) && s.availableBps > 0 ? s.availableBps : null;

        if (rtt !== null) {
            this.minRtt = Math.min(this.minRtt, rtt);
            this.ema.rtt = this.ema.rtt === null ? rtt : a * rtt + (1 - a) * this.ema.rtt;
        }
        this.ema.loss = a * loss + (1 - a) * this.ema.loss;
        if (avail !== null) this.ema.avail = this.ema.avail === null ? avail : a * avail + (1 - a) * this.ema.avail;

        const rung = LADDER[this.rung];
        const frameBudgetMs = 1000 / rung.fps;
        const bloat = this.ema.rtt !== null && Number.isFinite(this.minRtt) ? this.ema.rtt - this.minRtt : 0;

        this.cpuStreak = s.qualityLimitationReason === 'cpu' ? this.cpuStreak + 1 : 0;
        const encoderBound = this.cpuStreak >= 2 || (Number.isFinite(s.encodeMs) && s.encodeMs > frameBudgetMs * CFG.encodeBudgetRatio);
        // Loss must be present NOW and sustained: the smoothed value alone would keep one bad second "bad" for the next.
        const lossy = loss > CFG.lossBad && this.ema.loss > CFG.lossBad * 0.5;
        const bloated = bloat > CFG.bloatBadMs;
        // The bandwidth estimate only means something while we are actually trying to use bandwidth. A mostly static
        // desktop sends very little, the estimate stays low ("application limited") and says nothing about the link.
        const sentBps = Number.isFinite(s.sentKbps) ? s.sentKbps * 1000 : null;
        const demanding = sentBps === null || sentBps >= Math.min(this.bitrateCap, rung.bitrate) * CFG.demandRatio;
        const appLimited = sentBps !== null && sentBps < Math.min(this.bitrateCap, rung.bitrate) * CFG.appLimitedRatio;
        const warm = now - this.startedAt >= CFG.warmupMs; // the estimate starts near 300 kbps and ramps for several seconds
        const bweLow = warm && demanding && this.ema.avail !== null
            && this.ema.avail < rung.bitrate * CFG.availBadRatio && this.ema.avail < this.bitrateCap * 1.1;
        const severe = this.ema.loss > CFG.lossSevere
            || (warm && demanding && this.ema.avail !== null && this.ema.avail < rung.bitrate * CFG.availSevereRatio);

        const better = this.rung > this.ceiling ? LADDER[this.rung - 1] : null;
        const headroom = better ? (appLimited || this.ema.avail === null || this.ema.avail > better.bitrate * CFG.availUpRatio) : true;
        const healthy = !encoderBound && this.ema.loss < CFG.lossGood && bloat < CFG.bloatGoodMs && !bweLow;

        if (lossy || bloated || bweLow || encoderBound) {
            this.badSamples += 1;
            this.goodSamples = 0;
            if (this.badSamples >= CFG.badSamplesToDown && now - this.lastChangeAt >= CFG.minHoldDownMs) {
                this.badSamples = 0;
                const why = encoderBound ? 'encoder' : lossy ? 'loss' : bloated ? 'delay' : 'bandwidth';
                return this.step(severe ? 2 : 1, why, now);
            }
        } else if (healthy) {
            this.badSamples = 0;
            this.goodSamples += 1;
            // Calm for a long time: the back-off from earlier downgrades is no longer warranted.
            if (this.lastDownAt && now - this.lastDownAt > CFG.cooldownDecayMs) {
                this.upCooldownMs = CFG.baseUpCooldownMs;
            }
            // Within a rung, let the bitrate cap climb gradually toward the rung's bitrate.
            if (this.bitrateCap < rung.bitrate && this.goodSamples % 3 === 0) {
                this.bitrateCap = Math.min(rung.bitrate, Math.round(this.bitrateCap * CFG.rampGrowth));
                this.lastReason = 'ramp';
                return { changed: true, target: this.target(s.captureHeight) };
            }
            if (this.goodSamples >= CFG.goodSamplesToUp && this.rung > this.ceiling && headroom
                && now - this.lastChangeAt >= this.upCooldownMs) {
                this.goodSamples = 0;
                return this.step(-1, 'recovered', now);
            }
        } else {
            // Neither clearly bad nor clearly good: decay both counters so one noisy second changes nothing.
            this.badSamples = Math.max(0, this.badSamples - 0.5);
            this.goodSamples = Math.max(0, this.goodSamples - 0.5);
        }
        return { changed: false, target: this.target(s.captureHeight) };
    }

    step(direction, why, now) {
        const prev = this.rung;
        this.rung = Math.min(LADDER.length - 1, Math.max(this.ceiling, this.rung + direction));
        if (this.rung === prev) return { changed: false, target: this.target() };
        this.lastChangeAt = now;
        this.lastReason = why;
        if (direction > 0) {
            this.lastDownAt = now;
            // Back off: the next upgrade attempt waits longer each time we had to retreat.
            this.upCooldownMs = Math.min(CFG.maxUpCooldownMs, this.upCooldownMs * 2);
            this.bitrateCap = LADDER[this.rung].bitrate;
        } else {
            this.bitrateCap = Math.min(LADDER[this.rung].bitrate, Math.round(this.bitrateCap * CFG.rampGrowth));
        }
        return { changed: true, target: this.target() };
    }
}

// ── Stats extraction ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Pull the signals the controller needs out of an RTCStatsReport (anything with forEach((report) => ...)).
 * `prev` is the previous call's `state` (or undefined on the first call); returns { sample, state, info }.
 *  - sample: input for QualityController.update()
 *  - info:   extra facts for diagnostics / the viewer overlay (codec, encoder, route, resolution ...)
 */
function extractSample(report, prev, nowMs) {
    const cur = { t: nowMs, framesEncoded: 0, totalEncodeTime: 0, bytesSent: 0, packetsSent: 0, packetsLost: 0, remotePackets: 0 };
    let outbound = null;
    let remoteInbound = null;
    let pair = null;
    let selectedPairId = null;
    const byId = {};
    report.forEach((r) => {
        byId[r.id] = r;
        if (r.type === 'outbound-rtp' && r.kind === 'video') outbound = r;
        else if (r.type === 'remote-inbound-rtp' && r.kind === 'video') remoteInbound = r;
        else if (r.type === 'transport' && r.selectedCandidatePairId) selectedPairId = r.selectedCandidatePairId;
    });
    report.forEach((r) => {
        if (r.type === 'candidate-pair' && (selectedPairId ? r.id === selectedPairId : r.state === 'succeeded' && r.nominated)) pair = r;
    });

    if (outbound) {
        cur.framesEncoded = outbound.framesEncoded || 0;
        cur.totalEncodeTime = outbound.totalEncodeTime || 0;
        cur.bytesSent = outbound.bytesSent || 0;
        cur.packetsSent = outbound.packetsSent || 0;
    }
    if (remoteInbound) cur.packetsLost = remoteInbound.packetsLost || 0;

    const dt = prev ? Math.max(0.001, (nowMs - prev.t) / 1000) : 0;
    const dFrames = prev ? cur.framesEncoded - prev.framesEncoded : 0;
    const dPackets = prev ? cur.packetsSent - prev.packetsSent : 0;
    const dLost = prev ? cur.packetsLost - prev.packetsLost : 0;

    let rttMs = null;
    if (remoteInbound && Number.isFinite(remoteInbound.roundTripTime)) rttMs = remoteInbound.roundTripTime * 1000;
    else if (pair && Number.isFinite(pair.currentRoundTripTime)) rttMs = pair.currentRoundTripTime * 1000;

    const local = pair ? byId[pair.localCandidateId] : null;
    const remote = pair ? byId[pair.remoteCandidateId] : null;
    const relayed = !!((local && local.candidateType === 'relay') || (remote && remote.candidateType === 'relay'));
    const codec = outbound && outbound.codecId ? byId[outbound.codecId] : null;

    const sample = {
        rttMs,
        loss: dPackets > 0 && dLost > 0 ? dLost / (dPackets + dLost) : 0,
        availableBps: pair && Number.isFinite(pair.availableOutgoingBitrate) ? pair.availableOutgoingBitrate : null,
        qualityLimitationReason: outbound ? outbound.qualityLimitationReason : undefined,
        encodeMs: prev && dFrames > 0 ? ((cur.totalEncodeTime - prev.totalEncodeTime) / dFrames) * 1000 : null,
        sentFps: prev && dt > 0 ? dFrames / dt : null,
        sentKbps: prev && dt > 0 ? ((cur.bytesSent - prev.bytesSent) * 8) / dt / 1000 : null,
        captureHeight: null
    };
    const info = {
        width: outbound ? outbound.frameWidth || 0 : 0,
        height: outbound ? outbound.frameHeight || 0 : 0,
        route: pair ? (relayed ? 'relayed' : 'direct') : 'unknown',
        relayProtocol: relayed && local && local.relayProtocol ? local.relayProtocol : undefined,
        codec: codec && codec.mimeType ? codec.mimeType.replace(/^video\//i, '') : null,
        encoder: outbound ? outbound.encoderImplementation : undefined,
        hardwareEncoder: outbound ? outbound.powerEfficientEncoder === true : false,
        qualityLimitationReason: sample.qualityLimitationReason
    };
    return { sample, state: cur, info };
}

module.exports = {
    LADDER,
    PRESETS,
    DEFAULT_PRESET,
    START_BITRATE_CAP,
    QualityController,
    presetForLegacyLabel,
    extractSample
};
