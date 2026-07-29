'use strict';

const path = require('path');

function createTrayService({
    platform = process.platform,
    pathApi = path,
    sourceAssetsDirectory = path.resolve(__dirname, '..', '..', '..', 'assets'),
    resourcesPath = process.resourcesPath
} = {}) {
    return {
        /**
         * Locates tray assets in the source tree during development and in
         * Electron Builder's resources directory in packaged applications.
         *
         * @param {boolean} isPackaged
         * @returns {string}
         */
        getAssetsDirectory(isPackaged = false) {
            if (!isPackaged) {
                return sourceAssetsDirectory;
            }

            return pathApi.join(resourcesPath, 'assets');
        },

        /**
         * Creates a tray icon with the native format and image settings for the
         * current platform.
         *
         * @param {Electron.NativeImage} nativeImage
         * @param {string} assetsDirectory
         * @param {string} baseName
         * @returns {Electron.NativeImage}
         */
        createIcon(nativeImage, assetsDirectory, baseName) {
            const extension = platform === 'darwin' ? 'png' : 'bmp';
            const image = nativeImage.createFromPath(
                pathApi.join(assetsDirectory, `${baseName}.${extension}`)
            );

            if (platform === 'darwin') {
                image.setTemplateImage(true);
            }

            return image;
        }
    };
}

const trayService = createTrayService();

module.exports = {
    createIcon: trayService.createIcon,
    getAssetsDirectory: trayService.getAssetsDirectory,
    createTrayService
};
