/**
 * adaptiveController.js — GCC-inspired Adaptive Bitrate Controller
 *
 * WHY NOT A SIMPLE IF/ELSE?
 *   Simple threshold-based ABR causes "ping-pong" oscillation: the bitrate
 *   drops, the video quality improves, the encoder needs more bandwidth again,
 *   the bitrate drops again — endlessly. Real GCC (Google Congestion Control)
 *   uses EMA smoothing and hysteresis counters to avoid this.
 *
 * DESIGN DECISIONS:
 *   - EMA (Exponential Moving Average) smooths RTT and loss noise.
 *   - Hysteresis: require N consecutive bad samples to downgrade,
 *     but N*5 good samples to upgrade. Asymmetric on purpose.
 *   - Quality ladder: discrete steps prevent micro-oscillation.
 *   - "Downgrade quickly, upgrade slowly" — borrowed from RMCAT/GCC RFC 8888.
 */

// ─── Quality Ladder ───────────────────────────────────────────────────────────
// Each rung: { label, maxWidth, maxHeight, maxFps, maxBitrate (bps) }
// Order: best first (index 0 = best quality, last index = worst/lowest latency)
export const QUALITY_LADDER = [
    { label: '1080p60', maxWidth: 1920, maxHeight: 1080, maxFps: 60, maxBitrate: 8_000_000 },
    { label: '1080p30', maxWidth: 1920, maxHeight: 1080, maxFps: 30, maxBitrate: 5_000_000 },
    { label: '720p60',  maxWidth: 1280, maxHeight: 720,  maxFps: 60, maxBitrate: 4_000_000 },
    { label: '720p30',  maxWidth: 1280, maxHeight: 720,  maxFps: 30, maxBitrate: 2_500_000 },
    { label: '480p30',  maxWidth: 854,  maxHeight: 480,  maxFps: 30, maxBitrate: 1_200_000 },
    { label: '360p20',  maxWidth: 640,  maxHeight: 360,  maxFps: 20, maxBitrate: 600_000  },
];

// ─── Thresholds ───────────────────────────────────────────────────────────────
const RTT_BAD_MS        = 150;   // ms — above this RTT is considered congested
const RTT_GOOD_MS       = 80;    // ms — below this RTT is considered healthy
const LOSS_BAD          = 0.02;  // 2% packet loss = bad
const LOSS_GOOD         = 0.005; // 0.5% packet loss = good

// Hysteresis counters
const BAD_SAMPLES_TO_DOWNGRADE = 2;   // 2 bad readings in a row → step down
const GOOD_SAMPLES_TO_UPGRADE  = 10;  // 10 good readings in a row → step up

// EMA smoothing factor (α): higher = more reactive, lower = smoother
const EMA_ALPHA = 0.3;

// ─── Controller Class ─────────────────────────────────────────────────────────
export class AdaptiveController {
    constructor() {
        this.currentRung = 0;          // Start at best quality
        this.badSamples  = 0;
        this.goodSamples = 0;

        // EMA state
        this._emaRtt  = 0;
        this._emaLoss = 0;
        this._initialized = false;
    }

    // ── Feed a new stats sample ──────────────────────────────────────────────
    // Returns { changed: bool, rung: QualityLadderEntry } every call.
    // Caller must apply the rung constraints to the encoder.
    update({ rttSeconds, packetLossRate, availableBitrate }) {
        const rttMs   = (rttSeconds || 0) * 1000;
        const loss    = packetLossRate || 0;

        // Initialise EMA on first sample (cold start)
        if (!this._initialized) {
            this._emaRtt  = rttMs;
            this._emaLoss = loss;
            this._initialized = true;
        } else {
            // Exponential moving average: smooth out single-sample noise
            this._emaRtt  = EMA_ALPHA * rttMs   + (1 - EMA_ALPHA) * this._emaRtt;
            this._emaLoss = EMA_ALPHA * loss     + (1 - EMA_ALPHA) * this._emaLoss;
        }

        const isBad  = this._emaRtt > RTT_BAD_MS  || this._emaLoss > LOSS_BAD;
        const isGood = this._emaRtt < RTT_GOOD_MS && this._emaLoss < LOSS_GOOD;

        // Available outgoing bitrate from REMB/TWCC — additional signal
        const currentRung = QUALITY_LADDER[this.currentRung];
        const bitrateConstrained = availableBitrate > 0 && availableBitrate < currentRung.maxBitrate * 0.8;

        if (isBad || bitrateConstrained) {
            this.badSamples++;
            this.goodSamples = 0; // Reset good counter — no upgrade during bad streak

            if (this.badSamples >= BAD_SAMPLES_TO_DOWNGRADE) {
                this.badSamples = 0;
                return this._stepDown();
            }
        } else if (isGood) {
            this.goodSamples++;
            this.badSamples = 0;

            if (this.goodSamples >= GOOD_SAMPLES_TO_UPGRADE) {
                this.goodSamples = 0;
                return this._stepUp();
            }
        } else {
            // Neutral — decay both counters slightly
            this.badSamples  = Math.max(0, this.badSamples  - 0.5);
            this.goodSamples = Math.max(0, this.goodSamples - 0.5);
        }

        return { changed: false, rung: currentRung, emaRtt: this._emaRtt, emaLoss: this._emaLoss };
    }

    // ── Downgrade one rung ───────────────────────────────────────────────────
    _stepDown() {
        const prev = this.currentRung;
        this.currentRung = Math.min(this.currentRung + 1, QUALITY_LADDER.length - 1);
        const rung = QUALITY_LADDER[this.currentRung];
        const changed = this.currentRung !== prev;
        if (changed) {
            console.log(`[ABR] ▼ Downgrade → ${rung.label} (EMA RTT=${this._emaRtt.toFixed(0)}ms, Loss=${(this._emaLoss*100).toFixed(1)}%)`);
        }
        return { changed, rung, emaRtt: this._emaRtt, emaLoss: this._emaLoss };
    }

    // ── Upgrade one rung ─────────────────────────────────────────────────────
    _stepUp() {
        const prev = this.currentRung;
        this.currentRung = Math.max(this.currentRung - 1, 0);
        const rung = QUALITY_LADDER[this.currentRung];
        const changed = this.currentRung !== prev;
        if (changed) {
            console.log(`[ABR] ▲ Upgrade → ${rung.label} (EMA RTT=${this._emaRtt.toFixed(0)}ms, Loss=${(this._emaLoss*100).toFixed(1)}%)`);
        }
        return { changed, rung, emaRtt: this._emaRtt, emaLoss: this._emaLoss };
    }

    // ── Force a specific rung (e.g. from user settings UI) ──────────────────
    forceRung(label) {
        const idx = QUALITY_LADDER.findIndex(r => r.label === label);
        if (idx !== -1) {
            this.currentRung = idx;
            this.badSamples  = 0;
            this.goodSamples = 0;
        }
    }

    get currentQuality() {
        return QUALITY_LADDER[this.currentRung];
    }
}
