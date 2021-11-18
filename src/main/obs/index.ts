import axios from "axios";
import { BrowserWindow, ipcMain, app, dialog, screen, shell } from "electron";
import {
  CONFIG,
  CONVERTER_TYPE,
  defaultConfig,
  DownloadLink,
} from "../../../static/typings";
import {
  IOBS_DLL_INFO,
  OBS_PATH,
  PLUGIN_DATA,
} from "../../../static/typings/obs";
import { Converter } from "./converter";
import { FileVersion } from "./dllReader";
import { handlePlugin } from "./handlePlugin";
import { obsProcess } from "./obsProcess";

const path = require("path");
const fs = require("fs-extra");
const Store = require("electron-store");
const cp = require("child_process");
import { v4 as uuidv4 } from "uuid";

process.env.ORIGIN_PATH = 'your-domain-url'; 
process.env.API_URL =  "your-api-url";
process.env.PORTABLE = "false";



const _loggerPath = process.env.PORTABLE == "true" ? path.join(app.getAppPath(), "../../log.txt") : path.join(app.getPath("userData"), "/log.txt")



const _axios = axios.create({
  baseURL: process.env.API_URL,
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 6.3; Win64; x64; rv:56.0)",
  },
});

import { createLogger, format, transports } from "winston";
const { label, timestamp, combine, printf } = format;

// 时间 | 日志级别 | 应用名字 | 版本 | 唯一id | 用户标志 | 日志记录器名字 | 软件状态 | 消息
// 时间 | 日志级别 | 应用名字 | 版本 | 唯一id | 用户标志 | 日志记录器名字 | 软件状态 | 消息
const myFormat = printf(({ level, message, label, timestamp }) => {
  const name = app.getName();
  const version = app.getVersion();
  const trace_id = uuidv4();
  const user_id = "test-user";
  // const app_status = label
  const logger_name = "winston.kira";

  return `${timestamp} | ${level} | ${name} | V${version} | ${trace_id} | ${user_id} | ${logger_name} | ${message}`;
});



class ObsConfig {
  _config: CONFIG;
  obsPath: OBS_PATH;
  _window: BrowserWindow;
  _store;
  _serverstore;
  _logger;
  constructor() {
    this._store = new Store();
    this._serverstore = new Store({
      name: "pluginData",
    });

    this.obsPath = {
      obsRoot: "",
      pluginFolder: "",
      pluginLocale: "",
    };
    this.setLogger();
    this.initObsConfig();
    // this.setDefaultProtocol();
    this.registerIpcFunctions();
    // this.saveAllPluginsDataFormServer();
    // this.checkObsRunning()

  
  }


  checkConnection(cb_success:Function,cb_error:Function) {

    _axios.post("obs/searchPlugin", {
      obsVersion: "",
      platform: 0,
      name: "",
      sortBy: 0,
      offset: 0,
      limit: 20,
    })
    .then(function (response) {
      console.log("info", `[检查连接] 连接成功`)
      cb_success()
      // this._logger.log("info", `[检查连接] 连接成功`);
    })
    .catch(function (error) {
      console.log("info", `[检查连接] 连接失败 ${error.message}`)
      // this._logger.log("info", `[检查连接] 连接失败 ${error.message}`);
      cb_error()
    });

    

  }

  setWindow(window: BrowserWindow) {
    this._window = window;
  }

  setLogger() {
    this._logger = createLogger({
      level: "debug",
      format: combine(
        // label({
        //   label:"init"
        // }),
        timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        // format.colorize(),
        myFormat
      ),
      transports: [
        new transports.Console({
          level: "debug",
          format: combine(
            format.colorize({ all: true }),
            myFormat
            // format.simple()
          ),
        }),
        new transports.File({
          level: "info",
          format: combine(
            myFormat
            // format.json()
          ),
          filename: _loggerPath,
        }),
      ],
    });
    handlePlugin.setlogger(this._logger);

    // const console = new transports.Console();

    // this._logger.add(console)
  }


  private async initObsConfig() {
    // 初始化配置文件
    if (!this._store.has("name")) {
      this._store.set(defaultConfig);
      this._logger.log("info", "[初始化]create config file");
    }

    // 写入软件基本信息,版本变化则更新
    if (this._store.get("version") != app.getVersion()) {
      this._store.set("name", app.getName());
      this._store.set("version", app.getVersion());
      this._logger.log(
        "info",
        "[初始化]app version changed, refresh new version"
      );
    }

    // 从配置文件中读取obsPath
    if (
      this._store.has("obs.path.obsRoot") &&
      this._store.get("obs.path.obsRoot").indexOf("obs-studio") != -1
    ) {
      this._logger.log("debug", "[初始化]obs-studio目录有效");
      this.obsPath = this._store.get("obs.path");
    } else {
      // 从注册表中读取obsPath
      this._logger.log("warn", "[初始化]obs-studio目录无效或未设置");
      const haspath = await this.getObsRootFromRegedit();
      if (!haspath) {
        this._logger.log("error", "[初始化]obs-studio未安装");

        // this._window.webContents.send("obsSystemErrorMsg", {
        //   code: 1000,
        //   type: "ObsPath",
        //   message: "OBS Not Installed",
        // });

        return {
          code: 1001,
          data: [],
          message: "OBS Not Installed",
        };
      }
    }

    if (fs.existsSync(this._store.get("obs.path.obsRoot"))) {
      const _path_exe = path.join(
        this._store.get("obs.path.obsRoot"),
        "/bin/64bit/obs64.exe"
      );
      // 检查当前目录中是否存在该文件。
      fs.access(_path_exe, fs.F_OK, (err) => {
        // this._window.webContents.send("obsSystemErrorMsg", {
        //   code: 1001,
        //   type: "obs path",
        //   message: "OBS Not Installed",
        // });
        if(err){
          this._logger.log("warn", "[初始化]obs-studio目录无效或未设置");
          return {
            code: 1001,
            data: [],
            message: "OBS Not Installed",
          };
        }        
      });

      const obsFileInfo: IOBS_DLL_INFO = FileVersion().getFileVersionInfo(
        path.join(this._store.get("obs.path.obsRoot"), "/bin/64bit/obs64.exe")
      );
      this._logger.log("debug", `[初始化]obs版本信息${obsFileInfo}`);
      try {
        this._store.set("obs.version", obsFileInfo.FileVersion || "");
        this._store.set("obs.platform", process.platform);
      } catch (err) {}
    }
  }

  getObsPath(): OBS_PATH {
    this._logger.log("debug", `[获取目录]${this._store.get("obs.path")}`);
    return this._store.get("obs.path");
  }

  setObsPath(_path: string) {
    // this._logger.debug(_path);
    // 目录中需要存在
    if (!fs.existsSync(_path)) {
      this._logger.log("error", "[设置目录]设置失败,目录无效");
      return false;
    }

    this.obsPath.obsRoot = _path;
    this.obsPath.pluginFolder = path.join(_path, "data/obs-plugins");
    this.obsPath.pluginLocale = path.join(_path, "obs-plugins");
    this._store.set("obs.path", this.obsPath);
    this._logger.log("info", `[设置目录]设置成功：${_path}`);
    return true;
  }

  getObsRootFromRegedit() {
    return new Promise((resolve, reject) => {
      cp.exec(
        'REG QUERY "HKLM\\SOFTWARE\\OBS Studio"',
        (error, stdout, stderr) => {
          // this._logger.debug(stdout);
          const _path = stdout.split("REG_SZ").pop().trim();
          this._logger.log("debug", `[读取注册表]找到obs目录：${_path}`);
          if (fs.existsSync(_path)) {
            this.setObsPath(_path);
            resolve(true);
          } else {
            resolve(false);
          }
        }
      );
    });
  }

  async saveAllPluginsDataFormServer() {
    try {
      const res = await _axios.post("obs/searchPlugin ", {
        obsVersion: "",
        platform: 0,
        name: "",
        sortBy: 0,
        offset: 0,
        limit: 200,
      });
      this._serverstore.set("plugins", res.data);
    } catch (err) {
      this._logger.log("error", `[读取插件信息]读取错误：${err}`);
    }
  }

  registerIpcFunctions() {
    ipcMain.handle("GET_APP_VERSION", async (event, params) => {
      return new Promise(async (resolve, reject) => {
        resolve(app.getVersion() || "");
      });
    });

    ipcMain.handle("OBS_PATH_GET", async (event, params) => {
      return new Promise(async (resolve, reject) => {
        try {
          if (params) {
            params = JSON.parse(params);
          }
          const _obspath = this.getObsPath();
          const isInstalled = await obsProcess.checkObsInstalled(
            _obspath.obsRoot
          );
          if (!isInstalled) {
            //目录无效
            this._logger.log("error", `[读取obs目录] OBS path invalid`);
            this._window.webContents.send("obsSystemErrorMsg", {
              code: 1001,
              type: "obs path",
              message: "OBS path invalid, Please check the path",
            });

            resolve({
              code: 1001,
              data: {},
              message: "OBS path invalid, Please check the path",
            });
          }
          resolve({
            code: 0,
            data: _obspath,
            message: "",
          });
        } catch (err) {
          resolve({
            code: 1001,
            data: {},
            message: "OBS path invalid, Please check the path",
          });
        }
      });
    });

    ipcMain.handle("OBS_PATH_RESET", async (event, params) => {
      return new Promise(async (resolve, reject) => {
        if (params) {
          params = JSON.parse(params);
        }
        //判断目录是否有效
        if (await this.getObsRootFromRegedit()) {
          this._logger.log(
            "info",
            `[重置obs目录]设置成功：${this.obsPath.obsRoot}`
          );
          resolve({
            code: 0,
            data: this.obsPath,
            message: "",
          });
        } else {
          //目录无效
          this._logger.log("error", `[重置obs目录] OBS path invalid`);
          this._window.webContents.send("obsSystemErrorMsg", {
            code: 1000,
            type: "obs path",
            message: "OBS path invalid, Please check the path",
          });

          resolve({
            code: 1000,
            data: {},
            message: "obsPath invalid, Please check the path",
          });
        }
      });
    });

    ipcMain.handle("OBS_PATH_MODIFY", async (event) => {
      return new Promise(async (resolve, reject) => {
        dialog
          .showOpenDialog(this._window, {
            title:
              "Please Set OBS's Root Path, Such as C:/Program Files/obs-studio",
            // filters:[{name:'obs-studio',extensions:['*']}],
            defaultPath: this.obsPath.obsRoot,
            properties: ["openDirectory"],
          })
          .then(async (result) => {
            //  没有点取消
            if (!result.canceled) {
              //判断目录是否有效

              const isInstalled = await obsProcess.checkObsInstalled(
                result.filePaths[0]
              );
              if (isInstalled) {
                this.setObsPath(result.filePaths[0]);
                this._logger.log(
                  "info",
                  `[设置obs目录] 设置成功：${this.obsPath.obsRoot}`
                );
                resolve({
                  code: 0,
                  data: this.obsPath,
                  message: "",
                });
              } else {
                this._logger.log("error", `[设置obs目录] OBS path invalid`);
                resolve({
                  code: 1001,
                  data: {},
                  message: "OBS Path invalid, Please check the path",
                });
              }
            }
          })
          .catch((err) => {
            //目录无效
            this._logger.log("error", `[设置obs目录] OBS path invalid`);
            // this._window.webContents.send("obsSystemErrorMsg", {
            //   code: 1001,
            //   type: "obs path",
            //   message: "OBS path invalid, Please check the path",
            // });

            this._logger.debug("[修改失败]", err);
            resolve({
              code: 1001,
              data: {},
              message: "OBS Path invalid, Please check the path",
            });
          });
      });
    });

    // ipcMain.handle("OBS_PATH_OPEN", async (event, params) => {
    //     return new Promise(async (resolve, reject) => {
    //         //判断目录是否有效
    //         if() {
    //           resolve({
    //             code: 0,
    //             data: this.obsPath,
    //             message: "",
    //           });
    //         }
    //       });
    // });

    ipcMain.handle("OBS_CHECK_RUNNING", async (event, params) => {
      return new Promise(async (resolve, reject) => {
        if (params) {
          params = JSON.parse(params);
        }
        const obsrunstatus = await obsProcess.checkObsRunning();
        this._logger.log("warn", `[obs运行状态] ${obsrunstatus.running}`);
        resolve(obsrunstatus.running);
      });
    });

    ipcMain.handle("OBS_OPEN", async (event, params) => {
      return new Promise(async (resolve, reject) => {
        if (params) {
          params = JSON.parse(params);
        }
        const isOpend = await obsProcess.openObsProcess(this.obsPath.obsRoot);
        this._logger.log("info", `[打开obs] ${isOpend}`);
        return resolve({
          code: 0,
          data: { isOpend },
          message: "",
        });
      });
    });
    ipcMain.handle("OBS_CLOSE", async (event, params) => {
      return new Promise(async (resolve, reject) => {
        if (params) {
          params = JSON.parse(params);
        }
        const obsrunstatus = await obsProcess.checkObsRunning();
        if (obsrunstatus.running) {
          const isClosed = await obsProcess.closeObsProcess(obsrunstatus.pid);
          this._logger.log("info", `[关闭obs] ${isClosed}`);
          return resolve({
            code: 0,
            data: { isClosed },
            message: "",
          });
        } else {
          this._logger.log("info", `[关闭obs] ${true}`);
          return resolve({
            code: 0,
            data: { isClosed: true },
            message: "",
          });
        }
      });
    });

    ipcMain.handle("OBS_PLUGIN_GET", async (event, params) => {
      return new Promise(async (resolve, reject) => {
        if (params) {
          params = JSON.parse(params);
        }

        const isInstalled = await obsProcess.checkObsInstalled(
          this.obsPath.obsRoot
        );
        if (!isInstalled) {
          // this._window.webContents.send("obsSystemErrorMsg", {
          //   code: 1001,
          //   data: [],
          //   message: "OBS Not Installed Or Set Obs Folder Manually",
          // });
          // return resolve({
          //   code: 1001,
          //   data: [],
          //   message: "OBS Not Installed Or Set Obs Folder Manually",
          // });
          return resolve({
            code: 0,
            data: [],
            message: "",
          });
        }
        // if (!this.obsPath.obsRoot) {

        // }

        // localpluginlist数据
        let _outs = [];
        // 存id和别名
        let _idAndname = {};
        // 返回值
        let _replys = [];
        // 获取目录中的插件只有插件名字 构成的数组
        // this._logger.debug("plugin folder", this.obsPath.pluginFolder);
        const localpluginlists = handlePlugin.getLocalObsPluginLists(
          this.obsPath.pluginFolder
        );

        this._logger.log(
          "debug",
          `[获取本地插件] 检测到本地插件列表${localpluginlists.plugins}`
        );
        // if (localpluginlists.code != 0) {
        //   this._logger.log(
        //     "error",
        //     `[获取本地插件] 插件路径无效obs path invalid`
        //   );
        //   this._window.webContents.send("obsSystemErrorMsg", {
        //     code: 1001,
        //     type: "obsPath",
        //     message: "obs path invalid",
        //   });
        //   return resolve({
        //     code: 1001,
        //     data: [],
        //     message: "obs path invalid",
        //   });
        // }
        // 获取配置文件中的插件数组
        // const _jsonplugins = this._store.get("localPluginsList")

        // 整体获取所有的插件的id和name
        const url = "obs/getMyPluginList";

        // 创建一个查询id和plunginalias的对象
        try {
          const _res = await _axios.post(url, {
            names: localpluginlists.plugins,
            // names: ["spectralizer", "obs-ndi"],
          });

          // this._logger.debug("[res data]", _res.data.data.items);
          _res.data.data.items.forEach((item) => {
            if (item.pluginAlias) {
              _idAndname[item.pluginAlias] = item;
            }
          });
        } catch (err) {
          // 报错
          this._logger.log("error", `[获取本地插件] 网络错误${err}`);
          this._window.webContents.send("obsSystemErrorMsg", {
            code: 2000,
            type: "axios",
            message: "network no reply",
          });
          return resolve({
            code: 2000,
            data: [],
            message: "network no reply",
          });
        }

        // this._logger.debug("[_idAndname]", _idAndname);

        // 直接通过对象来确定json中是否有改插件的数据
        // 如果有数据就读取，没有就创建
        for (let pluginname of localpluginlists.plugins) {
          if (pluginname in _idAndname) {
            this._logger.log("debug", `[获取本地插件] 发现插件:${pluginname}`);
            const _plugin_id = _idAndname[pluginname].id;
            // 需要用深拷贝，否则会修改原来的对象
            const _reply = JSON.parse(JSON.stringify(_idAndname[pluginname]));

            // 读取
            if (this._store.has(`plugins.${_plugin_id}`)) {
              _outs.push({
                id: this._store.get(`plugins.${_plugin_id}.id`),
                name: this._store.get(`plugins.${_plugin_id}.name`),
                pluginAlias: this._store.get(
                  `plugins.${_plugin_id}.pluginAlias`
                ),
                version: this._store.get(`plugins.${_plugin_id}.version`),
              });
              _reply.version = this._store.get(`plugins.${_plugin_id}.version`);
              // 版本不一致
              if (
                _reply.version == "" ||
                _idAndname[pluginname].version != _reply.version
              ) {
                this._logger.log(
                  "debug",
                  `[获取本地插件] config中有插件信息,需要升级`
                );
                _reply.needUpdate = true;
              } else {
                this._logger.log(
                  "debug",
                  `[获取本地插件] config中有插件信息,不需要升级`
                );
                _reply.needUpdate = false;
              }
            } else {
              // 创建
              const filelists =
                handlePlugin.getPluginSimpleFileListsWhenPluginFirstLoad(
                  this.obsPath.obsRoot,
                  pluginname
                );
              this._store.set(`plugins.${_plugin_id}`, {
                id: _idAndname[pluginname].id,
                name: _idAndname[pluginname].name,
                pluginAlias: pluginname,
                version: "",
                author: _idAndname[pluginname].author,
                pluginType: "",
                fileLists: filelists,
                script: "",
              });
              _outs.push({
                id: _idAndname[pluginname].id, //通过 _idandname查询出id
                name: _idAndname[pluginname].name,
                pluginAlias: _idAndname[pluginname].pluginAlias,
                version: "",
              });
              _reply.version = "";
              _reply.needUpdate = true;
              this._logger.log(
                "debug",
                `[获取本地插件] config中没有插件信息,需要升级`
              );
            }
            _replys.push(_reply);
          } else {
            // 报错
            this._logger.log(
              "warn",
              `[获取本地插件] 发现未知插件：${pluginname}`
            );

            // this._window.webContents.send("obsSystemErrorMsg", {
            //   code: 2007,
            //   type: "plugin",
            //   message: "found unknown plugin:" + pluginname,
            // });
          }
        }
        //暂时不用这种方法

        // 双重循环,获取已经安装的插件的数据
        // 如果插件在json文件中可以找到，说明已经存进去了，就直接读取
        // 如果找不到，就说明是第一次读取这个插件，而不是通过管家安装的，
        // 那么就需要把这个插件的数据添加到json文件中，同时version就设置为空，前端会提示需要更新
        // forEach函数无法中断或者跳出，所以改成for of
        // outer:
        // for(let pluginname of localpluginlists){
        //     inner:
        //     for(let item of _jsonplugins){
        //         if(item.name === pluginname){
        //                 _outs.push({
        //                         id: item.id,
        //                         name: item.name,
        //                         version: item.version
        //                     })
        //                     this._logger.debug('found plugin json file')
        //                     continue outer
        //         }
        //     }
        //     _outs.push({
        //         id:_idAndname[pluginname].id,  //通过 _idandname查询出id
        //         name:pluginname,
        //         version:""
        //     })
        //     this._logger.debug('generate new json file')
        // }

        // 保存列表
        this._store.set("localPluginsList", _outs);
        resolve({
          code: 0,
          data: _replys,
          message: "",
        });
      });
    });

    ipcMain.handle("OBS_PLUGIN_INSTALL", async (event, params) => {
      return new Promise(async (resolve, reject) => {
        const isInstalled = await obsProcess.checkObsInstalled(
          this.obsPath.obsRoot
        );
        if (!isInstalled) {
          this._window.webContents.send("obsSystemErrorMsg", {
            code: 1001,
            type: "obsPath",
            message: "OBS Not Installed Or Set Obs Folder Manually",
          });
          return resolve({
            code: 1001,
            data: [],
            message: "OBS Not Installed Or Set Obs Folder Manually",
          });
        }

        if (params) {
          params = JSON.parse(params);
        }

        const { id, downloadLink } = params;

        // this._logger.debug(id,version,downloadLink)
        let realplugin: DownloadLink;
        for (const downloadlist of downloadLink) {
          if (downloadlist.type != CONVERTER_TYPE.NULL) {
            realplugin = downloadlist;
          }
        }

        if (downloadLink.length == 0 || realplugin == undefined) {
          this._logger.log("error", `[安装或升级插件] 下载链接无效`);
          this._window.webContents.send("obsSystemErrorMsg", {
            code: 2005,
            type: "plugin",
            message: "download link invalid",
          });
          return resolve({
            code: 2005,
            data: {
              id,
              version: "",
            },
            message: "download link invalid",
          });
        }

        this._logger.info(realplugin)
        // 获取插件详情
        const url = "obs/getMyPluginList";
        try {
          // 获取服务端插件数据
          const _res_plugin = await _axios.post(url, { ids: [id] });
          const name = _res_plugin.data.data.items[0].name || "";
          const author = _res_plugin.data.data.items[0].author || "";
          const alias = _res_plugin.data.data.items[0].pluginAlias || "";
          const version = _res_plugin.data.data.items[0].version || "";
          // 下载插件
          const downloadFinish = await handlePlugin.downloadPlugin(realplugin);
          if (!downloadFinish) {
            this._logger.log("error", `[安装或升级插件] 下载失败，网络错误`);
            this._window.webContents.send("obsSystemErrorMsg", {
              code: 2000,
              type: "axios",
              message: "network error",
            });
            return resolve({
              code: 2000,
              data: {
                id,
                version,
              },
              message: "network error",
            });
          }
          // 手动设置按照包类型，用于调试
          // realplugin.type = CONVERTER_TYPE.zip_single_motion_effect;
          // 进行转化,返回文件目录和类型定义
          const converter = new Converter(realplugin);
          // 设置logger
          converter.setlogger(this._logger);
          // 设置插件基本信息
          const _pluginInfo = converter.setPluginInfo({
            id,
            name,
            author,
            alias,
            version,
          });
          const _c_result = await converter.converterPlugin();
          this._logger.log(
            "debug",
            `[安装或升级插件] 转化出来,${_c_result.file}`
          );

          if (_c_result.type === "zip") {
            // @ts-ignore
            this._logger.log(
              "debug",
              `[安装或升级插件]  ${_pluginInfo.alias} zip格式安装包`
            );
            const isInstalled = await handlePlugin.runZipInstaller(
              _c_result.file,
              _pluginInfo
            );

            if (isInstalled) {
              this._logger.log("info", `[安装或升级插件]  ${alias} 安装完成`);

              fs.removeSync(
                path.join(converter._Temp, converter._pluginInfo.alias)
              );
              return resolve({
                code: 0,
                data: {
                  id,
                  version,
                },
                message: "",
              });
            } else {
              this._logger.log(
                "warn",
                `[安装或升级插件] zip格式安装包 ${alias} 安装失败`
              );
              this._window.webContents.send("obsSystemErrorMsg", {
                code: 2006,
                type: "plugin",
                message: "plugin files not suitable",
              });
              return resolve({
                code: 2006,
                data: {
                  id,
                  version,
                },
                message: "plugin files not suitable",
              });
            }
          } else if (_c_result.type === "exe") {
            //   // 保存最后的输出，以及localpluginlist数据
            this._logger.log(
              "debug",
              `[安装或升级插件]  ${alias} exe格式安装包`
            );
            const isInstalled = await handlePlugin.runExeInstaller(
              _c_result.file,
              _pluginInfo
            );

            if (isInstalled) {
              this._logger.log("info", `[安装或升级插件]  ${alias} 安装完成`);
              return resolve({
                code: 0,
                data: {
                  id,
                  version,
                },
                message: "",
              });
            } else {
              this._logger.log(
                "warn",
                `[安装或升级插件]  ${alias} 手动取消安装`
              );
              this._window.webContents.send("obsPluginMsg", {
                type: "plugin",
                message: "Install Canceled",
              });
              return resolve({
                code: 2001,
                data: {
                  id,
                  version,
                },
                message: "install canceled",
              });
            }
          } else if (_c_result.type === "dll") {
            this._logger.log(
              "debug",
              `[安装或升级插件]  ${_pluginInfo.alias} dll格式安装包`
            );
            const isInstalled = await handlePlugin.runDllInstaller(
              _c_result.file,
              _pluginInfo
            );

            if (isInstalled) {
              fs.removeSync(
                path.join(converter._Temp, converter._pluginInfo.alias)
              );
              return resolve({
                code: 0,
                data: {
                  id,
                  version,
                },
                message: "",
              });
            } else {
              this._logger.log(
                "warn",
                `[安装或升级插件] dll格式安装包 ${alias} 安装失败`
              );
              this._window.webContents.send("obsSystemErrorMsg", {
                code: 2006,
                type: "plugin",
                message: "plugin files not suitable",
              });
              return resolve({
                code: 2006,
                data: {
                  id,
                  version,
                },
                message: "plugin files not suitable",
              });
            }
          } else if (_c_result.type === "single-motion-effect") {
            // @ts-ignore
            this._logger.log("debug", `[安装或升级插件] 单体插件motion-effect`);
            const isInstalled = await handlePlugin.runSingleMotionInstaller(
              _c_result.file,
              _pluginInfo
            );

            if (isInstalled) {
              this._logger.log(
                "info",
                `[安装或升级插件] 单体插件motion-effect 安装完成`
              );
              fs.removeSync(path.join(converter._Temp, "motion-effect"));
              return resolve({
                code: 0,
                data: {
                  id,
                  version,
                },
                message: "",
              });
            } else {
              this._logger.log(
                "warn",
                `[安装或升级插件] 单体插件motion-effect 安装失败`
              );
              this._window.webContents.send("obsSystemErrorMsg", {
                code: 2006,
                type: "plugin",
                message: "plugin files not suitable",
              });
              return resolve({
                code: 2006,
                data: {
                  id,
                  version,
                },
                message: "plugin files not suitable",
              });
            }
          } else {
            this._logger.log(
              "error",
              `[安装或升级插件]  ${alias} 未知的安装包文件`
            );
            this._window.webContents.send("obsSystemErrorMsg", {
              code: 2002,
              type: "plugin",
              message: "Unkown OBS Plugin Files",
            });
            return resolve({
              code: 2002,
              data: {
                id,
                version,
              },
              message: "Unkown OBS Plugin Files",
            });
          }
        } catch (err) {
          // 报错
          this._logger.log("error", `[安装或升级插件]  网络错误${err}`);
          this._window.webContents.send("obsSystemErrorMsg", {
            code: 2000,
            type: "axios",
            message: "network error",
          });
          return resolve({
            code: 2000,
            data: {
              id,
              version: "",
            },
            message: "network error",
          });
        }
      });
    });

    ipcMain.handle("OBS_PLUGIN_UPDATE", async (event, params) => {
      return new Promise(async (resolve, reject) => {
        if (params) {
          params = JSON.parse(params);
        }
      });
    });

    ipcMain.handle("OBS_PLUGIN_REMOVE", async (event, params) => {
      return new Promise(async (resolve, reject) => {
        if (params) {
          params = JSON.parse(params);
        }
        const { id } = params;
        const filelists = this._store.get(`plugins.${id}.fileLists`);
        if (filelists) {
          const remove_result = handlePlugin.removePlugin(filelists);
          if (remove_result.code != 0) {
            this._logger.log("error", `[卸载插件]  错误${remove_result}`);
            return resolve(remove_result);
          }
          this._store.delete(`plugins.${id}`);
          const pluginlist = this._store.get("localPluginsList");
          pluginlist.forEach((data, index) => {
            if (data.id == id) {
              pluginlist.splice(index, 1);
            }
          });
          this._store.set("localPluginsList", pluginlist);
          this._logger.log("info", `[卸载插件]  卸载完成${id}`);
          return resolve({
            code: 0,
            data: {},
            message: "",
          });
        } else {
          this._logger.log("warn", `[卸载插件]  插件未安装${id}`);
        }
      });
    });
  }
}

export const obsConfig = new ObsConfig();
