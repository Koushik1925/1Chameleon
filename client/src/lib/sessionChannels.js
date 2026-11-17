/**
 * Owns the peer connection and the two input data channels ('mouse', 'keyboard') of the CURRENT session.
 *
 * Both channels live inside the peer connection: closing the peer closes them, so they always go down together.
 * This class makes that teardown happen exactly once and makes late events from a replaced peer harmless:
 *  - release() is idempotent; each channel / peer is closed at most once.
 *  - isCurrent() lets a channel's onclose / onmessage ignore events from a channel that has been replaced
 *    (a stale 'closed' from the old peer must not reset the new peer's input state).
 */
export class SessionChannels {
  constructor() {
    this.peer = null;
    this.channels = { mouse: null, keyboard: null };
  }

  /** A new peer replaces the old one. Anything belonging to the old peer is released first. */
  setPeer(peer) {
    if (this.peer === peer) return;
    this.release();
    this.peer = peer;
  }

  /** Register a channel; a previous channel with the same label (older peer) is closed first. */
  setChannel(label, channel) {
    const previous = this.channels[label];
    if (previous && previous !== channel) this.#close(previous);
    this.channels[label] = channel;
  }

  get(label) { return this.channels[label] || null; }

  isCurrent(label, channel) { return this.channels[label] === channel; }

  /** True while the peer is the current one (used by the manager's onPeerClosed hook). */
  isPeer(peer) { return this.peer === peer; }

  /**
   * Close channels and (unless the caller already did) the peer. Safe to call any number of times.
   * @returns {boolean} whether there was anything to release
   */
  release({ closePeer = true } = {}) {
    const had = !!(this.peer || this.channels.mouse || this.channels.keyboard);
    for (const label of Object.keys(this.channels)) {
      const ch = this.channels[label];
      this.channels[label] = null;
      if (ch) this.#close(ch);
    }
    const peer = this.peer;
    this.peer = null;
    if (peer && closePeer) { try { peer.close(); } catch { /* already closed */ } }
    return had;
  }

  #close(channel) {
    try { channel.close(); } catch { /* already closed */ }
  }
}
