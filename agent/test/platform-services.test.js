'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { getIPCPath } = require('../src/platform/ipc');
const { createInputController } = require('../src/platform/input');
const { createRuntimeService } = require('../src/platform/runtime');
const { createScreenService } = require('../src/platform/screen');
const { createStartupService } = require('../src/platform/startup');
const { createTrayService } = require('../src/platform/tray');

test('IPC service preserves the Windows named-pipe address', () => {
    assert.equal(
        getIPCPath('win32', '/ignored'),
        '\\\\.\\pipe\\chameleon-agent'
    );
});

test('IPC service uses a Unix domain socket in the platform temp directory', () => {
    assert.equal(
        getIPCPath('darwin', '/private/tmp/chameleon-tests'),
        path.join('/private/tmp/chameleon-tests', 'chameleon-agent.sock')
    );
});

test('tray service preserves BMP icons on Windows', () => {
    const calls = [];
    const nativeImage = {
        createFromPath(iconPath) {
            calls.push(iconPath);
            return {
                setTemplateImage() {
                    assert.fail('Windows tray icons must not become template images');
                }
            };
        }
    };
    const service = createTrayService({ platform: 'win32' });

    service.createIcon(nativeImage, '/agent/assets', 'icon-green');

    assert.deepEqual(calls, [path.join('/agent/assets', 'icon-green.bmp')]);
});

test('tray service uses macOS PNG template images', () => {
    let iconPath = null;
    let templateValue = null;
    const nativeImage = {
        createFromPath(value) {
            iconPath = value;
            return {
                setTemplateImage(value) {
                    templateValue = value;
                }
            };
        }
    };
    const service = createTrayService({ platform: 'darwin' });

    service.createIcon(nativeImage, '/agent/assets', 'icon-yellow');

    assert.equal(iconPath, path.join('/agent/assets', 'icon-yellow.png'));
    assert.equal(templateValue, true);
});

test('runtime service preserves all Windows command-line switches', () => {
    const switches = [];
    const service = createRuntimeService({ platform: 'win32' });

    service.configure({
        appendSwitch(name, value) {
            switches.push([name, value]);
        }
    });

    assert.deepEqual(switches, [
        ['enable-accelerated-video-encode', undefined],
        ['enable-accelerated-video-decode', undefined],
        ['enable-features', 'WebRtcHideLocalIpsWithMdns,PlatformHEVCEncoderSupport'],
        ['ignore-certificate-errors', undefined],
        ['disable-gpu-shader-disk-cache', undefined]
    ]);
});

test('runtime service omits the Windows shader-cache workaround on macOS', () => {
    const switches = [];
    const service = createRuntimeService({ platform: 'darwin' });

    service.configure({
        appendSwitch(name) {
            switches.push(name);
        }
    });

    assert.equal(switches.includes('disable-gpu-shader-disk-cache'), false);
});

test('startup service preserves the packaged Windows login item settings', () => {
    const settings = [];
    const app = {
        isPackaged: true,
        getPath(name) {
            assert.equal(name, 'exe');
            return 'C:\\Program Files\\Service Host\\service-host.exe';
        },
        setLoginItemSettings(value) {
            settings.push(value);
        }
    };
    const service = createStartupService({ platform: 'win32' });

    service.configureAutoStart(app);

    assert.deepEqual(settings, [{
        openAtLogin: true,
        path: 'C:\\Program Files\\Service Host\\service-host.exe'
    }]);
});

test('startup service configures the packaged macOS app bundle as a hidden login item', () => {
    const settings = [];
    const app = {
        isPackaged: true,
        getPath() {
            assert.fail('macOS login items must not target the inner executable');
        },
        setLoginItemSettings(value) {
            settings.push(value);
        }
    };
    const service = createStartupService({ platform: 'darwin' });

    service.configureAutoStart(app);

    assert.deepEqual(settings, [{
        openAtLogin: true,
        openAsHidden: true
    }]);
});

test('startup service runs macOS permissions in order before opening pairing', async () => {
    const calls = [];
    const service = createStartupService({
        platform: 'darwin',
        permissions: {
            async checkAndRequestAccessibility() {
                calls.push('accessibility');
            },
            async checkScreenRecording() {
                calls.push('screen');
            }
        }
    });

    await service.runPostReady(() => calls.push('open'));

    assert.deepEqual(calls, ['accessibility', 'screen', 'open']);
});

test('startup service continues to Screen Recording when Accessibility fails', async () => {
    const calls = [];
    const errors = [];
    const service = createStartupService({
        platform: 'darwin',
        permissions: {
            async checkAndRequestAccessibility() {
                calls.push('accessibility');
                throw new Error('probe failed');
            },
            async checkScreenRecording() {
                calls.push('screen');
            }
        },
        logger: { error(...args) { errors.push(args); } }
    });

    await service.runPostReady(() => calls.push('open'));

    assert.deepEqual(calls, ['accessibility', 'screen', 'open']);
    assert.equal(errors.length, 1);
    assert.match(errors[0][0], /Accessibility/);
    assert.equal(errors[0][1], 'probe failed');
});

test('startup service still opens pairing when Screen Recording fails', async () => {
    const calls = [];
    const errors = [];
    const service = createStartupService({
        platform: 'darwin',
        permissions: {
            async checkAndRequestAccessibility() {
                calls.push('accessibility');
            },
            async checkScreenRecording() {
                calls.push('screen');
                throw new Error('screen probe failed');
            }
        },
        logger: { error(...args) { errors.push(args); } }
    });

    await service.runPostReady(() => calls.push('open'));

    assert.deepEqual(calls, ['accessibility', 'screen', 'open']);
    assert.equal(errors.length, 1);
    assert.match(errors[0][0], /Screen Recording/);
    assert.equal(errors[0][1], 'screen probe failed');
});

test('startup service leaves Windows post-ready and activate behavior unchanged', async () => {
    let openCount = 0;
    const service = createStartupService({
        platform: 'win32',
        permissions: {
            async checkAndRequestAccessibility() {
                assert.fail('Windows must not run macOS permission checks');
            },
            async checkScreenRecording() {
                assert.fail('Windows must not run macOS permission checks');
            }
        }
    });

    await service.runPostReady(() => { openCount += 1; });
    service.handleActivate(() => { openCount += 1; });

    assert.equal(openCount, 0);
});

test('screen service delegates desktop source discovery to Electron', async () => {
    const calls = [];
    const service = createScreenService({
        desktopCapturer: {
            async getSources(options) {
                calls.push(options);
                return [{ id: 'screen:1' }];
            }
        }
    });

    const sources = await service.getDesktopSources();

    assert.deepEqual(calls, [{ types: ['screen'] }]);
    assert.deepEqual(sources, [{ id: 'screen:1' }]);
});

function createFakeInputDependencies() {
    const calls = [];
    const Key = new Proxy({}, {
        get(_target, property) {
            return String(property);
        }
    });
    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
    }

    return {
        calls,
        dependencies: {
            mouse: {
                setPosition(point) {
                    calls.push(['mouse.setPosition', point.x, point.y]);
                    return Promise.resolve();
                },
                async pressButton(button) {
                    calls.push(['mouse.pressButton', button]);
                },
                async releaseButton(button) {
                    calls.push(['mouse.releaseButton', button]);
                },
                async scrollDown(lines) {
                    calls.push(['mouse.scrollDown', lines]);
                }
            },
            Point,
            Button: {
                LEFT: 'left',
                MIDDLE: 'middle',
                RIGHT: 'right'
            },
            screen: {
                async width() {
                    return 1920;
                },
                async height() {
                    return 1080;
                }
            },
            keyboard: {
                async pressKey(key) {
                    calls.push(['keyboard.pressKey', key]);
                },
                async releaseKey(key) {
                    calls.push(['keyboard.releaseKey', key]);
                },
                async type(value) {
                    calls.push(['keyboard.type', value]);
                }
            },
            Key,
            clipboard: {
                writeText(value) {
                    calls.push(['clipboard.writeText', value]);
                }
            }
        }
    };
}

test('input service preserves ordinary key injection', async () => {
    const { calls, dependencies } = createFakeInputDependencies();
    const controller = createInputController(dependencies);

    await controller.handleRemoteInput({ type: 'key_down', code: 'KeyA', key: 'a' });
    await controller.handleRemoteInput({ type: 'key_up', code: 'KeyA', key: 'a' });

    assert.deepEqual(calls, [
        ['keyboard.pressKey', 'A'],
        ['keyboard.releaseKey', 'A']
    ]);
});

test('input service blocks modifier combinations and releases modifiers safely', async () => {
    const { calls, dependencies } = createFakeInputDependencies();
    const controller = createInputController(dependencies);

    await controller.handleRemoteInput({ type: 'key_down', code: 'ControlLeft' });
    await controller.handleRemoteInput({ type: 'key_down', code: 'KeyA', key: 'a' });
    await controller.handleRemoteInput({ type: 'key_up', code: 'ControlLeft' });

    assert.deepEqual(calls, [
        ['keyboard.releaseKey', 'LeftControl']
    ]);
});

test('input service maps normalized mouse coordinates and clipboard events', async () => {
    const { calls, dependencies } = createFakeInputDependencies();
    const controller = createInputController(dependencies);

    await controller.handleRemoteInput({ type: 'mouse_move', x: 1.2, y: -0.5 });
    await controller.handleRemoteInput({ type: 'clipboard_push', text: 'hello' });

    assert.deepEqual(calls, [
        ['mouse.setPosition', 1919, 0],
        ['clipboard.writeText', 'hello']
    ]);
});

test('input service preserves left, middle, and right mouse-button mappings', async () => {
    const { calls, dependencies } = createFakeInputDependencies();
    const controller = createInputController(dependencies);

    await controller.handleRemoteInput({ type: 'mouse_down', button: 0 });
    await controller.handleRemoteInput({ type: 'mouse_up', button: 1 });
    await controller.handleRemoteInput({ type: 'mouse_down', button: 2 });

    assert.deepEqual(calls, [
        ['mouse.pressButton', 'left'],
        ['mouse.releaseButton', 'middle'],
        ['mouse.pressButton', 'right']
    ]);
});
