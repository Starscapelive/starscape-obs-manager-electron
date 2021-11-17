import path from 'path';
import os from "os";
import gm from "gm";
import * as isDev from 'electron-is-dev'
declare const __static: string;

class AppPaths {
    static replaceAsar(path = "") {
        return path.replace(".asar", ".asar.unpacked");
    }
}
let _gm = null
const useFixedPath = !isDev
if (os.platform() == "win32") {
    let graphicsmagick = require("graphicsmagick-static").path;
    graphicsmagick = path.join(graphicsmagick, "/")
    useFixedPath && (graphicsmagick = AppPaths.replaceAsar(graphicsmagick))
    _gm = gm.subClass({
      imageMagick: false,
      appPath: graphicsmagick
    } as any)
    isDev && (console.log('path', graphicsmagick))
} else {
    let imagemagick = path.join(__static, '/resources/mac/ImageMagick-7.0.8/bin') 
    imagemagick = path.join(__static, '/ImageMagick-7.0.8/bin') 
    imagemagick = path.join(imagemagick, "/")
    useFixedPath && (imagemagick = AppPaths.replaceAsar(imagemagick))
    _gm = gm.subClass({
      imageMagick: true,
      appPath: imagemagick
    } as any)
    isDev && (console.log('path', imagemagick))
}

// then do any stuff you need
export const imagick = _gm
