'use strict';
/**
 * Host-side video stream configuration + the 1 Hz tuning loop.
 *
 * Shared by the real agent (webrtc.html) and by perf/pipeline-bench.html, so the benchmark measures the code that
 * actually ships. No Electron / DOM imports here: everything WebRTC-shaped is injected, which is what lets
 * test/host-stream.test.js drive it with fakes.
 *
 * Measured on the dev machine (see perf/ and the PR notes) and applied here:
 *  - contentHint 'detail', not 'motion': with 'motion' WebRTC's quality scaler traded resolution for frame rate and
 *    sent 320x180..640x360 for the first 6-8 s even when 720p was requested; with 'detail' the requested resolution
 *    holds from the first second at the same bitrate and ~28-30 fps. ('text' dropped to ~14 fps: worse.)
 *  - capture at the size actually streamed (720p, or 1080p for the Quality preset) instead of 1080p/60 and scaling in
 *    the encoder: ~4-5 ms less encode time per frame in 3 of 3 paired runs.
 *  - 30 fps instead of 60: H.264 encode took ~16-19 ms/frame at 1080p60 (budget 16.7 ms) and delivered only ~42-44 fps
 *    on the dev machine (hardware or software encoder, whichever Chromium picked for that run).
 */

const { QualityController, extractSample, presetForLegacyLabel, DEFAULT_PRESET, PRESETS } = require('./qualityController');

const CAPTURE_FPS = 30;

// A current viewer sends `quality_preset` AND, right behind it, a legacy `update_resolution` for agents that predate
// presets. This agent understands presets, so the legacy twin must not re-apply (it would reset the controller twice
// and could disagree with the preset the viewer actually chose).
const LEGACY_TWIN_WINDOW_MS = 2000;

/**
 * Preset to apply for a legacy `update_resolution` message, or null to ignore it because it is the compatibility twin
 * of a `quality_preset` received just before. `lastPresetAt` is the time of the last `quality_preset` (0 if never).
 */
function legacyResolutionToPreset(label, lastPresetAt, nowMs) {
    if (lastPresetAt && nowMs - lastPresetAt < LEGACY_TWIN_WINDOW_MS) return null;
    return presetForLegacyLabel(label);
}

/** Height to capture at for a preset. Quality streams 1080p; everything else streams <= 720p. */
function captureHeightForPreset(preset) {
    return preset === 'quality' ? 1080 : 720;
}

/** getUserMedia constraints for Electron desktop capture. No minWidth/minHeight: a smaller screen must still work. */
function buildCaptureConstraints(sourceId, height, fps = CAPTURE_FPS) {
    return {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: sourceId,
                maxWidth: Math.round((height * 16) / 9),
                maxHeight: height,
                maxFrameRate: fps
            }
        }
    };
}

/** Screen content: keep the requested resolution (text must stay readable) and let frame rate flex. */
function configureTrack(track) {
    try { track.contentHint = 'detail'; } catch { /* unsupported */ }
}

/**
 * Move the given codec's payload types to the front of the m=video line (SDP-level preference).
 * Returns the SDP unchanged if the codec is not offered, so an unsupported choice can never break negotiation.
 */
function preferCodec(sdp, codecName) {
    const wanted = String(codecName || 'H264').toUpperCase();
    const payloadTypes = [];
    for (const line of sdp.split('\r\n')) {
        const match = /^a=rtpmap:(\d+) ([\w-]+)\//.exec(line);
        if (match && match[2].toUpperCase() === wanted) payloadTypes.push(match[1]);
    }
    if (payloadTypes.length === 0) return sdp;
    return sdp.replace(/(m=video \d+ [^\r\n]+)/g, (line) => {
        const parts = line.split(' ');
        const header = parts.slice(0, 3);
        const rest = parts.slice(3);
        return [...header, ...payloadTypes, ...rest.filter((pt) => !payloadTypes.includes(pt))].join(' ');
    });
}

/**
 * Apply a controller target through RTCRtpSender.setParameters(). Browsers differ in which encoding fields they
 * accept, so unsupported fields are dropped one by one instead of failing the whole update.
 * Returns { ok, applied } (never throws).
 */
async function applyEncoderTarget(sender, target, log = () => {}) {
    if (!sender || typeof sender.getParameters !== 'function') return { ok: false, applied: null };
    const attempts = [
        ['maxBitrate', 'maxFramerate', 'scaleResolutionDownBy'],
        ['maxBitrate', 'maxFramerate'],
        ['maxBitrate']
    ];
    for (const fields of attempts) {
        try {
            const params = sender.getParameters();
            if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
            const enc = params.encodings[0];
            const applied = {};
            if (fields.includes('maxBitrate')) { enc.maxBitrate = target.maxBitrate; applied.maxBitrate = target.maxBitrate; }
            if (fields.includes('maxFramerate')) { enc.maxFramerate = target.maxFramerate; applied.maxFramerate = target.maxFramerate; }
            if (fields.includes('scaleResolutionDownBy')) {
                enc.scaleResolutionDownBy = target.scaleResolutionDownBy;
                applied.scaleResolutionDownBy = target.scaleResolutionDownBy;
            }
            await sender.setParameters(params);
            return { ok: true, applied };
        } catch (error) {
            log('setParameters_rejected', { fields: fields.join(','), message: error && error.message });
        }
    }
    return { ok: false, applied: null };
}

class StreamTuner {
    /**
     * @param {object} opts
     * @param {() => RTCPeerConnection|null} opts.getPeer
     * @param {string} [opts.preset]
     * @param {(msg: object) => void} [opts.sendToViewer]   delivers a small JSON message on the reliable data channel
     * @param {(height: number) => Promise<void>|void} [opts.onCaptureHeightChange]  restart capture at a new height
     * @param {(event: string, fields?: object) => void} [opts.log]
     * @param {() => number} [opts.now]
     */
    constructor({
        getPeer,
        preset = DEFAULT_PRESET,
        sendToViewer = () => {},
        onCaptureHeightChange = null,
        onMetrics = null,
        log = () => {},
        now = () => Date.now(),
        // Wrapped on purpose: storing the bare global and calling it as `this.fn()` throws "Illegal invocation"
        // in a browser/Electron renderer (it needs `this === window`). Node does not care, which hid it from tests.
        setIntervalFn = (...args) => setInterval(...args),
        clearIntervalFn = (...args) => clearInterval(...args),
        intervalMs = 1000
    }) {
        this.getPeer = getPeer;
        this.sendToViewer = sendToViewer;
        this.onCaptureHeightChange = onCaptureHeightChange;
        this.onMetrics = onMetrics;
        this.log = log;
        this.now = now;
        this.setIntervalFn = setIntervalFn;
        this.clearIntervalFn = clearIntervalFn;
        this.intervalMs = intervalMs;

        this.controller = new QualityController({ preset, now });
        this.captureHeight = captureHeightForPreset(this.controller.preset);
        this.timer = null;
        this.busy = false;
        this.prevState = undefined;
        this.last = null;          // { sample, info, target }
        this.statsSubscribed = false;
        this.lastRoute = null;
        this.changes = 0;
    }

    start() {
        this.stop();
        this.prevState = undefined;
        this.timer = this.setIntervalFn(() => { this.tick(); }, this.intervalMs);
        return this.applyNow();
    }

    stop() {
        if (this.timer) this.clearIntervalFn(this.timer);
        this.timer = null;
    }

    /** Viewer picked a preset (or an older viewer sent update_resolution). Applies at once. */
    async setPreset(name) {
        const target = this.controller.setPreset(name);
        const wantedHeight = captureHeightForPreset(target.preset);
        if (wantedHeight !== this.captureHeight) {
            this.captureHeight = wantedHeight;
            if (this.onCaptureHeightChange) {
                try { await this.onCaptureHeightChange(wantedHeight); } catch (error) { this.log('capture_restart_failed', { message: error && error.message }); }
            }
        }
        this.log('preset_changed', { preset: target.preset, label: target.label, maxBitrate: target.maxBitrate });
        return this.applyNow();
    }

    setStatsSubscribed(on) {
        this.statsSubscribed = !!on;
    }

    /** The capture size changed (track replaced): re-apply scaling for the new size. */
    setCaptureHeight(height) {
        this.captureHeight = height;
        return this.applyNow();
    }

    currentTarget() {
        return this.controller.target(this.captureHeight);
    }

    async applyNow() {
        const peer = this.getPeer();
        if (!peer) return { ok: false, applied: null };
        const sender = peer.getSenders().find((s) => s.track && s.track.kind === 'video');
        const target = this.currentTarget();
        const result = await applyEncoderTarget(sender, target, this.log);
        if (result.ok) this.log('encoder_target', { label: target.label, ...result.applied, why: target.reason });
        return result;
    }

    async tick() {
        if (this.busy) return;
        const peer = this.getPeer();
        if (!peer || peer.connectionState !== 'connected') return;
        this.busy = true;
        try {
            const report = await peer.getStats();
            const extracted = extractSample(report, this.prevState, this.now());
            this.prevState = extracted.state;
            const { sample, info } = extracted;
            sample.captureHeight = this.captureHeight;

            const { changed, target } = this.controller.update(sample);
            if (changed) {
                this.changes += 1;
                await this.applyNow();
            }
            this.last = { sample, info, target };

            if (info.route !== this.lastRoute && info.route !== 'unknown') {
                this.lastRoute = info.route;
                this.log('stream_route', { route: info.route, relayProtocol: info.relayProtocol, rttMs: sample.rttMs === null ? null : Math.round(sample.rttMs) });
            }
            if (this.onMetrics) this.onMetrics(this.summary());
            if (this.statsSubscribed) this.sendToViewer({ type: 'host_stats', ...this.summary() });
        } catch (error) {
            this.log('tuner_tick_failed', { message: error && error.message });
        } finally {
            this.busy = false;
        }
    }

    /** Compact, JSON-safe snapshot for the viewer overlay and the server-side session metrics. */
    summary() {
        const last = this.last;
        if (!last) return { preset: this.controller.preset, label: this.controller.target().label };
        const { sample, info, target } = last;
        const round = (v, d = 0) => (v === null || v === undefined || !Number.isFinite(v) ? null : +v.toFixed(d));
        return {
            preset: target.preset,
            label: target.label,
            targetKbps: Math.round(target.maxBitrate / 1000),
            reason: target.reason,
            sentKbps: round(sample.sentKbps),
            sentFps: round(sample.sentFps, 1),
            encodeMs: round(sample.encodeMs, 1),
            rttMs: round(sample.rttMs),
            lossPct: round(sample.loss * 100, 1),
            availKbps: sample.availableBps === null ? null : Math.round(sample.availableBps / 1000),
            width: info.width,
            height: info.height,
            codec: info.codec,
            encoder: info.encoder,
            hardwareEncoder: info.hardwareEncoder,
            route: info.route,
            relayProtocol: info.relayProtocol,
            limit: info.qualityLimitationReason,
            captureHeight: this.captureHeight,
            changes: this.changes
        };
    }
}

module.exports = {
    CAPTURE_FPS,
    PRESETS,
    presetForLegacyLabel,
    legacyResolutionToPreset,
    LEGACY_TWIN_WINDOW_MS,
    captureHeightForPreset,
    buildCaptureConstraints,
    configureTrack,
    preferCodec,
    applyEncoderTarget,
    StreamTuner
};
