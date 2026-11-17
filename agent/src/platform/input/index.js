'use strict';

function buildKeyMap(Key) {
    return {
        Escape: Key.Escape,
        Tab: Key.Tab,
        ShiftLeft: Key.LeftShift,
        ShiftRight: Key.RightShift,
        ControlLeft: Key.LeftControl,
        ControlRight: Key.RightControl,
        AltLeft: Key.LeftAlt,
        AltRight: Key.RightAlt,
        MetaLeft: Key.LeftSuper,
        MetaRight: Key.RightSuper,
        Enter: Key.Return,
        NumpadEnter: Key.Return,
        Backspace: Key.Backspace,
        Space: Key.Space,
        ArrowUp: Key.Up,
        ArrowDown: Key.Down,
        ArrowLeft: Key.Left,
        ArrowRight: Key.Right,
        Home: Key.Home,
        End: Key.End,
        PageUp: Key.PageUp,
        PageDown: Key.PageDown,
        Delete: Key.Delete,
        Insert: Key.Insert,
        CapsLock: Key.CapsLock,
        KeyA: Key.A,
        KeyB: Key.B,
        KeyC: Key.C,
        KeyD: Key.D,
        KeyE: Key.E,
        KeyF: Key.F,
        KeyG: Key.G,
        KeyH: Key.H,
        KeyI: Key.I,
        KeyJ: Key.J,
        KeyK: Key.K,
        KeyL: Key.L,
        KeyM: Key.M,
        KeyN: Key.N,
        KeyO: Key.O,
        KeyP: Key.P,
        KeyQ: Key.Q,
        KeyR: Key.R,
        KeyS: Key.S,
        KeyT: Key.T,
        KeyU: Key.U,
        KeyV: Key.V,
        KeyW: Key.W,
        KeyX: Key.X,
        KeyY: Key.Y,
        KeyZ: Key.Z,
        Digit1: Key.Num1,
        Digit2: Key.Num2,
        Digit3: Key.Num3,
        Digit4: Key.Num4,
        Digit5: Key.Num5,
        Digit6: Key.Num6,
        Digit7: Key.Num7,
        Digit8: Key.Num8,
        Digit9: Key.Num9,
        Digit0: Key.Num0,
        Numpad1: Key.Num1,
        Numpad2: Key.Num2,
        Numpad3: Key.Num3,
        Numpad4: Key.Num4,
        Numpad5: Key.Num5,
        Numpad6: Key.Num6,
        Numpad7: Key.Num7,
        Numpad8: Key.Num8,
        Numpad9: Key.Num9,
        Numpad0: Key.Num0,
        Minus: Key.Minus,
        Equal: Key.Equal,
        BracketLeft: Key.BracketLeft,
        BracketRight: Key.BracketRight,
        Backslash: Key.Backslash,
        Semicolon: Key.Semicolon,
        Quote: Key.Quote,
        Comma: Key.Comma,
        Period: Key.Period,
        Slash: Key.Slash,
        Backquote: Key.Grave
    };
}

function getMouseButton(button, Button) {
    if (button === 2) return Button.RIGHT;
    if (button === 1) return Button.MIDDLE;
    return Button.LEFT;
}

/**
 * Zero the artificial pauses nut-js inserts around native input calls.
 *
 * nut-js sleeps `config.autoDelayMs` BEFORE every pressKey / releaseKey / type character (default 300 ms) and
 * before every pressButton / releaseButton / scroll (default 100 ms). That is meant for scripted automation; for a
 * live remote session it made every key press arrive ~300 ms late (measured: a press+release pair took ~628 ms at the
 * default and ~31 ms with the delay at 0 on the test machine) and every click ~100 ms late.
 */
function disableAutoDelay(...devices) {
    for (const device of devices) {
        if (device && device.config && typeof device.config === 'object' && 'autoDelayMs' in device.config) {
            device.config.autoDelayMs = 0;
        }
    }
}

const WHEEL_PIXELS_PER_LINE = 100;

function createInputController({
    mouse,
    Point,
    Button,
    screen,
    keyboard,
    Key,
    clipboard,
    now = () => Date.now()
}) {
    disableAutoDelay(mouse, keyboard);

    const keyMap = buildKeyMap(Key);
    let ctrlDown = false;
    let altDown = false;
    let metaDown = false;
    let shiftDown = false;

    // What this controller has pressed on the host, so a dropped session can never leave a key or button stuck down.
    const pressedKeys = new Map();   // nut key -> nut key
    const pressedButtons = new Set();
    let lastMoveSeq = -1;            // moves travel on an unordered channel: a late, older one must not win
    let wheelRemainder = 0;

    // ── Ordered execution ────────────────────────────────────────────────────────────────────────
    // Events used to run concurrently (each IPC message started its own async handler), so a click could overtake
    // the move before it, and key releases could overtake presses. Now everything runs strictly in arrival order.
    // The one exception is mouse_move: when a move is still waiting behind slower work, a newer move REPLACES it
    // (only the final position matters), which also stops stale moves piling up while the host is busy.
    const queue = [];
    let draining = false;
    const metrics = { processed: 0, coalescedMoves: 0, staleMoves: 0, maxQueueDepth: 0, errors: 0 };

    function push(data) {
        const last = queue[queue.length - 1];
        if (data.type === 'mouse_move' && last && last.data.type === 'mouse_move') {
            last.data = data;
            metrics.coalescedMoves += 1;
            return last.promise;
        }
        const item = { data, queuedAt: now() };
        item.promise = new Promise((resolve, reject) => {
            item.resolve = resolve;
            item.reject = reject;
        });
        queue.push(item);
        if (queue.length > metrics.maxQueueDepth) metrics.maxQueueDepth = queue.length;
        if (!draining) drain();
        return item.promise;
    }

    async function drain() {
        draining = true;
        while (queue.length > 0) {
            const item = queue.shift();
            try {
                await process(item.data);
                metrics.processed += 1;
                item.resolve({ queuedMs: now() - item.queuedAt });
            } catch (error) {
                metrics.errors += 1;
                item.reject(error);
            }
        }
        draining = false;
    }

    async function moveTo(x, y) {
        const screenWidth = await screen.width();
        const screenHeight = await screen.height();
        const targetX = Math.max(0, Math.min(Math.floor(x * screenWidth), screenWidth - 1));
        const targetY = Math.max(0, Math.min(Math.floor(y * screenHeight), screenHeight - 1));
        await mouse.setPosition(new Point(targetX, targetY));
    }

    const hasPosition = (data) => Number.isFinite(data.x) && Number.isFinite(data.y);

    async function pressKey(nutKey) {
        pressedKeys.set(nutKey, nutKey);
        await keyboard.pressKey(nutKey);
    }

    async function releaseKey(nutKey) {
        pressedKeys.delete(nutKey);
        await keyboard.releaseKey(nutKey);
    }

    async function process(data) {
        if (data.type === 'key_down' || data.type === 'key_up') {
            const isDown = data.type === 'key_down';
            const code = data.code;
            let isModifier = false;

            if (code === 'ControlLeft' || code === 'ControlRight') {
                ctrlDown = isDown;
                isModifier = true;
            } else if (code === 'AltLeft' || code === 'AltRight') {
                altDown = isDown;
                isModifier = true;
            } else if (code === 'MetaLeft' || code === 'MetaRight') {
                metaDown = isDown;
                isModifier = true;
            } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
                shiftDown = isDown;
                isModifier = true;
            }

            if (isModifier) {
                if (!isDown) {
                    const nutKey = keyMap[code];
                    if (nutKey !== undefined) {
                        await releaseKey(nutKey).catch(() => {});
                    }
                }
                return;
            }

            if (ctrlDown || altDown || metaDown) {
                return;
            }

            if (shiftDown && (!data.key || data.key.length !== 1)) {
                return;
            }
        }

        if (
            typeof data.type === 'string' &&
            data.type.startsWith('mouse_') &&
            (ctrlDown || altDown || metaDown)
        ) {
            return;
        }

        if (data.type === 'mouse_move') {
            if (typeof data.seq === 'number') {
                if (data.seq < lastMoveSeq) {
                    metrics.staleMoves += 1;
                    return;
                }
                lastMoveSeq = data.seq;
            }
            await moveTo(data.x, data.y);
        } else if (data.type === 'mouse_down') {
            // The move that preceded this click travelled on a different (unordered) channel and may not have
            // arrived yet: the click carries its own position, so it always lands where the user pointed.
            if (hasPosition(data)) await moveTo(data.x, data.y);
            const button = getMouseButton(data.button, Button);
            pressedButtons.add(button);
            await mouse.pressButton(button);
        } else if (data.type === 'mouse_up') {
            if (hasPosition(data)) await moveTo(data.x, data.y);
            const button = getMouseButton(data.button, Button);
            pressedButtons.delete(button);
            await mouse.releaseButton(button);
        } else if (data.type === 'mouse_wheel') {
            // Keep the sub-line remainder: precision trackpads send many small deltas that each round to 0 lines.
            wheelRemainder += Number(data.deltaY) || 0;
            const lines = Math.trunc(wheelRemainder / WHEEL_PIXELS_PER_LINE);
            if (lines !== 0) {
                wheelRemainder -= lines * WHEEL_PIXELS_PER_LINE;
                await mouse.scrollDown(lines);
            }
        } else if (data.type === 'key_down') {
            if (shiftDown && data.key && data.key.length === 1) {
                await keyboard.type(data.key);
            } else {
                const nutKey = keyMap[data.code];
                if (nutKey !== undefined) {
                    await pressKey(nutKey);
                } else if (data.key && data.key.length === 1) {
                    await keyboard.type(data.key);
                }
            }
        } else if (data.type === 'key_up') {
            if (!(shiftDown && data.key && data.key.length === 1)) {
                const nutKey = keyMap[data.code];
                if (nutKey !== undefined) {
                    await releaseKey(nutKey);
                }
            }
        } else if (data.type === 'clipboard_push') {
            clipboard.writeText(data.text);
        }
        // 'input_probe' (and any unknown type) does nothing but still travels the queue: that is the point of a probe.
    }

    return {
        /** Resolves once the event has been executed (in arrival order). */
        handleRemoteInput(data) {
            if (!data || typeof data.type !== 'string') return Promise.resolve();
            return push(data);
        },

        /**
         * Drop anything still queued and release every key/button this controller pressed. Call when a session
         * ends or its input channel closes, so the host never keeps a stuck key or mouse button.
         */
        async releaseAll() {
            const dropped = queue.splice(0);
            for (const item of dropped) item.resolve({ queuedMs: 0, dropped: true });
            const keys = [...pressedKeys.values()];
            const buttons = [...pressedButtons];
            pressedKeys.clear();
            pressedButtons.clear();
            ctrlDown = altDown = metaDown = shiftDown = false;
            lastMoveSeq = -1;
            wheelRemainder = 0;
            for (const key of keys) {
                try { await keyboard.releaseKey(key); } catch { /* best effort */ }
            }
            for (const button of buttons) {
                try { await mouse.releaseButton(button); } catch { /* best effort */ }
            }
            return { keys: keys.length, buttons: buttons.length };
        },

        getMetrics() {
            return { ...metrics, queueDepth: queue.length, pressedKeys: pressedKeys.size, pressedButtons: pressedButtons.size };
        }
    };
}

function createNativeInputController(clipboard) {
    const nut = require('@nut-tree-fork/nut-js');
    return createInputController({
        ...nut,
        clipboard
    });
}

module.exports = {
    createInputController,
    createNativeInputController
};
