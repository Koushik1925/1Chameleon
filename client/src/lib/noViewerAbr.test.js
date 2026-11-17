import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// REGRESSION GUARD. The viewer is the video RECEIVER: its availableOutgoingBitrate measures the few bytes of mouse /
// keyboard it sends, so basing quality on it forced every healthy stream down to 360p20. Quality is decided on the
// host (agent/src/lib/qualityController.js) from sender-side stats. These tests fail if viewer-side ABR comes back.

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(js|jsx)$/.test(entry.name) && !/\.test\.js$/.test(entry.name) ? [full] : [];
  });
}

test('the viewer-side adaptive controller is gone', () => {
  assert.equal(fs.existsSync(path.join(srcDir, 'lib', 'adaptiveController.js')), false);
});

test('no viewer code reads availableOutgoingBitrate or imports an adaptive controller', () => {
  for (const file of sourceFiles(srcDir)) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(/availableOutgoingBitrate/.test(text), false, `${path.relative(srcDir, file)} reads availableOutgoingBitrate`);
    assert.equal(/AdaptiveController|adaptiveController/.test(text), false, `${path.relative(srcDir, file)} references the old viewer ABR`);
  }
});

test('the viewer never sends update_resolution on its own: only from an explicit user choice handler', () => {
  const app = fs.readFileSync(path.join(srcDir, 'App.jsx'), 'utf8');
  assert.equal(/update_resolution/.test(app), false, 'App.jsx must not send automatic quality changes');
  for (const file of sourceFiles(path.join(srcDir, 'lib'))) {
    assert.equal(/update_resolution/.test(fs.readFileSync(file, 'utf8')), false, `${path.basename(file)} sends update_resolution`);
  }
});
