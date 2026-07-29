'use strict';

const SHARED_SWITCHES = [
    ['enable-accelerated-video-encode'],
    ['enable-accelerated-video-decode'],
    ['enable-features', 'WebRtcHideLocalIpsWithMdns,PlatformHEVCEncoderSupport'],
    ['ignore-certificate-errors']
];

function createRuntimeService({ platform = process.platform, logger = console } = {}) {
    return {
        /**
         * Applies Chromium switches before Electron becomes ready.
         *
         * @param {Electron.CommandLine} commandLine
         */
        configure(commandLine) {
            try {
                for (const [name, value] of SHARED_SWITCHES) {
                    if (value === undefined) {
                        commandLine.appendSwitch(name);
                    } else {
                        commandLine.appendSwitch(name, value);
                    }
                }

                if (platform === 'win32') {
                    commandLine.appendSwitch('disable-gpu-shader-disk-cache');
                }
            } catch (error) {
                logger.error('[GPU] Flag error:', error);
            }
        }
    };
}

const runtimeService = createRuntimeService();

module.exports = {
    configure: runtimeService.configure,
    createRuntimeService
};
