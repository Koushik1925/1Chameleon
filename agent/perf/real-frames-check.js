'use strict';
/**
 * Real-frames check (no desktop capture, no network): animated canvas -> real WebRTC encoder (loopback) -> real decoder,
 * with the production host StreamTuner steering the sender and the production viewer StatsMonitor reading the receiver.
 * Verifies, with actual video frames, that
 *   1. quality does not fall to the bottom rung while RTT and loss are healthy, and
 *   2. the receiver-side FPS / bitrate shown in the toolbar are real (non-zero) numbers.
 *
 *   npx electron perf/real-frames-check.js [--seconds=40] [--preset=balanced]
 * Exits 0 on pass, 1 on failure. Runs in a hidden window; nothing is captured from the screen.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const arg = (name, def) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : def;
};
const seconds = Number(arg('seconds', '40'));

ipcMain.on('check:done', (_e, result) => {
    console.log(JSON.stringify(result, null, 2));
    console.log(result.pass ? 'PASS' : 'FAIL: ' + result.failures.join('; '));
    app.exit(result.pass ? 0 : 1);
});

app.whenReady().then(() => {
    const win = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false }
    });
    win.loadFile(path.join(__dirname, 'real-frames-check.html'), { query: { seconds: String(seconds), preset: arg('preset', 'balanced') } });
    setTimeout(() => { console.log('FAIL: timed out'); app.exit(1); }, (seconds + 60) * 1000);
});
