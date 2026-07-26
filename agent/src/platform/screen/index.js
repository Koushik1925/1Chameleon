'use strict';

function createScreenService({ desktopCapturer }) {
    return {
        /**
         * Returns Electron desktop capture sources using the existing screen-only
         * contract consumed by the hidden WebRTC renderer.
         */
        getDesktopSources() {
            return desktopCapturer.getSources({ types: ['screen'] });
        }
    };
}

function getDesktopSources() {
    const { desktopCapturer } = require('electron');
    return createScreenService({ desktopCapturer }).getDesktopSources();
}

module.exports = {
    createScreenService,
    getDesktopSources
};
