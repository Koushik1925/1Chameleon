'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createInputController } = require('../src/platform/input');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fake native layer. Every call is recorded with start/end markers so the tests can prove that operations never
 * overlap (they used to run concurrently) and that nothing is reordered.
 */
function createHarness({ slowKeyMs = 0, slowMoveMs = 0 } = {}) {
    const log = [];
    let active = 0;
    let maxActive = 0;
    const track = async (entry, delay) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        log.push(entry);
        if (delay) await sleep(delay);
        active -= 1;
    };
    class Point {
        constructor(x, y) { this.x = x; this.y = y; }
    }
    const deps = {
        mouse: {
            config: { autoDelayMs: 100, mouseSpeed: 1000 },
            setPosition: (p) => track(['move', p.x, p.y], slowMoveMs),
            pressButton: (b) => track(['down', b]),
            releaseButton: (b) => track(['up', b]),
            scrollDown: (n) => track(['scroll', n])
        },
        Point,
        Button: { LEFT: 'left', MIDDLE: 'middle', RIGHT: 'right' },
        screen: { width: async () => 1000, height: async () => 500 },
        keyboard: {
            config: { autoDelayMs: 300 },
            pressKey: (k) => track(['keydown', k], slowKeyMs),
            releaseKey: (k) => track(['keyup', k]),
            type: (c) => track(['type', c])
        },
        Key: new Proxy({}, { get: (_t, name) => String(name) }),
        clipboard: { writeText: () => {} }
    };
    return { log, deps, maxActive: () => maxActive };
}

test('disables the nut-js automation delays that made every key press ~300 ms late and every click ~100 ms late', () => {
    const { deps } = createHarness();
    createInputController(deps);
    assert.equal(deps.mouse.config.autoDelayMs, 0);
    assert.equal(deps.keyboard.config.autoDelayMs, 0);
});

test('executes events strictly one at a time, in arrival order, even when a native call is slow', async () => {
    const h = createHarness({ slowKeyMs: 25 });
    const input = createInputController(h.deps);

    const done = [
        input.handleRemoteInput({ type: 'key_down', code: 'KeyA', key: 'a' }),
        input.handleRemoteInput({ type: 'key_up', code: 'KeyA', key: 'a' }),
        input.handleRemoteInput({ type: 'mouse_down', button: 0 }),
        input.handleRemoteInput({ type: 'mouse_up', button: 0 })
    ];
    await Promise.all(done);

    assert.deepEqual(h.log.map((e) => e[0]), ['keydown', 'keyup', 'down', 'up']);
    assert.equal(h.maxActive(), 1, 'native calls must never overlap');
});

test('a click carries its own position and is applied before the button, so it lands where the user pointed', async () => {
    const h = createHarness();
    const input = createInputController(h.deps);

    await input.handleRemoteInput({ type: 'mouse_down', button: 0, x: 0.5, y: 0.5 });
    await input.handleRemoteInput({ type: 'mouse_up', button: 0, x: 0.5, y: 0.5 });

    assert.deepEqual(h.log, [
        ['move', 500, 250],
        ['down', 'left'],
        ['move', 500, 250],
        ['up', 'left']
    ]);
});

test('queued mouse moves coalesce to the newest, but never past a click, key press or release', async () => {
    const h = createHarness({ slowKeyMs: 30 });
    const input = createInputController(h.deps);

    const work = [
        input.handleRemoteInput({ type: 'key_down', code: 'KeyA', key: 'a' }), // occupies the queue
        input.handleRemoteInput({ type: 'mouse_move', x: 0.1, y: 0.1 }),
        input.handleRemoteInput({ type: 'mouse_move', x: 0.2, y: 0.2 }),       // replaces the one above
        input.handleRemoteInput({ type: 'mouse_down', button: 0 }),            // barrier: later moves must stay after it
        input.handleRemoteInput({ type: 'mouse_move', x: 0.3, y: 0.3 }),
        input.handleRemoteInput({ type: 'mouse_move', x: 0.4, y: 0.4 }),       // replaces the one above
        input.handleRemoteInput({ type: 'mouse_up', button: 0 }),
        input.handleRemoteInput({ type: 'key_up', code: 'KeyA', key: 'a' })
    ];
    await Promise.all(work);

    assert.deepEqual(h.log, [
        ['keydown', 'A'],
        ['move', 200, 100],
        ['down', 'left'],
        ['move', 400, 200],
        ['up', 'left'],
        ['keyup', 'A']
    ]);
    assert.equal(input.getMetrics().coalescedMoves, 2);
});

test('every click and key event is delivered: a burst of 200 mixed events loses nothing', async () => {
    const h = createHarness();
    const input = createInputController(h.deps);
    const work = [];
    let expectedPresses = 0;
    for (let i = 0; i < 100; i++) {
        work.push(input.handleRemoteInput({ type: 'mouse_move', x: (i % 10) / 10, y: 0.5 }));
        work.push(input.handleRemoteInput({ type: i % 2 ? 'mouse_up' : 'mouse_down', button: 0 }));
        expectedPresses += 1;
    }
    await Promise.all(work);
    assert.equal(h.log.filter((e) => e[0] === 'down' || e[0] === 'up').length, expectedPresses);
});

test('a late, older move from the unordered channel never overrides a newer one', async () => {
    const h = createHarness();
    const input = createInputController(h.deps);

    await input.handleRemoteInput({ type: 'mouse_move', x: 0.5, y: 0.5, seq: 10 });
    await input.handleRemoteInput({ type: 'mouse_move', x: 0.1, y: 0.1, seq: 7 }); // arrived late
    await input.handleRemoteInput({ type: 'mouse_move', x: 0.6, y: 0.6, seq: 11 });

    assert.deepEqual(h.log, [['move', 500, 250], ['move', 600, 300]]);
    assert.equal(input.getMetrics().staleMoves, 1);
});

test('releaseAll frees held keys and mouse buttons, drops queued work and resets move ordering', async () => {
    const h = createHarness();
    const input = createInputController(h.deps);

    await input.handleRemoteInput({ type: 'key_down', code: 'KeyA', key: 'a' });
    await input.handleRemoteInput({ type: 'mouse_down', button: 2 });
    await input.handleRemoteInput({ type: 'mouse_move', x: 0.5, y: 0.5, seq: 999 });
    h.log.length = 0;

    const released = await input.releaseAll();

    assert.deepEqual(released, { keys: 1, buttons: 1 });
    assert.deepEqual(h.log.map((e) => e[0]).sort(), ['keyup', 'up']);
    assert.equal(input.getMetrics().pressedKeys, 0);
    assert.equal(input.getMetrics().pressedButtons, 0);

    // A new session restarts its move sequence at a low number: it must not be treated as stale.
    h.log.length = 0;
    await input.handleRemoteInput({ type: 'mouse_move', x: 0.2, y: 0.2, seq: 1 });
    assert.deepEqual(h.log, [['move', 200, 100]]);
});

test('a key that was already released is not released again by releaseAll', async () => {
    const h = createHarness();
    const input = createInputController(h.deps);
    await input.handleRemoteInput({ type: 'key_down', code: 'KeyB', key: 'b' });
    await input.handleRemoteInput({ type: 'key_up', code: 'KeyB', key: 'b' });
    h.log.length = 0;
    assert.deepEqual(await input.releaseAll(), { keys: 0, buttons: 0 });
    assert.deepEqual(h.log, []);
});

test('small trackpad wheel deltas accumulate instead of rounding to zero and being lost', async () => {
    const h = createHarness();
    const input = createInputController(h.deps);

    await input.handleRemoteInput({ type: 'mouse_wheel', deltaY: 40 });
    await input.handleRemoteInput({ type: 'mouse_wheel', deltaY: 40 });
    assert.deepEqual(h.log, [], '80 px is less than one line');
    await input.handleRemoteInput({ type: 'mouse_wheel', deltaY: 40 });
    assert.deepEqual(h.log, [['scroll', 1]]);

    h.log.length = 0;
    await input.handleRemoteInput({ type: 'mouse_wheel', deltaY: -250 });
    assert.deepEqual(h.log, [['scroll', -2]]);
});

test('the latency probe travels the same ordered queue and reports how long it waited', async () => {
    const h = createHarness({ slowKeyMs: 40 });
    const input = createInputController(h.deps);

    input.handleRemoteInput({ type: 'key_down', code: 'KeyA', key: 'a' });
    const probe = await input.handleRemoteInput({ type: 'input_probe', id: 1 });

    assert.ok(probe.queuedMs >= 30, `probe should have waited behind the slow key (waited ${probe.queuedMs} ms)`);
    assert.deepEqual(h.log.map((e) => e[0]), ['keydown'], 'a probe injects nothing');
});

test('a failing native call rejects only that event and the queue keeps working', async () => {
    const h = createHarness();
    let first = true;
    h.deps.mouse.pressButton = async (b) => {
        if (first) { first = false; throw new Error('driver hiccup'); }
        h.log.push(['down', b]);
    };
    const input = createInputController(h.deps);

    await assert.rejects(input.handleRemoteInput({ type: 'mouse_down', button: 0 }), /driver hiccup/);
    await input.handleRemoteInput({ type: 'mouse_down', button: 0 });
    assert.deepEqual(h.log, [['down', 'left']]);
});
