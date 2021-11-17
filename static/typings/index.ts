import {OBS_CONFIGS, PLUGIN_DATA, systemPlugins} from './obs'

enum PLATFORM{
    win32 = 'win32',
    win64 = 'win64',
    linux = 'linux',
    darwin = 'darwin'
}


interface CONFIG {
    obs : OBS_CONFIGS;
    plugins: {};
    localPlugins: [];
    systemPlugins: string[],
    name : string;
    version : string;
    author : string;
    homepage : string;
    keywords : string[];
    description : string;
    license : string;
}
const defaultConfig = {
    obs : {
        platform:"",
        version:""
    },
    plugins: {},
    localPluginsList: [],
    systemPlugins: systemPlugins,
    name : "starscape OBS",
    version : "0.1.0",
    author : "starscape",
    homepage : "",
    keywords : ["OBS","Plugin Manager"],
    description : "string",
    license : ""
}

export * from "./serverside"

export {
    PLATFORM,
    CONFIG,
    defaultConfig
}