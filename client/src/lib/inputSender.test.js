import test from 'node:test';
import assert from 'node:assert/strict';
import { InputSender } from './inputSender.js';

/** Fake data channel that records what was sent, in order. */
function channel(readyState = 'open') {
  return { readyState, bufferedAmount: 0, sent: [], send(data) { this.sent.push(JSON.parse(data)); } };
}

/** Sender wired to fake channels, a manual clock and a manual "next animation frame". */
function setup({ mouse = channel(), keyboard = channel(), startAt = 1000 } = {}) {
  const clock = { t: startAt };
  const frames = [];
  const sender = new InputSender({
    getMouseChannel: () => mouse,
    getKeyboardChannel: () => keyboard,
    now: () => clock.t,
    schedule: (fn) => { frames.push(fn); return frames.length; },
    cancel: (handle) => { frames[handle - 1] = null; },
  });
  const runFrame = () => { const fn = frames.shift(); if (fn) fn(); };
  return { sender, mouse, keyboard, clock, frames, runFrame };
}

test('the first move after a pause is sent immediately; a burst is coalesced to the newest position per frame', () => {
  const { sender, mouse, clock, runFrame } = setup();
  sender.send({ type: 'mouse_move', x: 0.1, y: 0.1 });
  assert.equal(mouse.sent.length, 1, 'leading edge goes out at once');

  clock.t += 2;
  for (let i = 2; i <= 50; i++) sender.send({ type: 'mouse_move', x: i / 100, y: i / 100 });
  assert.equal(mouse.sent.length, 1, 'the rest wait for the frame');

  clock.t += 16;
  runFrame();
  assert.equal(mouse.sent.length, 2, '49 queued moves collapsed into one');
  assert.equal(mouse.sent[1].x, 0.5, 'and it is the newest');
});

test('moves use the unreliable channel and carry an increasing sequence number so the host can drop stale ones', () => {
  const { sender, mouse, keyboard, clock, runFrame } = setup();
  sender.send({ type: 'mouse_move', x: 0.1, y: 0.1 });
  clock.t += 20; sender.send({ type: 'mouse_move', x: 0.2, y: 0.2 });
  clock.t += 20; sender.send({ type: 'mouse_move', x: 0.3, y: 0.3 });
  runFrame();
  assert.deepEqual(mouse.sent.map((m) => m.seq), [1, 2, 3]);
  assert.equal(keyboard.sent.length, 0, 'moves never touch the reliable channel');
});

test('clicks and keys go on the reliable channel, in exactly the order they happened', () => {
  const { sender, mouse, keyboard } = setup();
  sender.send({ type: 'key_down', code: 'KeyH', key: 'h' });
  sender.send({ type: 'key_up', code: 'KeyH', key: 'h' });
  sender.send({ type: 'mouse_down', button: 0, x: 0.4, y: 0.4 });
  sender.send({ type: 'mouse_up', button: 0, x: 0.4, y: 0.4 });
  assert.deepEqual(keyboard.sent.map((m) => m.type), ['key_down', 'key_up', 'mouse_down', 'mouse_up']);
  assert.equal(mouse.sent.length, 0);
});

test('a pending move is flushed BEFORE a click, so the wire order matches what the user did', () => {
  const { sender, mouse, keyboard, clock } = setup();
  sender.send({ type: 'mouse_move', x: 0.1, y: 0.1 });   // leading edge
  clock.t += 2;
  sender.send({ type: 'mouse_move', x: 0.7, y: 0.7 });   // pending (inside the frame window)
  sender.send({ type: 'mouse_down', button: 0 });
  assert.equal(mouse.sent[mouse.sent.length - 1].x, 0.7, 'the latest position was sent before the click');
  assert.equal(keyboard.sent[0].type, 'mouse_down');
});

test('a click that has no position of its own inherits the last known cursor position', () => {
  const { sender, keyboard } = setup();
  sender.send({ type: 'mouse_move', x: 0.25, y: 0.75 });
  sender.send({ type: 'mouse_down', button: 0 });
  assert.equal(keyboard.sent[0].x, 0.25);
  assert.equal(keyboard.sent[0].y, 0.75);
});

test('wheel deltas accumulate per frame and are sent reliably (a dropped scroll would be visible)', () => {
  const { sender, mouse, keyboard, runFrame } = setup();
  for (let i = 0; i < 20; i++) sender.send({ type: 'mouse_wheel', deltaX: 0, deltaY: 5 });
  assert.equal(keyboard.sent.length, 0);
  runFrame();
  assert.deepEqual(keyboard.sent, [{ type: 'mouse_wheel', deltaX: 0, deltaY: 100 }]);
  assert.equal(mouse.sent.length, 0);
});

test('a backed-up unreliable channel skips a move rather than queueing it', () => {
  const mouse = channel();
  mouse.bufferedAmount = 1_000_000;
  const { sender } = setup({ mouse });
  sender.send({ type: 'mouse_move', x: 0.1, y: 0.1 });
  assert.equal(mouse.sent.length, 0);
  assert.equal(sender.stats.moveSkippedBackpressure, 1);
});

test('if the unreliable channel is not open, moves still reach the host over the reliable one', () => {
  const { sender, keyboard } = setup({ mouse: channel('connecting') });
  sender.send({ type: 'mouse_move', x: 0.1, y: 0.1 });
  assert.equal(keyboard.sent.length, 1);
});

test('events are never queued for a later reconnect: replaying an old click on a new screen would be harmful', () => {
  const { sender, keyboard } = setup({ keyboard: channel('closed') });
  sender.send({ type: 'mouse_down', button: 0, x: 0.5, y: 0.5 });
  assert.equal(keyboard.sent.length, 0);
  assert.equal(sender.stats.reliableDropped, 1);
});

test('releaseAll releases every held key and button, and every modifier, exactly once', () => {
  const { sender, keyboard } = setup();
  sender.send({ type: 'key_down', code: 'ControlLeft', key: 'Control' });
  sender.send({ type: 'key_down', code: 'KeyC', key: 'c' });
  sender.send({ type: 'mouse_down', button: 2, x: 0.5, y: 0.5 });
  keyboard.sent.length = 0;

  sender.releaseAll();

  const ups = keyboard.sent.filter((m) => m.type === 'key_up').map((m) => m.code);
  assert.ok(ups.includes('KeyC'), 'the held letter is released');
  for (const code of ['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'ShiftLeft', 'ShiftRight']) {
    assert.equal(ups.filter((c) => c === code).length, 1, `${code} released exactly once`);
  }
  assert.ok(keyboard.sent.some((m) => m.type === 'mouse_up' && m.button === 2), 'the held mouse button is released');

  keyboard.sent.length = 0;
  sender.releaseAll({ includeAllModifiers: false });
  assert.deepEqual(keyboard.sent, [], 'nothing is left held, so a second release sends nothing');
});

test('a key released normally is no longer tracked as held', () => {
  const { sender, keyboard } = setup();
  sender.send({ type: 'key_down', code: 'KeyA', key: 'a' });
  sender.send({ type: 'key_up', code: 'KeyA', key: 'a' });
  keyboard.sent.length = 0;
  sender.releaseAll({ includeAllModifiers: false });
  assert.deepEqual(keyboard.sent, []);
});

test('reset forgets held state and restarts sequence numbers for the next session, sending nothing', () => {
  const { sender, mouse, keyboard } = setup();
  sender.send({ type: 'key_down', code: 'KeyA', key: 'a' });
  sender.send({ type: 'mouse_move', x: 0.2, y: 0.2 });
  const sentBefore = keyboard.sent.length + mouse.sent.length;
  sender.reset();
  assert.equal(keyboard.sent.length + mouse.sent.length, sentBefore);
  assert.equal(sender.pressedKeys.size, 0);
  assert.equal(sender.seq, 0);
});

test('input probe: round trip is measured from the reply, and unknown replies are ignored', () => {
  const results = [];
  const keyboard = channel();
  const clock = { t: 500 };
  const sender = new InputSender({
    getMouseChannel: () => channel(), getKeyboardChannel: () => keyboard, now: () => clock.t,
    schedule: () => 1, cancel: () => {}, onLatency: (r) => results.push(r),
  });
  sender.probe();
  const probe = keyboard.sent[0];
  assert.equal(probe.type, 'input_probe');

  clock.t += 37;
  assert.equal(sender.handleMessage({ type: 'input_probe_ack', id: probe.id, hostMs: 4 }), true);
  assert.deepEqual(results, [{ rttMs: 37, hostMs: 4 }]);

  assert.equal(sender.handleMessage({ type: 'input_probe_ack', id: 999 }), true, 'stale reply consumed, no callback');
  assert.equal(results.length, 1);
  assert.equal(sender.handleMessage({ type: 'clipboard_pull_response' }), false, 'other messages are not ours');
});

test('a throwing channel never propagates into the UI event handler', () => {
  const bad = { readyState: 'open', bufferedAmount: 0, send() { throw new Error('closing'); } };
  const { sender } = setup({ mouse: bad, keyboard: bad });
  assert.doesNotThrow(() => {
    sender.send({ type: 'mouse_move', x: 0.1, y: 0.1 });
    sender.send({ type: 'key_down', code: 'KeyA', key: 'a' });
  });
});

test('setChannel attaches channels without getters (the way the app wires it)', () => {
  const kb = channel();
  const sender = new InputSender({ now: () => 0, schedule: () => 1, cancel: () => {} });
  sender.send({ type: 'key_down', code: 'KeyA', key: 'a' });
  assert.equal(sender.stats.reliableDropped, 1, 'no channel yet: dropped, not thrown');
  sender.setChannel('keyboard', kb);
  sender.send({ type: 'key_up', code: 'KeyA', key: 'a' });
  assert.equal(kb.sent.length, 1);
});
