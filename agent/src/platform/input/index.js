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

function createInputController({
    mouse,
    Point,
    Button,
    screen,
    keyboard,
    Key,
    clipboard
}) {
    const keyMap = buildKeyMap(Key);
    let ctrlDown = false;
    let altDown = false;
    let metaDown = false;
    let shiftDown = false;

    return {
        async handleRemoteInput(data) {
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
                            keyboard.releaseKey(nutKey).catch(() => {});
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
                data.type.startsWith('mouse_') &&
                (ctrlDown || altDown || metaDown)
            ) {
                return;
            }

            if (data.type === 'mouse_move') {
                const screenWidth = await screen.width();
                const screenHeight = await screen.height();
                const targetX = Math.max(
                    0,
                    Math.min(Math.floor(data.x * screenWidth), screenWidth - 1)
                );
                const targetY = Math.max(
                    0,
                    Math.min(Math.floor(data.y * screenHeight), screenHeight - 1)
                );
                mouse.setPosition(new Point(targetX, targetY)).catch(() => {});
            } else if (data.type === 'mouse_down') {
                await mouse.pressButton(getMouseButton(data.button, Button));
            } else if (data.type === 'mouse_up') {
                await mouse.releaseButton(getMouseButton(data.button, Button));
            } else if (data.type === 'mouse_wheel') {
                const lines = Math.round(data.deltaY / 100);
                if (lines !== 0) {
                    await mouse.scrollDown(
                        Math.abs(lines) * (lines > 0 ? 1 : -1)
                    );
                }
            } else if (data.type === 'key_down') {
                if (shiftDown && data.key && data.key.length === 1) {
                    await keyboard.type(data.key);
                } else {
                    const nutKey = keyMap[data.code];
                    if (nutKey !== undefined) {
                        await keyboard.pressKey(nutKey);
                    } else if (data.key && data.key.length === 1) {
                        await keyboard.type(data.key);
                    }
                }
            } else if (data.type === 'key_up') {
                if (!(shiftDown && data.key && data.key.length === 1)) {
                    const nutKey = keyMap[data.code];
                    if (nutKey !== undefined) {
                        await keyboard.releaseKey(nutKey);
                    }
                }
            } else if (data.type === 'clipboard_push') {
                clipboard.writeText(data.text);
            }
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
