'use strict';
// node perf/summarize.js result.json [other.json ...]  -> compact table of steady-state metrics + ramp timeline.
const fs = require('fs');

for (const file of process.argv.slice(2)) {
    const r = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`\n== ${file}\n${JSON.stringify(r.env)}`);
    for (const x of r.results) {
        if (x.skipped || x.error) { console.log(`${x.name}: ${x.skipped || x.error}`); continue; }
        console.log([
            x.name.padEnd(18),
            `cap ${x.captureSettings.width}x${x.captureSettings.height}@${x.captureSettings.frameRate}`,
            `sent ${x.sent.width}x${x.sent.height}`,
            `${(x.codec || '').replace('video/', '')} enc=${x.encoderImplementation}${x.powerEfficientEncoder ? '(HW)' : ''} dec=${(x.decoderImplementation || '').replace('ExternalDecoder ', '')}`,
            `fps enc/dec/render ${x.encodedFps}/${x.decodedFps}/${x.renderedFps}`,
            `${x.bitrateKbps}kbps`,
            `encode ${x.avgEncodeMsPerFrame}ms decode ${x.avgDecodeMsPerFrame}ms jitterbuf ${x.avgJitterBufferMs}ms render ${x.avgRenderPresentMs}ms`,
            `drop ${x.framesDroppedAtReceiver} freeze ${x.freezes} lost ${x.packetsLost} limit=${x.qualityLimitationReason}`,
            `cpu mean/max ${x.cpuPercentAllProcessesMean}/${x.cpuPercentAllProcessesMax}%`,
        ].join(' | '));
        if (x.rampTimeline) {
            console.log('   ramp (s: WxH @fps kbps): ' + x.rampTimeline.map((p) => `${p.t}:${p.w}x${p.h}@${p.fps} ${p.kbps}`).join('  '));
        }
    }
}
