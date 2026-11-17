/**
 * Latest host-reported stats and input latency, shared between the data-channel handler (App) and the performance
 * overlay. Plain module state on purpose: it is read once a second by the overlay, so no React state / re-renders.
 */
const state = {
  host: null,          // last `host_stats` message from the agent (encode time, limitation reason, preset, ...)
  hostAt: 0,
  inputRttMs: null,    // last input-probe round trip through the host's input queue
  inputHostMs: null,   // the part of it spent inside the host (IPC + queue)
  inputAt: 0
};

export const perfBus = {
  setHost(message) {
    state.host = message;
    state.hostAt = Date.now();
  },
  setInputLatency({ rttMs, hostMs }) {
    state.inputRttMs = rttMs;
    state.inputHostMs = hostMs;
    state.inputAt = Date.now();
  },
  /** Host stats older than this are stale (agent older than the overlay protocol, or channel closed). */
  getHost(maxAgeMs = 5000) {
    return state.host && Date.now() - state.hostAt <= maxAgeMs ? state.host : null;
  },
  getInput(maxAgeMs = 8000) {
    return state.inputRttMs !== null && Date.now() - state.inputAt <= maxAgeMs
      ? { rttMs: state.inputRttMs, hostMs: state.inputHostMs }
      : null;
  },
  reset() {
    state.host = null;
    state.hostAt = 0;
    state.inputRttMs = null;
    state.inputHostMs = null;
    state.inputAt = 0;
  }
};
