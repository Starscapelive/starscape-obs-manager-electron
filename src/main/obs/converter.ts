import { app } from "electron";
import path from "path";
const fs = require("fs-extra");
import { handlePlugin } from "./handlePlugin";
import { CONVERTER_TYPE, DownloadLink, PluginInfo } from "../../../static/typings";

class Converter {
  _Temp: string;
  _filename: string;
  _ConverFolder: string;
  _realFolderPath:string;
  _downloadLink: DownloadLink;
  _pluginInfo:PluginInfo;
  _logger

  constructor(downloadLink: DownloadLink) {
    this._Temp = handlePlugin.pluginTem
    // this._ConverFolder = handlePlugin.converter;
    this._downloadLink = downloadLink;
    this._filename = downloadLink.name;
    if (!fs.existsSync(this._Temp)) {
      fs.mkdirSync(this._Temp);
    }
    // if (!fs.existsSync(this._ConverFolder)) {
    //   fs.mkdirSync(this._ConverFolder);
    // }
  }

  setlogger = (logger) => {
    this._logger = logger
  }

  setPluginInfo = (pluginInfo:PluginInfo)=>{
    this._pluginInfo = pluginInfo
    return pluginInfo;
  }

  async converterPlugin() {
    // if (!fs.existsSync(this._ConverFolder)) {
    //     fs.mkdirSync(this._ConverFolder);
    //   }
    if (this._downloadLink.type == CONVERTER_TYPE.exe_standard) {
      this._logger.log("debug",`[转化器]进入标准exe格式转化流程 ${this._downloadLink.name}`);
      return await this.c_exe_standard();
    } else if (this._downloadLink.type == CONVERTER_TYPE.zip_standard) {
      this._logger.log("debug",`[转化器]进入标准zip格式转化流程 ${this._downloadLink.name}`);
      return await this.c_zip_standard();
    } else if (this._downloadLink.type == CONVERTER_TYPE.zip_has_parent) {
      this._logger.log("debug",`[转化器]进入zip_has_parent格式转化流程 ${this._downloadLink.name}`);
      return await this.c_zip_hasparentsfolder();
    } else if (this._downloadLink.type == CONVERTER_TYPE.zip_muti_platform) {
      this._logger.log("debug",`[转化器]进入zip_muti_platform格式转化流程 ${this._downloadLink.name}`);
      return await this.c_zip_muti_platform();
    } else if (this._downloadLink.type == CONVERTER_TYPE.zip_only_pluginfolder) {
      this._logger.log("debug",`[转化器]进入zip_only_pluginfolder格式转化流程 ${this._downloadLink.name}`);
      return await this.c_zip_only_pluginfolder();
    } else if (this._downloadLink.type == CONVERTER_TYPE.dll_standard) {
      this._logger.log("debug",`[转化器]进入dll_standard格式转化流程 ${this._downloadLink.name}`);
      return await this.c_dll_standard();
    } else if (this._downloadLink.type == CONVERTER_TYPE.sevenZ_standard) {
      this._logger.log("debug",`[转化器]进入7z_standard格式转化流程 ${this._downloadLink.name}`);
      return await this.c_7z_standard();
    } else if (this._downloadLink.type == CONVERTER_TYPE.zip_single_gstream) {
      this._logger.log("debug",`[转化器]进入zip_single_gstream格式转化流程 ${this._downloadLink.name}`);
      return await this.c_zip_gstreamer();
    }else if (this._downloadLink.type == CONVERTER_TYPE.zip_single_motion_effect) {
      this._logger.log("debug",`[转化器]进入zip_single_motion_effect格式转化流程 ${this._downloadLink.name}`);
      return await this.c_zip_single_motion_effect();
    }   
    else {
      this._logger.log("warn",`[转化器]未知格式转化流程 ${this._downloadLink.toString()}`);
      return {
        file: "",
        type: "unkown",
      };
    }
  }

  async c_exe_standard() {
    return {
      file: path.join(this._Temp, this._filename),
      type: "exe",
    };
  }

  // 不解压在converter文件夹中, 解压到插件名字绑定的文件夹
  async c_zip_standard() {
    const plugin_folder = path.join(this._Temp, this._pluginInfo.alias)
    if (!fs.existsSync(plugin_folder)) {
      fs.mkdirSync(plugin_folder);
    }
    const unziped = await handlePlugin.UnzipPlugin(
      this._filename,
      plugin_folder
    );
    if (unziped) {
      return {
        file: plugin_folder,
        type: "zip",
      };
    } else {
      return {
        file: "",
        type: "unknown",
      };
    }
  }


  // obs shaderfilter  这个插件内部包含另外2个插件
  // bongobs cat plugin
  // obs-voicemeeter
  // InstantReplay
  // scrab
  // stinger-transition
  // rematrix-filter plugin
  // TeamSpeak 3 Studio Plugin
  async c_zip_hasparentsfolder() {
      const plugin_folder = path.join(this._Temp, this._pluginInfo.alias)
      if (!fs.existsSync(plugin_folder)) {
        fs.mkdirSync(plugin_folder);
      }
      const unziped = await handlePlugin.UnzipPlugin(
        this._filename,
        plugin_folder
      );
      if (unziped) {
          this.readFolderRecursiveUntilFindDataFolder(plugin_folder)
          this._logger.log("info",`[转化器]包含顶层目录 ${this._realFolderPath}`);
          return {
            file: this._realFolderPath,
            type: "zip",
          };
      } else {
        return {
          file: "",
          type: "unknown",
        };
      } 
  }

  // OBS ShaderFilter Plus
  async c_dll_standard(){
    try{
      const plugin_folder = path.join(this._Temp, this._pluginInfo.alias)
      if (!fs.existsSync(plugin_folder)) {
        fs.mkdirSync(plugin_folder);
      }
      const src_file = path.join(this._Temp,this._filename)
      const dest_file = path.join(plugin_folder,`/obs-plugins/64bit/${this._pluginInfo.alias}.dll`)
      console.log(src_file,dest_file)
      // 没有就创建
      fs.ensureDirSync(path.join(plugin_folder,"/data"))
      fs.ensureDirSync(path.join(plugin_folder,`/data/obs-plugins/${this._pluginInfo.alias}`))
      fs.ensureDirSync(path.join(plugin_folder,"/obs-plugins"))
      fs.ensureDirSync(path.join(plugin_folder,"/obs-plugins/32bit"))
      fs.ensureDirSync(path.join(plugin_folder,"/obs-plugins/64bit"))

      await fs.copy(src_file,dest_file,
      {overwrite: true})

      return {
        file: plugin_folder,
        type:"dll"
      }
    }catch(err){
      console.log(err)
      return {
        file:"",
        type:"unknown"
      }
    }
    
  }


  // SRBeep
  // advanced-scene-switcher
  async c_zip_muti_platform(){
      const plugin_folder = path.join(this._Temp, this._pluginInfo.alias)
      if (!fs.existsSync(plugin_folder)) {
        fs.mkdirSync(plugin_folder);
      }
      const unziped = await handlePlugin.UnzipPlugin(
        this._filename,
        plugin_folder
      );
    if (unziped) {
      this.readFolderRecursiveUntilFindFolder(plugin_folder,["windows","Windows","WINDOWS"])
      this._logger.log("debug",`[转化器]多平台版本 获取windows路径${this._realFolderPath}`);
      this.readFolderRecursiveUntilFindDataFolder(this._realFolderPath)
      // this._logger.log("debug",`[转化器]多平台版本 获取插件路径${this._realFolderPath}`);
      return {
        file: this._realFolderPath,
        type: "zip",
      };
    } else {
      return {
        file: "",
        type: "unknown",
      };
    }
  }

  // OBSInfoWriter
  // Closed_Captions_Plugin
  async c_zip_only_pluginfolder(){
      this._logger.log("debug",`[转化器] zip_only_pluginfolder版本${this._filename}`);
      const src_folder = path.join(this._Temp,`${this._pluginInfo.alias}_c`)
      fs.ensureDirSync(src_folder)
      // const dest_file64 = path.join(this._ConverFolder,`/obs-plugins/64bit/${this._pluginInfo.alias}.dll`)
      const _converFolder = path.join(this._Temp,this._pluginInfo.alias)
      const plugin_folder32 = path.join(_converFolder,"/obs-plugins/32bit")
      const plugin_folder64 = path.join(_converFolder,"/obs-plugins/64bit")
      // 没有就创建
      fs.ensureDirSync(path.join(_converFolder,"/data"))
      fs.ensureDirSync(path.join(_converFolder,`/data/obs-plugins/${this._pluginInfo.alias}`))
      fs.ensureDirSync(path.join(_converFolder,"/obs-plugins"))
      fs.ensureDirSync(plugin_folder32)
      fs.ensureDirSync(plugin_folder64)

    const unziped = await handlePlugin.UnzipPlugin(
      this._filename,
      src_folder
    );
    if (unziped) {
      this.readFolderRecursiveUntilFindFolder(src_folder,"32bit")
      const dll_32bit_path = this._realFolderPath
      this.readFolderRecursiveUntilFindFolder(src_folder,"64bit")
      const dll_64bit_path = this._realFolderPath
      if(dll_32bit_path){
        this._logger.log("debug",`[转化器] zip_only_pluginfolder版本复制32bit插件dll ${this._filename}`);
        fs.copySync(dll_32bit_path,plugin_folder32,{overwrite: true})
      }

      if(dll_64bit_path){
        this._logger.log("debug",`[转化器] zip_only_pluginfolder版本复制32bit插件dll ${this._filename}`);
        fs.copySync(dll_64bit_path,plugin_folder64,{overwrite: true})
      }

      // 没有32bit 和 64bit目录
      if(!dll_32bit_path && !dll_64bit_path ){
        this._logger.log("error",`[转化器] zip_only_pluginfolder版本没有对应的dll ${this._filename}`);
        return {
          file: "",
          type: "unknown",
        };
      }
      fs.removeSync(src_folder)
      // fs.emptyDirSync(src_folder)
      // fs.rmdirSync(src_folder)
      return {
        file: _converFolder,
        type: "zip",
      };
    } else {
      this._logger.log("debug",`[转化器] zip_only_pluginfolder版本 解压失败${this._filename}`);
      return {
        file: "",
        type: "unknown",
      };
    }
  }


  //tuna 
  async c_7z_standard(){

    const plugin_folder = path.join(this._Temp, this._pluginInfo.alias)
      console.log('[plugin_folder]',plugin_folder)
      if (!fs.existsSync(plugin_folder)) {
        fs.mkdirSync(plugin_folder);
      }
      const unziped = await handlePlugin.Un7zPlugin(
        this._filename,
        plugin_folder
      );
    // @ts-ignore
    if (unziped) {
      return {
        file: plugin_folder,
        type: "zip",
      };
    } else {
      return {
        file: "",
        type: "unknown",
      };
    }
  }


  //gstreamer
  async c_zip_gstreamer(){
    try{
      // 创建文件夹到 /obs-gstreamer目录
      const plugin_folder = path.join(this._Temp, this._pluginInfo.alias)
      if (!fs.existsSync(plugin_folder)) {
        fs.mkdirSync(plugin_folder);
      }
      // 没有就创建
      fs.ensureDirSync(path.join(plugin_folder,"/data"))
      fs.ensureDirSync(path.join(plugin_folder,`/data/obs-plugins/${this._pluginInfo.alias}`))
      fs.ensureDirSync(path.join(plugin_folder,"/obs-plugins"))
      fs.ensureDirSync(path.join(plugin_folder,"/obs-plugins/32bit"))
      fs.ensureDirSync(path.join(plugin_folder,"/obs-plugins/64bit"))

      // 解压到/gs目录
      const unziped = await handlePlugin.UnzipPlugin(
        this._filename,
        path.join(this._Temp,"/gs")
      );
      if (unziped) {
        // 拷贝文件
        const src_file = path.join(this._Temp,`/gs/windows/${this._pluginInfo.alias}.dll`)
        const dest_file = path.join(plugin_folder,`/obs-plugins/64bit/${this._pluginInfo.alias}.dll`)
        await fs.copy(src_file,dest_file,{overwrite: true})
        fs.removeSync(path.join(this._Temp,"/gs"))
        return {
          file: plugin_folder,
          type: "zip",
        };
      } else {
        return {
          file: "",
          type: "unknown",
        };
      }
    }catch(err){
      console.log(err)
      return {
        file:"",
        type:"unknown"
      }
    }
  }


  // motion-effect
  async c_zip_single_motion_effect(){
    const plugin_folder = path.join(this._Temp, "motion-effect")
    if (!fs.existsSync(plugin_folder)) {
      fs.mkdirSync(plugin_folder);
    }
    const unziped = await handlePlugin.UnzipPlugin(
      this._filename,
      plugin_folder
    );
    if (unziped) {
      return {
        file: plugin_folder,
        type: "single-motion-effect",
      };
    } else {
      return {
        file: "",
        type: "unknown",
      };
    }
  }

   // 如果有顶层目录,就一直往下读，直到读出data|obs-plugins文件夹
  readFolderRecursiveUntilFindDataFolder(folder: string){
    let folders = fs.readdirSync(folder)
    this._realFolderPath = ""
    for(let item of folders){
      const curPath = path.join(folder,item)
      if(fs.statSync(curPath).isDirectory()){
        if(item == "obs-plugins" || item == "data"){
          this._realFolderPath = folder;
        }else{
          this.readFolderRecursiveUntilFindDataFolder(curPath)
        }
      }
    }
  }

  // 递归检查文件夹中是否有，目标数组中的目录
  //  target 可以是数组也可以是一个字符串
  //  [windows,win32,win64,Windows,WINDOWS]
  readFolderRecursiveUntilFindFolder(filefolder:string,targetfoldernames:string|string[]){
    const folders = fs.readdirSync(filefolder)
    this._realFolderPath = ""
    for(let item of folders){
      const curPath = path.join(filefolder,item)
      if(fs.statSync(curPath).isDirectory()){
        if(targetfoldernames instanceof Array){
          if(targetfoldernames.indexOf(item) != -1){
            this._realFolderPath = curPath;
            return curPath
          }else{
            this.readFolderRecursiveUntilFindFolder(curPath,targetfoldernames)
          }
        }else{
          console.log('[item]',item, "[target]",targetfoldernames)
          if(item == targetfoldernames){
            this._realFolderPath = curPath;
            return curPath
          }else{
            this.readFolderRecursiveUntilFindFolder(curPath,targetfoldernames)
          }
        }
      }
    }
    return false
  }



}

export { Converter };
