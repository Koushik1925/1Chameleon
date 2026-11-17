'use strict';
/**
 * Loopback pipeline benchmark: real desktop capture -> WebRTC encoder -> (loopback) -> decoder, all in this machine.
 * It isolates capture + encode + decode cost from network effects, so it answers "is the lag the pipeline or the
 * network?". It cannot measure real networks, TURN or packet loss.
 *
 *   npx electron perf/pipeline-bench.js --out=result.json [--seconds=8] [--profiles=before-h264,before-vp8,...]
 *
 * It shows a full-screen animated page (scrolling text + moving shapes) so every run captures identical, constant
 * motion. Do not touch the machine while it runs (~1-2 minutes).
 */
const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const fs = require('fs');
const path = require('path');

const arg = (name, def) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : def;
};
const OUT = arg('out', path.join(__dirname, 'last-run.json'));

// Same GPU flags the real agent applies (src/platform/runtime) so the encoder choice matches production.
app.commandLine.appendSwitch('enable-accelerated-video-encode');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-features', 'WebRtcHideLocalIpsWithMdns,PlatformHEVCEncoderSupport');

ipcMain.handle('get-desktop-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
    return sources.map((s) => ({ id: s.id, name: s.name }));
});
ipcMain.handle('cpu-sample', () => {
    // percentCPUUsage is per process since the previous call; summed over all Electron processes.
    const m = app.getAppMetrics();
    return m.reduce((sum, p) => sum + (p.cpu ? p.cpu.percentCPUUsage : 0), 0);
});
ipcMain.on('bench:done', (_e, result) => {
    fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
    console.log('wrote', OUT);
    app.quit();
});

app.whenReady().then(() => {
    const win = new BrowserWindow({
        fullscreen: true,
        frame: false,
        alwaysOnTop: true,
        backgroundColor: '#101820',
        webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false },
    });
    win.loadFile(path.join(__dirname, 'pipeline-bench.html'), {
        query: { seconds: arg('seconds', '8'), ramp: arg('ramp', '12'), profiles: arg('profiles', ''), content: arg('content', 'typical') },
    });
});
