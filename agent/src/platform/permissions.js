'use strict';

/**
 * agent/src/platform/permissions.js
 *
 * Centralized macOS permission handler.
 *
 * Responsibilities:
 *   - Probe Accessibility and Screen Recording permissions without triggering
 *     repeated system warnings.
 *   - Show a single, user-friendly Electron dialog when a permission is missing.
 *   - Provide an "Open Settings" button that navigates to the correct pane.
 *   - Rate-limit dialog presentation so the user is never spammed.
 *   - Be an absolute no-op on Windows / Linux.
 *
 * Public API:
 *   checkAndRequestAccessibility() -> Promise<boolean>
 *   checkScreenRecording()         -> Promise<boolean>
 *   logPermissionStatus()          -> void   (logs a one-line summary)
 *
 * Callers:
 *   agent/src/main.js — called once inside app.whenReady() on darwin.
 */

// ── Guards ────────────────────────────────────────────────────────────────────
// Ensure this module never executes non-trivially on Windows / Linux.
const IS_MAC = process.platform === 'darwin';

// Prevent showing the same dialog more than once per session.
let _accessibilityDialogShown = false;
let _screenRecordingDialogShown = false;

// ── Accessibility ─────────────────────────────────────────────────────────────

/**
 * Returns true if the Accessibility permission is currently granted.
 * On non-macOS platforms always returns true.
 *
 * Uses `isTrustedAccessibilityClient(false)` — the `false` argument means
 * "do NOT show the system accessibility prompt" so Electron does NOT trigger
 * the repeated nut.js WARNING flood.
 */
function isAccessibilityGranted() {
    if (!IS_MAC) return true;
    try {
        const { systemPreferences } = require('electron');
        return systemPreferences.isTrustedAccessibilityClient(false);
    } catch (e) {
        console.error('[Platform] [Permissions] Accessibility probe error:', e.message);
        return false;
    }
}

/**
 * Checks Accessibility permission and, if missing, shows a single user-friendly
 * dialog guiding the user to System Settings → Privacy & Security → Accessibility.
 *
 * @returns {Promise<boolean>} true if permission is granted.
 */
async function checkAndRequestAccessibility() {
    if (!IS_MAC) return true;

    const granted = isAccessibilityGranted();
    if (granted) {
        console.log('[Platform] [Permissions] Accessibility permission: Granted');
        return true;
    }

    console.log('[Platform] [Permissions] Accessibility permission: Missing');

    if (!_accessibilityDialogShown) {
        _accessibilityDialogShown = true;
        await _showPermissionDialog({
            title: 'Accessibility Permission Required',
            message: 'Chameleon needs Accessibility access to control this computer remotely.',
            detail: [
                'Without this permission, keyboard and mouse input from the remote viewer will not work.',
                '',
                'To enable it:',
                '  1. Click "Open Settings" below.',
                '  2. In System Settings → Privacy & Security → Accessibility,',
                '     find this application and toggle it on.',
                '  3. Restart the application.',
            ].join('\n'),
            settingsUrl: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
        });
    }

    // Re-probe after the dialog in case the user already enabled it
    const recheck = isAccessibilityGranted();
    if (recheck) {
        console.log('[Platform] [Permissions] Accessibility permission: Granted after dialog');
    } else {
        console.log('[Platform] [Permissions] Waiting for user to enable Accessibility...');
    }
    return recheck;
}

// ── Screen Recording ──────────────────────────────────────────────────────────

/**
 * Probes Screen Recording permission by attempting a zero-cost desktopCapturer
 * call. On macOS 10.15+ a denied capture returns an empty sources list.
 *
 * This probe is intentionally lightweight: thumbnail size is 1×1 to avoid
 * allocating any real framebuffer memory.
 *
 * @returns {Promise<boolean>} true if screen capture is available.
 */
async function checkScreenRecording() {
    if (!IS_MAC) return true;

    try {
        const { desktopCapturer } = require('electron');
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1, height: 1 },
        });

        const granted = sources.length > 0;
        if (granted) {
            console.log('[Platform] [Permissions] Screen Recording permission: Granted');
        } else {
            console.log('[Platform] [Permissions] Screen Recording permission: Missing');
            if (!_screenRecordingDialogShown) {
                _screenRecordingDialogShown = true;
                await _showPermissionDialog({
                    title: 'Screen Recording Permission Required',
                    message: 'Chameleon needs Screen Recording access to share your screen with the remote viewer.',
                    detail: [
                        'Without this permission, the remote viewer will see a black screen.',
                        '',
                        'To enable it:',
                        '  1. Click "Open Settings" below.',
                        '  2. In System Settings → Privacy & Security → Screen Recording,',
                        '     find this application and toggle it on.',
                        '  3. Restart the application.',
                    ].join('\n'),
                    settingsUrl: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
                });
            }
        }
        return granted;
    } catch (e) {
        console.error('[Platform] [Permissions] Screen Recording probe error:', e.message);
        return false;
    }
}

// ── Shared dialog helper ──────────────────────────────────────────────────────

/**
 * Shows a user-friendly permission dialog with an "Open Settings" button.
 * This helper is private to this module.
 *
 * @param {object} opts
 * @param {string} opts.title       - Dialog title
 * @param {string} opts.message     - Short description (bold on macOS)
 * @param {string} opts.detail      - Step-by-step instructions
 * @param {string} opts.settingsUrl - x-apple.systempreferences:// URL to open
 */
async function _showPermissionDialog({ title, message, detail, settingsUrl }) {
    const { dialog, shell } = require('electron');

    const { response } = await dialog.showMessageBox({
        type: 'warning',
        title,
        message,
        detail,
        buttons: ['Open Settings', 'Later'],
        defaultId: 0,
        cancelId: 1,
    });

    if (response === 0) {
        // Open the correct Privacy & Security pane directly
        shell.openExternal(settingsUrl).catch((e) => {
            console.error('[Platform] [Permissions] Failed to open settings URL:', e.message);
        });
    }
}

// ── Summary logger ────────────────────────────────────────────────────────────

/**
 * Logs a single-line summary of all macOS permission states.
 * Safe to call on any platform (no-op on non-darwin).
 */
async function logPermissionStatus() {
    if (!IS_MAC) return;

    const a11y = isAccessibilityGranted();
    // Screen recording probe is async, so fire-and-forget here
    const { desktopCapturer } = require('electron');
    let screenOk = false;
    try {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1, height: 1 },
        });
        screenOk = sources.length > 0;
    } catch (_) { /* probe failed — treat as denied */ }

    console.log(
        `[Platform] [Permissions] Status — ` +
        `Accessibility: ${a11y ? 'Granted' : 'Missing'} | ` +
        `Screen Recording: ${screenOk ? 'Granted' : 'Missing'}`
    );
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
    checkAndRequestAccessibility,
    checkScreenRecording,
    logPermissionStatus,
};
