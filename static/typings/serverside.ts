interface DownloadLink {
    name: string;
    size: number;
    link: string;
    type: CONVERTER_TYPE;
    // converterType?: string;
}

interface PluginInfo{
    id: string;
    name: string;
    author:string;
    version: string;
    alias: string;
}


enum CONVERTER_TYPE {
    NULL=0,
    zip_standard,
    exe_standard,
    zip_has_parent,
    zip_muti_platform,
    zip_only_pluginfolder,
    dll_standard,
    sevenZ_standard,
    zip_single_gstream,
    zip_single_motion_effect,

}



export {
    DownloadLink,
    CONVERTER_TYPE,
    PluginInfo
}
