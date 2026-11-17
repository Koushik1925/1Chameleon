/**
 * latencyTuner.js — keep the viewer's video playout buffer as small as the network allows.
 *
 * The browser's receive-side jitter buffer adds delay so uneven packet arrival does not stutter. For a remote desktop
 * the cursor and typing feedback matter more than perfectly even motion, so we ask for the minimum
 * (RTCRtpReceiver.jitterBufferTarget = 0, with the older playoutDelayHint as a fallback) while the network is calm,
 * and give back a small cushion when jitter / freezes / dropped frames show the buffer is too thin.
 *
 * Hysteresis: one rough second never changes the target; the cushion is only released after a sustained calm period.
 * Everything is feature-detected: browsers without either property simply keep their default behaviour.
 */

export const LATENCY = {
  lowMs: 0,
  cushionMs: 40,
  jitterHighMs: 20,     // above this the minimal buffer is likely starving
  droppedHigh: 3,       // dropped frames in one interval
  badSamplesToCushion: 2,
  calmSamplesToRelease: 12
};

/** Set the receiver's playout target. Returns true if the browser accepted either knob. */
export function setReceiverLatency(receiver, targetMs) {
  if (!receiver) return false;
  let applied = false;
  try {
    if ('jitterBufferTarget' in receiver) {
      receiver.jitterBufferTarget = targetMs; // Chrome 114+ / Edge; value in milliseconds
      applied = true;
    }
  } catch { /* out of range / unsupported */ }
  try {
    if ('playoutDelayHint' in receiver) {
      receiver.playoutDelayHint = targetMs / 1000; // older Chromium: seconds
      applied = true;
    }
  } catch { /* unsupported */ }
  return applied;
}

export class LatencyTuner {
  constructor(receiver, { set = setReceiverLatency } = {}) {
    this.receiver = receiver;
    this.set = set;
    this.target = null;
    this.bad = 0;
    this.calm = 0;
    this.lastFreezes = null;
    this.supported = this.apply(LATENCY.lowMs);
  }

  apply(ms) {
    const ok = this.set(this.receiver, ms);
    if (ok) this.target = ms;
    return ok;
  }

  /** Feed ~1 Hz metrics from StatsMonitor. Returns the current target in ms (or null if unsupported). */
  update(metrics) {
    if (!this.supported || !metrics || !metrics.hasVideo) return this.target;
    const freezeDelta = this.lastFreezes === null ? 0 : Math.max(0, metrics.freezeCount - this.lastFreezes);
    this.lastFreezes = metrics.freezeCount;

    const rough = metrics.jitterMs > LATENCY.jitterHighMs || freezeDelta > 0 || metrics.framesDroppedDelta >= LATENCY.droppedHigh;
    if (rough) {
      this.bad += 1;
      this.calm = 0;
      if (this.bad >= LATENCY.badSamplesToCushion && this.target !== LATENCY.cushionMs) this.apply(LATENCY.cushionMs);
    } else {
      this.bad = 0;
      this.calm += 1;
      if (this.calm >= LATENCY.calmSamplesToRelease && this.target !== LATENCY.lowMs) this.apply(LATENCY.lowMs);
    }
    return this.target;
  }
}
