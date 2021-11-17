import { app } from "electron";
import { obsConfig } from ".";
import { DownloadLink, PluginInfo } from "../../../static/typings";
import { systemPlugins } from "../../../static/typings/obs";
const path = require("path");
const fs = require("fs-extra");
const { createWriteStream } = require("fs");
const got = require("got");
const extract = require("extract-zip");
import sevenBin from '7zip-bin'
import { extractFull } from 'node-7z'
const pathTo7zip = sevenBin.path7za
const cp = require('child_process')

class HandlePlugin {
  pluginTem: string;
  converter: string;
  logger
  private pluginFileList: string[];
  constructor() {
    this.pluginFileList = [];
    // 初始化插件下载目录
    this.pluginTem = path.join(app.getPath("userData"), "/Temp");
    this.converter = path.join(this.pluginTem, "/converter");
    if (!fs.existsSync(this.pluginTem)) {
      fs.mkdirSync(this.pluginTem);
    }
  }

  setlogger = (logger)=>{
    this.logger = logger
  }


  // 从locale目录中去读取插件名字
  // 返回值是插件的名字列表，已经移除了系统插件
  // 在判断dll是否存在
  getLocalObsPluginLists(folder: string){
    let _output = []
    if(fs.existsSync(folder)){
      let _dirs = fs.readdirSync(folder)

      _dirs.forEach((item:any,index:any)=>{
        let fpath =path.join(folder,item)
        let stat = fs.statSync(fpath)
        if(stat.isDirectory() === true){
            // 不是系统插件
            if(systemPlugins.indexOf(item)==-1){
                const plugin_filename = path.join(obsConfig.obsPath.pluginLocale,`/64bit/${item}.dll`)
                // if(fs.existsSync(plugin_filename))
                try{
                  if(fs.statSync(plugin_filename).isFile()){
                    _output.push(item)
                  }
                }catch (err) {
                  this.logger.log("warn",`[读取插件列表] 发现无效插件,有data文件夹无dll ${item} | ${err.message}`);
                }
                
            }
        }
        if(stat.isFile() === true){
          this.logger.log("warn",`[读取插件列表] 发现文件 ${item}`);
        }
    })

    // 处理特殊插件motion-effect
    const motioneffect_1 = _output.indexOf("motion-filter")
    const motioneffect_2 = _output.indexOf("motion-transition")
    if(motioneffect_1!=-1 && motioneffect_2!=-1){
      _output.splice(_output.indexOf("motion-filter"),1)
      _output.splice(_output.indexOf("motion-transition"),1)
      // const array = ["motion-filter","motion-transition"]
      // _output.push(JSON.stringify(array))
      _output.push("motion-effect")
    }


    return {
      code:0,
      plugins:_output
    }

    }else{
      return {
        code: 1001,
        plugins: []
      }
    }
    
}

  // 第一次载入的时候回去读取一个最简的插件文件树
  getPluginSimpleFileListsWhenPluginFirstLoad(obsPath:string,pluginName:string){
    const fpath = path.join(obsPath,`/data/obs-plugins/${pluginName}`)
    const dllpaths = [path.join(obsPath,'/obs-plugins/32bit'),path.join(obsPath,'/obs-plugins/64bit')]
    // 输出数组,最小数据目录
    let _outs = []
    _outs.push(fpath)

    dllpaths.forEach((folder)=>{
      if(fs.existsSync(folder)){
        const files = fs.readdirSync(folder)
        files.forEach((file)=>{
          const curPath = path.join(folder,file)
          const basename = path.basename(curPath).split('.')[0]
          // const extname =path.extname(curPath)
          //找到最小匹配文件 
          if(fs.statSync(curPath).isFile() && pluginName == basename){
            _outs.push(curPath)
          }
        })
      }
    })

    return _outs
  }

  async downloadPlugin(downloadLink: DownloadLink) {
    return new Promise((resolve, reject) => {
      //simple way to download plugin
      //got.stream(downloadLink.Link).pipe(createWriteStream(path.join(this.pluginTem,downloadLink.Name)))
      try{
        // 读取下载流
        const downloadStream = got.stream(downloadLink.link);
        // 写入文件流
        const fileWriterStream = createWriteStream(
          path.join(this.pluginTem, downloadLink.name)
        );

        // 显示下载进度条
        // downloadStream.on('downloadProgress',({transferred,total,percent})=>{
        //     const percentage = Math.round(percent * 100)
        //     console.error(`progress: ${transferred}/${total} (${percentage}%)`);
        // }).on("error", (error) => {
        //     console.error(`Download failed: ${error.message}`);
        // });

        // 保存文件的事件监听
        fileWriterStream
          .on("error", (error) => {
            this.logger.log("error",`[下载插件] 不能写入文件 ${error.message}`);
            resolve(false);
          })
          .on("finish", () => {
            this.logger.log("info",`[下载插件] 下载完成 ${downloadLink.name}`);
            resolve(true);
          });
        downloadStream.pipe(fileWriterStream);
      }catch(err){
        this.logger.log("error",`[下载插件] 下载出错 ${err.message}`);
        resolve(false);
      }
      
    });
  }

  downloadPluginUseNativeJs() {
    var http = require("http");
    var download = function (url, dest, cb) {
      var file = fs.createWriteStream(dest);
      var request = http
        .get(url, function (response) {
          response.pipe(file);
          file.on("finish", function () {
            file.close(cb); // close() is async, call cb after close completes.
          });
        })
        .on("error", function (err) {
          // Handle errors
          fs.unlink(dest); // Delete the file async. (But we don't check the result)
          if (cb) cb(err.message);
        });
    };
  }

  // 用来解压7z格式的插件
  async Un7zPlugin(filename: string,targetfolder:string){
    return new Promise((resolve, reject) =>{
      const source = path.join(this.pluginTem, filename);
      // myStream is a Readable stream
    // this.logger.log("info",`[check 7z] ${app.getAppPath().replace('app.asar','app.asar.unpacked')}`);
    let path_7z 
    if(pathTo7zip.indexOf("asar")!=-1){
      path_7z = JSON.parse(JSON.stringify(pathTo7zip)).replace("asar","asar.unpacked")
      this.logger.log("info",`[解压7z格式插件] 转化7z路径${path_7z} `);
    }else{
      path_7z=pathTo7zip
    }
    const myStream = extractFull(source, targetfolder, {
        $bin: path_7z
      })
      // myStream.on('data', function (data) {
      //   doStuffWith(data) //? { status: 'extracted', file: 'extracted/file.txt" }
      // })
      
      // myStream.on('progress', function (progress) {
      //   doStuffWith(progress) //? { percent: 67, fileCount: 5, file: undefinded }
      // })
      myStream.on('error', (err) =>{
        this.logger.log("error",`[解压7z格式插件] 解压错误 ${filename}|${err.message}`);
          return resolve(false);
      })

      myStream.on('end',  ()=>{
          // end of the operation, get the number of folders involved in the operation
          this.logger.log("info",`[解压7z格式插件] 解压完毕 ${filename}`);
          return resolve(true);
      })
      
      
    })
    
  }

  // 用来安装zip格式的插件
  async UnzipPlugin(filename: string, targetfolder) {
    const source = path.join(this.pluginTem, filename);
    try {
      await extract(source, { dir: targetfolder });
      this.logger.log("info",`[解压插件] 解压完毕 ${filename}`);
      return Promise.resolve(true);
    } catch (err) {
      this.logger.log("info",`[解压插件] 解压失败 ${err}`);
      return Promise.resolve(false);
    }
  }

  // // 存储插件包含的文件列表
  // // filename为安装文件的名字
  // // data目录下面只存文件夹
  // // obs-plugins目录下面记录的是所有文件
  // async savePluginFileLists(filename: string) {
  //   // 去除后缀 $字符串尾部
  //   const _pluginfolder = filename.replace(/\.\w+$/, "");
  //   const _pluginfolder_fullpath = path.join(this.pluginTem, _pluginfolder);
  //   const source = path.join(this.pluginTem, filename);
  //   try {
  //     await extract(source, { dir: _pluginfolder_fullpath });
  //     this.logger.log("info",`[解压插件] 解压完毕 ${filename}`);
  //     this.logger.log("info",`[解压插件] 开始读取插件目录 ${_pluginfolder}`);
  //     const _dirs = fs.readdirSync(_pluginfolder_fullpath);
  //     _dirs.forEach((item: any, index: any) => {
  //         const fpath = path.join(_pluginfolder_fullpath, item);
  //         const stat = fs.statSync(fpath);
  //         if (stat.isDirectory()) {
  //           //   data只用存目录
  //             if (item == "data") {
  //               const pluginBasename = fs.readdirSync(path.join(fpath,'/obs-plugins/'))[0]
  //               const curPath = path.join(fpath, "/obs-plugins/",pluginBasename)
  //               const reactivePath = curPath.replace(path.join(_pluginfolder_fullpath),"")
  //               this.pluginFileList.push(path.join(obsConfig.obsPath.obsRoot,reactivePath));
  //             }
  //              else {
  //               //其他情况都读取文件树
  //               this.readFolderRecursive(_pluginfolder_fullpath,fpath);
  //             }
  //         } else {
  //             this.logger.log("warn",`[解压插件] 发现额外文件 ${item}`);
  //         }
  //         });
  //         this.logger.log("info",`[解压插件] 插件列表 ${this.pluginFileList}`);
  //     //移除文件夹   
  //     this.removeFolderRecursive(_pluginfolder_fullpath) 
  //     return Promise.resolve(this.pluginFileList);
  //   } catch (err) {
  //     this.logger.log("error",`[解压插件] 解压失败 ${err}`);
  //     return Promise.resolve(false);
  //   }
  // }


  async saveMotionEffectFileLists(folder:string) {
    // 去除后缀 $字符串尾部
    const _pluginfolder_fullpath = folder
    // 重置数组，否则重复书写
    this.pluginFileList = []
      const _dirs = fs.readdirSync(_pluginfolder_fullpath);
      _dirs.forEach((item: any, index: any) => {
          const fpath = path.join(_pluginfolder_fullpath, item);
          const stat = fs.statSync(fpath);
          if (stat.isDirectory()) {
            //   data只用存目录
            // 修改bug，不能只读一个文件夹，有的插件会有多个文件夹, 例如有的会给系统插件中添加文件
            // 逻辑 当前插件记录文件夹,其他文件夹获取文件名字
              if (item == "data") {
                const pluginBasenames = fs.readdirSync(path.join(fpath,'/obs-plugins/'))
                for(let pluginBasename of pluginBasenames){
                    const curPath = path.join(fpath, "/obs-plugins/",pluginBasename)
                    const reactivePath = curPath.replace(path.join(_pluginfolder_fullpath),"")
                    this.pluginFileList.push(path.join(obsConfig.obsPath.obsRoot,reactivePath));
                }
              }  else {
                //其他情况都读取文件树
                this.readFolderRecursive(_pluginfolder_fullpath,fpath);
              }
          } else {
            this.logger.log("warn",`[转换后读取文件列表] 发现外部文件 ${item}`);
          }
          });
          // console.log(this.pluginFileList);
      //移除文件夹   
      // this.removeFolderRecursive(_pluginfolder_fullpath) 
      return Promise.resolve(this.pluginFileList);
  }



  async saveConverterFileLists(folder:string,alias:string) {
    // 去除后缀 $字符串尾部
    const _pluginfolder_fullpath = folder
    // 重置数组，否则重复书写
    this.pluginFileList = []
    this.logger.log("info",`[转换后读取文件列表] 开始读取插件目录`);
      const _dirs = fs.readdirSync(_pluginfolder_fullpath);
      _dirs.forEach((item: any, index: any) => {
          const fpath = path.join(_pluginfolder_fullpath, item);
          const stat = fs.statSync(fpath);
          if (stat.isDirectory()) {
            //   data只用存目录
            // 修改bug，不能只读一个文件夹，有的插件会有多个文件夹, 例如有的会给系统插件中添加文件
            // 逻辑 当前插件记录文件夹,其他文件夹获取文件名字
              if (item == "data") {
                const pluginBasenames = fs.readdirSync(path.join(fpath,'/obs-plugins/'))
                for(let pluginBasename of pluginBasenames){
                  // 是本插件文件夹
                  if(pluginBasename == alias){
                    const curPath = path.join(fpath, "/obs-plugins/",pluginBasename)
                    const reactivePath = curPath.replace(path.join(_pluginfolder_fullpath),"")
                    this.pluginFileList.push(path.join(obsConfig.obsPath.obsRoot,reactivePath));
                  }else{
                    const pluginBase_path = path.join(fpath,`/obs-plugins/${pluginBasename}`)
                    const pluginBase_stat = fs.statSync(pluginBase_path);
                    if(pluginBase_stat.isDirectory()){
                      //其他情况都读取文件树
                      this.readFolderRecursive(folder,pluginBase_path,'locale');
                    }else{
                      // data文件夹下面不应该存在文件，所以如果是文件先不记录
                        this.logger.log("warn",`[转换后读取文件列表] 发现data目录下有外部文件 ${item}`);
                    }
                    
                  }
                }
              }  else {
                //其他情况都读取文件树
                this.readFolderRecursive(_pluginfolder_fullpath,fpath);
              }
          } else {
            this.logger.log("warn",`[转换后读取文件列表] 发现外部文件 ${item}`);
          }
          });
          // console.log(this.pluginFileList);
      //移除文件夹   
      // this.removeFolderRecursive(_pluginfolder_fullpath) 
      return Promise.resolve(this.pluginFileList);
    
  }



  async movePlunginFrompluginFolderToObs(realpath:string){
    try{
      await fs.copy(realpath,obsConfig.obsPath.obsRoot,
      {overwrite: true})
      // fs.emptyDirSync(realpath)
      // fs.rmdirSync(realpath);
      // fs.remove(realpath)
      // fs.remove()
      // fs.emptyDir(this.converter)
      this.logger.log("debug",`[转换后移动安装插件] 完成`);
      return Promise.resolve(true)
    }catch(err){
      this.logger.log("error",`[转换后移动安装插件] 错误${err}`);
      return Promise.resolve(false)
    }
  }

  // 保存插件信息接口
  savaPluginDataToConfig(pluginfo:PluginInfo,fileLists:string[],plugintype:string){
    // 保存插件数据
    const _localpluginlist = obsConfig._store.get("localPluginsList") || []
    _localpluginlist.push(pluginfo);
    obsConfig._store.set("localPluginsList", _localpluginlist);

    obsConfig._store.set(`plugins.${pluginfo.id}`, {
      id:pluginfo.id,
      name: pluginfo.name,
      version:pluginfo.version,
      author: pluginfo.author,
      pluginAlias: pluginfo.alias,
      pluginType: plugintype,
      fileLists: fileLists,
    });
  }

  // 运行zip安装脚本
  async runZipInstaller(filepath: string,pluginfo:PluginInfo){
    return new Promise(async(resolve, reject) => {
      const fileLists = await handlePlugin.saveConverterFileLists(filepath,pluginfo.alias);
      await handlePlugin.movePlunginFrompluginFolderToObs(filepath);
      const plugin_folder = path.join(obsConfig.obsPath.pluginFolder,pluginfo.alias);
      if (!handlePlugin.checkPluginFolderExists(plugin_folder)) {
        this.logger.log("warn",`[安装zip插件] 插件data目录不存在 ${pluginfo.alias}`);
        return resolve(false)
      } else{
        // 保存插件数据
        this.savaPluginDataToConfig(pluginfo,fileLists,"zip")
        return resolve(true);
      }
    })
    
  }


  // 运行exe安装脚本
  async runExeInstaller(filename: string,pluginfo:PluginInfo){
    return new Promise((resolve, reject) => {
      // const _pluginfolder = filename.replace(/\.\w+$/, "");
      // const _pluginfolder_fullpath = path.join(this.pluginTem, _pluginfolder);
      const source = path.join(filename);
              cp.exec(source,(error,stdout,stderr)=>{
                  if(error){
                      resolve(false)
                  }else {
                      const filelists =
                      handlePlugin.getPluginSimpleFileListsWhenPluginFirstLoad(
                        obsConfig.obsPath.obsRoot,
                        pluginfo.alias
                      );
                      // 保存插件数据
                      this.savaPluginDataToConfig(pluginfo,filelists,"exe")
                      resolve(true)
                  }
              })
    })
    
  }


  // 安装dll插件
  async runDllInstaller(filepath:string,pluginfo:PluginInfo){
    return new Promise(async(resolve, reject) =>{
      // 读取插件目录
      const fileLists = await this.saveConverterFileLists(filepath,pluginfo.alias)
      // 安装插件-就是移动文件
      await this.movePlunginFrompluginFolderToObs(filepath)
      // 判断文件夹是否存在
      const _real_pluginfolder = path.join(obsConfig.obsPath.pluginFolder,pluginfo.alias)
      if(!this.checkPluginFolderExists(_real_pluginfolder)){
        this.logger.log("warn",`[安装dll插件] 插件data目录不存在 ${pluginfo.alias}`);
        return resolve(false)
      }

      // 保存插件数据
      this.savaPluginDataToConfig(pluginfo,fileLists,"dll")
      return resolve(true);
    })
   
  }


  // 运行motion-effect装脚本
  async runSingleMotionInstaller(filepath: string,pluginfo:PluginInfo){
    return new Promise(async(resolve, reject) => {
      const fileLists = await handlePlugin.saveMotionEffectFileLists(filepath);
      await handlePlugin.movePlunginFrompluginFolderToObs(filepath);
      const plugin_folder1 = path.join(obsConfig.obsPath.pluginFolder,"motion-filter");
      const plugin_folder2 = path.join(obsConfig.obsPath.pluginFolder,"motion-transition");
      if (!handlePlugin.checkPluginFolderExists(plugin_folder1) || !handlePlugin.checkPluginFolderExists(plugin_folder2)) {
        this.logger.log("warn",`[安装motion-effect插件] 插件data目录不存在`);
        return resolve(false)
      } else{
        // 保存插件数据
        this.savaPluginDataToConfig(pluginfo,fileLists,"motion-effect")
        return resolve(true);
      }
    })
  }






    // 存储插件包含的文件列表
  // 所有文件都存
  // async savePluginFilelistsV2(filename: string) {
  //   // 去除后缀 $字符串尾部
  //   const _pluginfolder = filename.replace(/\.\w+$/, "");
  //   const _pluginfolder_fullpath = path.join(this.pluginTem, _pluginfolder);
  //   const source = path.join(this.pluginTem, filename);
  //   try {
  //     await extract(source, { dir: _pluginfolder_fullpath });
  //     console.log("[解压完毕]", filename);
  //     console.log("[开始读取插件目录]", _pluginfolder);
  //     const _dirs = fs.readdirSync(_pluginfolder_fullpath);
  //     _dirs.forEach((item: any, index: any) => {
  //       const fpath = path.join(_pluginfolder_fullpath, item);
  //       const stat = fs.statSync(fpath);
  //       if (stat.isDirectory()) {
  //         this.readFolderRecursive(_pluginfolder_fullpath,fpath);
  //       } else {
  //         console.log("plugin file external", item);
  //         //this.pluginFileList.push(fpath);
  //       }
  //     });
  //     console.log(this.pluginFileList);
  //       //移除文件夹  
  //     this.removeFolderRecursive(_pluginfolder_fullpath) 
  //     return Promise.resolve(this.pluginFileList);
  //   } catch (err) {
  //     console.log("[解压失败]", err);
  //     return Promise.reject();
  //   }
  // }

  //递归读取目录，并保存到this.pluginFileList这个数组中 
  // 这个folder传最终的绝对路径
  // 但之后需要把前面的temp目录替换为空
  private readFolderRecursive(pluginTempfolder:string,folder: string,exception?:string) {
    let files = [];
    if (fs.existsSync(folder)) {
      files = fs.readdirSync(folder);
      files.forEach((newfile, index) => {
        const curPath = path.join(folder, newfile);
        if (fs.statSync(curPath).isDirectory()) {
          if(newfile!=exception){
            this.readFolderRecursive(pluginTempfolder,curPath);
          }
        } else {
          //这里不能直接push curPath需,只用存data,obs-plugin这两个目录
          const reactivePath = curPath.replace(path.join(pluginTempfolder),"")
          this.pluginFileList.push(path.join(obsConfig.obsPath.obsRoot,reactivePath));
          // fs.unlinkSync(curPath);
        }
      });
      // fs.rmdirSync(folder);
    }
  }


  

  checkPluginFiles(pluginfilelist:string[]){
    if(pluginfilelist.length>0){
      pluginfilelist.forEach((item)=>{
        if(!fs.existsSync(item)){
          return false
        }
      })
      return true
    }
  }

  checkPluginFolderExists(pluginfolder:string){
    if(fs.existsSync(pluginfolder)){
      return true
    }else{
      return false
    }
  }



  //递归删除目录，用于卸载插件   
  private removeFolderRecursive(folder: string) {
    let files = [];
    if (fs.existsSync(folder)) {
      files = fs.readdirSync(folder);
      files.forEach((newfile, index) => {
        const curPath = path.join(folder, newfile);
        if (fs.statSync(curPath).isDirectory()) {
          this.removeFolderRecursive(curPath);
        } else {
            fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(folder);
    }
  }

//   用于删除临时目录中的插件安装文件
  removePluginsZipInTempFolder(filename:string){
    const _pluginZipPath = path.join(this.pluginTem, filename);
    if(fs.statSync(_pluginZipPath).isFile()) {
        // 删除文件
        fs.unlinkSync(_pluginZipPath);
    }else{
        console.log('remove temp found folder not file')
    }
  }

  removePlugin(filelists:string[]){
    try {
      filelists.forEach((item)=>{
        if(fs.statSync(item).isFile()){
            fs.unlinkSync(item)
        }else{
            this.removeFolderRecursive(item)
        }
    })
     return {code:0}
    }catch(err){
      this.logger.log("error",`[卸载插件] 错误${err.message}`);
      // console.log(err.code )
      if(err.code== "EBUSY"){
        return {
          code:2003,
          data: {},
          message:"files are occupied"
        }
      }else{
        return {
          code:2004,
          data: {},
          message:"not enough permission"
        }
      }
    }
    
  }



}

export const handlePlugin = new HandlePlugin();
