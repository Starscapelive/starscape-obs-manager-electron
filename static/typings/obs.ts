import {PLATFORM} from './index';



// 存储目录信息
interface OBS_PATH {
    obsRoot : string;
    pluginFolder: string;
    pluginLocale: string;
}

// OBS的配置信息
interface OBS_CONFIGS {
    path: OBS_PATH;
    version : string;
    platform: PLATFORM;
}

interface PLUGIN_DATA {
    id: number;
    name: string;
    version: string;
    author : string;
    pluginType: pluginType;  //定义不同的插件类型
    fileLists: string[];  //插件的文件列表
    script: string; //额外的脚本
}

// fileListV2?: pluginFile[];  //插件的文件列表
interface pluginFile {
    filename : string;
    extension : string;
    path : string;
}

enum pluginType {
    dll = "dll",
    exe = "exe",
    starscape = "ss",
    obs = "obs"
}

enum obsProcessName {
    win64 = "obs64.exe",
    win32 = "obs32.exe",
    macos = "",
}

interface OBSProcessObject{
    running: boolean;
    pid: number;
}
// 系统内置插件列表
const systemPlugins = [
    "coreaudio-encoder",
    "decklink-captions",
    "decklink-ouput-ui",
    "enc-amf",
    "frontend-tools",
    "image-source",
    "obs-browser",
    "obs-ffmpeg",
    "obs-filters",
    "obs-outputs",
    "obs-qsv11",
    "obs-text",
    "obs-transitions",
    "obs-x264",
    "obs-vst",
    "rtmp-services",
    "text-freetype2",
    "vlc-video",
    "win-capture",
    "win-decklink",
    "win-dshow",
    "win-wasapi",
]

// windows DLL文件数据格式
interface IOBS_DLL_INFO{
    CompanyName?:string,
    FileDescription?:string,
    FileVersion?:string,
    InternalName?:string,
    LegalCopyright?:string,
    LegalTrademarks?:string,
    OriginalFilename?:string,
    ProductName?:string,
    ProductVersion?:string,
    Comments?:string,
}

interface ID_AND_NAME{
    id:number, 
    name:string
}


export {
    OBS_CONFIGS,
    OBS_PATH,
    PLUGIN_DATA,
    OBSProcessObject,
    IOBS_DLL_INFO,
    ID_AND_NAME,
    systemPlugins
}