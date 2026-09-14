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
            try {
                const extension = platform === 'darwin' ? 'png' : 'bmp';
                let image = nativeImage.createFromPath(
                    pathApi.join(assetsDirectory, `${baseName}.${extension}`)
                );

                if (image && typeof image.isEmpty === 'function' && image.isEmpty()) {
                    image = nativeImage.createFromPath(
                        pathApi.join(assetsDirectory, `${baseName}.png`)
                    );
                }

                if (image && typeof image.isEmpty === 'function' && !image.isEmpty() && typeof image.resize === 'function') {
                    image = image.resize({ width: 16, height: 16 });
                }

                if (platform === 'darwin' && image && typeof image.setTemplateImage === 'function') {
                    image.setTemplateImage(true);
                }

                return image;
            } catch (e) {
                if (nativeImage && typeof nativeImage.createEmpty === 'function') {
                    return nativeImage.createEmpty();
                }
                return null;
            }
        }
    };
}

const trayService = createTrayService();

module.exports = {
    createIcon: trayService.createIcon,
    getAssetsDirectory: trayService.getAssetsDirectory,
    createTrayService
};
