/**
 * inputSender.js — the viewer's outbound mouse / keyboard pipeline.
 *
 * Goals (in priority order): never lose or reorder a click or key event; never let stale mouse moves queue up;
 * never leave a key or button stuck down on the host.
 *
 *  - mouse_move  -> the unreliable, unordered "mouse" data channel, coalesced to the newest position per animation
 *                   frame (the first move after a pause goes out immediately). Each carries a sequence number so the
 *                   host can discard a move that arrives out of order. If the channel's send buffer is backing up the
 *                   move is skipped: the next one supersedes it anyway.
 *  - everything else (clicks, keys, wheel, clipboard, settings) -> the reliable, ordered "keyboard" channel, in
 *                   exactly the order it happened. A pending move is flushed first so the wire order matches the
 *                   user's order, and mouse_down / mouse_up carry their own position so a click can never land on a
 *                   stale cursor position even though moves and clicks travel on different channels.
 *  - wheel deltas are accumulated per frame (precision trackpads emit dozens of tiny events) and sent reliably.
 *  - pressed keys / buttons are tracked so releaseAll() (window blur, tab hidden, channel closed, unmount) can
 *                   release them.
 *  - an optional latency probe measures click-to-host-queue round trip on the reliable channel.
 */

const MODIFIER_CODES = ['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'ShiftLeft', 'ShiftRight'];

export class InputSender {
  /**
   * @param {object} opts
   * @param {() => RTCDataChannel|null} opts.getMouseChannel     unreliable channel
   * @param {() => RTCDataChannel|null} opts.getKeyboardChannel  reliable channel
   * @param {() => number} [opts.now]                            ms clock
   * @param {(fn: Function) => any} [opts.schedule]              next-frame scheduler (requestAnimationFrame)
   * @param {(handle: any) => void} [opts.cancel]
   * @param {(m: {rttMs:number, hostMs:number}) => void} [opts.onLatency]
   */
  constructor({
    getMouseChannel = null,
    getKeyboardChannel = null,
    now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    schedule = (fn) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(fn, 16)),
    cancel = (h) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(h) : clearTimeout(h)),
    onLatency = null,
    maxBufferedBytes = 16 * 1024,
    leadingEdgeMs = 8
  }) {
    // Channels are normally handed over with setChannel() when the peer's data channels arrive; the getters exist so
    // tests (or another transport) can supply them lazily instead.
    this.channels = { mouse: null, keyboard: null };
    this.getMouseChannel = getMouseChannel || (() => this.channels.mouse);
    this.getKeyboardChannel = getKeyboardChannel || (() => this.channels.keyboard);
    this.now = now;
    this.schedule = schedule;
    this.cancel = cancel;
    this.onLatency = onLatency;
    this.maxBufferedBytes = maxBufferedBytes;
    this.leadingEdgeMs = leadingEdgeMs;

    this.seq = 0;
    this.pendingMove = null;
    this.pendingWheel = null;
    this.frameHandle = null;
    this.lastMoveSentAt = -Infinity;
    this.lastPos = null;
    this.pressedKeys = new Map();
    this.pressedButtons = new Set();
    this.probeId = 0;
    this.probes = new Map();
    this.probeTimer = null;
    this.stats = { moveSent: 0, moveCoalesced: 0, moveSkippedBackpressure: 0, reliableSent: 0, reliableDropped: 0 };
  }

  /** Attach (or detach with null) the 'mouse' (unreliable) or 'keyboard' (reliable) data channel. */
  setChannel(kind, channel) {
    this.channels[kind] = channel;
  }

  /** Send one input event. Safe to call at any rate. Returns nothing; failures are counted, never thrown. */
  send(event) {
    if (!event || typeof event.type !== 'string') return;
    switch (event.type) {
      case 'mouse_move':
        this.queueMove(event);
        return;
      case 'mouse_wheel':
        this.queueWheel(event);
        return;
      default:
        break;
    }

    // Anything else keeps its exact position in the user's sequence: whatever was pending goes out first.
    this.flushPending();
    let out = event;
    if (event.type === 'key_down') this.pressedKeys.set(event.code || event.key, { code: event.code, key: event.key });
    else if (event.type === 'key_up') this.pressedKeys.delete(event.code || event.key);
    else if (event.type === 'mouse_down') this.pressedButtons.add(event.button || 0);
    else if (event.type === 'mouse_up') this.pressedButtons.delete(event.button || 0);

    if ((event.type === 'mouse_down' || event.type === 'mouse_up') && event.x === undefined && this.lastPos) {
      out = { ...event, x: this.lastPos.x, y: this.lastPos.y };
    }
    this.sendReliable(out);
  }

  // ── mouse move ──────────────────────────────────────────────────────────────────────────────────────

  queueMove(event) {
    if (Number.isFinite(event.x) && Number.isFinite(event.y)) this.lastPos = { x: event.x, y: event.y };
    if (this.pendingMove) this.stats.moveCoalesced += 1;
    const idle = this.frameHandle === null && this.now() - this.lastMoveSentAt >= this.leadingEdgeMs;
    if (idle) {
      this.sendMove(event); // first move after a pause: no reason to wait for the next frame
      return;
    }
    this.pendingMove = event;
    this.scheduleFlush();
  }

  sendMove(event) {
    this.lastMoveSentAt = this.now();
    const mouse = this.getMouseChannel();
    const keyboard = this.getKeyboardChannel();
    let channel = null;
    if (mouse && mouse.readyState === 'open') {
      if (mouse.bufferedAmount > this.maxBufferedBytes) {
        this.stats.moveSkippedBackpressure += 1; // backing up: the next position supersedes this one anyway
        return;
      }
      channel = mouse;
    } else if (keyboard && keyboard.readyState === 'open') {
      channel = keyboard; // the unreliable channel is not up (yet): reliable is slower but still correct
    }
    if (!channel) return;
    this.seq += 1;
    try {
      channel.send(JSON.stringify({ ...event, seq: this.seq }));
      this.stats.moveSent += 1;
    } catch { /* channel closing */ }
  }

  // ── wheel ───────────────────────────────────────────────────────────────────────────────────────────

  queueWheel(event) {
    if (!this.pendingWheel) this.pendingWheel = { deltaX: 0, deltaY: 0 };
    this.pendingWheel.deltaX += event.deltaX || 0;
    this.pendingWheel.deltaY += event.deltaY || 0;
    this.scheduleFlush();
  }

  // ── frame flush ─────────────────────────────────────────────────────────────────────────────────────

  scheduleFlush() {
    if (this.frameHandle !== null) return;
    this.frameHandle = this.schedule(() => {
      this.frameHandle = null;
      this.flushPending();
    });
  }

  flushPending() {
    if (this.frameHandle !== null) {
      this.cancel(this.frameHandle);
      this.frameHandle = null;
    }
    if (this.pendingMove) {
      const move = this.pendingMove;
      this.pendingMove = null;
      this.sendMove(move);
    }
    if (this.pendingWheel) {
      const wheel = this.pendingWheel;
      this.pendingWheel = null;
      if (wheel.deltaX !== 0 || wheel.deltaY !== 0) this.sendReliable({ type: 'mouse_wheel', ...wheel });
    }
  }

  // ── reliable channel ────────────────────────────────────────────────────────────────────────────────

  sendReliable(event) {
    const channel = this.getKeyboardChannel();
    if (!channel || channel.readyState !== 'open') {
      // Deliberately NOT queued for later: replaying an old click or key after a reconnect would act on a screen the
      // user is no longer looking at. releaseAll() on reconnect handles anything that was left pressed.
      this.stats.reliableDropped += 1;
      return false;
    }
    try {
      channel.send(JSON.stringify(event));
      this.stats.reliableSent += 1;
      return true;
    } catch {
      this.stats.reliableDropped += 1;
      return false;
    }
  }

  // ── stuck-key protection ───────────────────────────────────────────────────────────────────────────

  /**
   * Release everything that is currently held down on the host. `includeAllModifiers` also releases every modifier
   * (idempotent on the host) because losing focus mid-chord is the classic way a modifier gets stuck.
   */
  releaseAll({ includeAllModifiers = true } = {}) {
    this.flushPending();
    const keys = new Map(this.pressedKeys);
    if (includeAllModifiers) for (const code of MODIFIER_CODES) if (!keys.has(code)) keys.set(code, { code });
    for (const { code, key } of keys.values()) this.sendReliable({ type: 'key_up', code, key });
    for (const button of this.pressedButtons) {
      this.sendReliable({ type: 'mouse_up', button, ...(this.lastPos || {}) });
    }
    this.pressedKeys.clear();
    this.pressedButtons.clear();
  }

  /** Forget held state without sending anything (the channels are gone; the host releases its own on disconnect). */
  reset() {
    this.flushPending();
    this.pressedKeys.clear();
    this.pressedButtons.clear();
    this.pendingMove = null;
    this.pendingWheel = null;
    this.seq = 0;
    this.lastMoveSentAt = -Infinity;
    this.probes.clear();
  }

  // ── input-to-host latency probe ────────────────────────────────────────────────────────────────────

  /** Send one probe on the reliable channel. The host answers `input_probe_ack` once it has passed its input queue. */
  probe() {
    if (this.probes.size > 10) this.probes.clear();
    this.probeId += 1;
    this.probes.set(this.probeId, this.now());
    this.sendReliable({ type: 'input_probe', id: this.probeId });
  }

  startProbing(intervalMs = 2000) {
    this.stopProbing();
    this.probe();
    this.probeTimer = setInterval(() => this.probe(), intervalMs);
  }

  stopProbing() {
    if (this.probeTimer) clearInterval(this.probeTimer);
    this.probeTimer = null;
  }

  /** Feed host messages here; returns true when the message was a probe reply. */
  handleMessage(message) {
    if (!message || message.type !== 'input_probe_ack') return false;
    const sentAt = this.probes.get(message.id);
    if (sentAt === undefined) return true;
    this.probes.delete(message.id);
    if (this.onLatency) this.onLatency({ rttMs: this.now() - sentAt, hostMs: Number(message.hostMs) || 0 });
    return true;
  }

  destroy() {
    this.stopProbing();
    if (this.frameHandle !== null) this.cancel(this.frameHandle);
    this.frameHandle = null;
    this.pendingMove = null;
    this.pendingWheel = null;
  }
}
