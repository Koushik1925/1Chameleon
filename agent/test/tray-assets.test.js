'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { createTrayService } = require('../src/platform/tray');

test('tray assets resolve to the source-tree assets directory in development', () => {
    const service = createTrayService({
        sourceAssetsDirectory: '/workspace/agent/assets'
    });

    assert.equal(
        service.getAssetsDirectory(false),
        '/workspace/agent/assets'
    );
});

test('tray assets resolve below Electron resources on macOS when packaged', () => {
    const service = createTrayService({
        platform: 'darwin',
        pathApi: path.posix,
        sourceAssetsDirectory: '/workspace/agent/assets',
        resourcesPath: '/Applications/Service Host.app/Contents/Resources'
    });

    assert.equal(
        service.getAssetsDirectory(true),
        '/Applications/Service Host.app/Contents/Resources/assets'
    );
});

test('tray assets resolve below Electron resources on Windows when packaged', () => {
    const service = createTrayService({
        platform: 'win32',
        pathApi: path.win32,
        sourceAssetsDirectory: 'C:\\workspace\\agent\\assets',
        resourcesPath: 'C:\\Program Files\\Service Host\\resources'
    });

    assert.equal(
        service.getAssetsDirectory(true),
        'C:\\Program Files\\Service Host\\resources\\assets'
    );
});
