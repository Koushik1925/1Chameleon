'use strict';

const defaultPermissions = require('../permissions');

function createStartupService({
    platform = process.platform,
    permissions = defaultPermissions,
    logger = console
} = {}) {
    return {
        /**
         * Registers the packaged application as a login item without leaking
         * platform-specific bundle/executable details into application startup.
         */
        configureAutoStart(app) {
            if (!app.isPackaged) return;

            if (platform === 'darwin') {
                app.setLoginItemSettings({
                    openAtLogin: true,
                    openAsHidden: true
                });
                return;
            }

            app.setLoginItemSettings({
                openAtLogin: true,
                path: app.getPath('exe')
            });
        },

        /**
         * Runs platform-specific post-ready work. Windows remains tray-only;
         * macOS checks permissions before presenting the pairing window.
         */
        async runPostReady(openPairingWindow) {
            if (platform === 'darwin') {
                try {
                    await permissions.checkAndRequestAccessibility();
                } catch (error) {
                    logger.error(
                        '[Platform] [Permissions] Accessibility startup check failed:',
                        error.message
                    );
                }

                try {
                    await permissions.checkScreenRecording();
                } catch (error) {
                    logger.error(
                        '[Platform] [Permissions] Screen Recording startup check failed:',
                        error.message
                    );
                }
                if (typeof openPairingWindow === 'function') {
                    openPairingWindow();
                }
            }
        },

        /**
         * Restores the visible macOS pairing window when the Dock icon is used.
         */
        handleActivate(openPairingWindow) {
            if (platform === 'darwin') {
                openPairingWindow();
            }
        }
    };
}

const startupService = createStartupService();

module.exports = {
    configureAutoStart: startupService.configureAutoStart,
    createStartupService,
    handleActivate: startupService.handleActivate,
    runPostReady: startupService.runPostReady
};
