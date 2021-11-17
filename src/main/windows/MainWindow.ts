import * as path from 'path'
// We will use the next module for apropriate positioning. We should display
// About page in the center of the screen.
import { BrowserWindow, ipcMain, app, dialog, screen,nativeTheme, shell } from 'electron'
import { Config } from '../Config';
const localserver =  require("../obs/localserver")
import {obsConfig} from '../obs'
// import axios from 'axios';
// https://pragli.com/blog/how-to-authenticate-with-google-in-electron/
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

declare const __static: string;
const unhandled = require('electron-unhandled');
unhandled();

export class MainWindow {
  destroy(): any {
    this.window.destroy()
  }
  window: BrowserWindow
  subWindow: BrowserWindow
  isUpdate: boolean = false;

  constructor() {
    
    let mainWindow = this.window = new BrowserWindow({
      show: false,
      // x: 0,
      // y: 0,
      center: true,
      height:700,
      width:1024,
      frame: false,
      // transparent:true,
      title: 'Starscape-' + app.getVersion(),
      backgroundColor: '#E4ECEF',
      autoHideMenuBar:true,
      resizable: false,
      icon: path.join(__static, 'icons/icon22.png'),
      webPreferences: {
        contextIsolation: false,
        sandbox: true,
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        preload: path.join(__static, '/pages/main.preload.js'),
        // contextIsolation: true,
        // nodeIntegration: false,
        // nodeIntegrationInWorker: false,
        webSecurity:false,
      }
    })
    
    obsConfig
    obsConfig.setWindow(mainWindow);
    obsConfig.checkConnection(
      ()=>{
        mainWindow.loadURL(`${process.env.ORIGIN_PATH}/plugins/ele-list`);
    },
    () => {
      mainWindow.loadFile(path.join(__static, '/pages/checkConnection.html'));
    });


    // mainWindow.loadFile(path.join(__static, '/pages/checkConnection.html'));
    // mainWindow.loadURL(`${process.env.ORIGIN_PATH}/plugins/ele-list`);
    // mainWindow.maximize();
    mainWindow.show();
    // mainWindow.loadFile(path.join(__static, '/pages/OBS.html'));
    // mainWindow.setResizable(false);

    // About Window will disappear in blur.
    mainWindow.on('blur', () => {
      // this.window.hide();
    });

    mainWindow.webContents.setWindowOpenHandler((data)=>{
      // console.log("[new window data]",data)
      shell.openExternal(data.url)
      return {action: 'deny'}
    })

    mainWindow.on('close', (event: Electron.Event) => {
      if (!this.isUpdate) {
        event.preventDefault();
        dialog.showMessageBox(mainWindow, {
          type: 'question',
          title: 'Tips',
          defaultId: 0,
          message: 'Wants to quit Starscape OBS Manager?',
          buttons: ['Quit', 'Cancel', 'Minimize']
        }).then(rep => {
          rep.response === 0 ? app.exit() : rep.response === 2 ? this.window.minimize() : null;
        })
      }
    })
    


  //  Config.debug && mainWindow.webContents.openDevTools()

    // On show - we should display About Window in the center of the screen.
    mainWindow.on('show', () => {
      // let positioner = new Positioner(mainWindow);
      // positioner.move('center');
    });


    ipcMain.handle("APP_WINDOW_MIN", () => {
      mainWindow.minimize();
    })

    ipcMain.handle("APP_WINDOW_TOGGLE", (event,params) => {
      if (params) {
        params = JSON.parse(params);
      }
      if(params.max){
        mainWindow.maximize()
      }else{
        mainWindow.restore()
      }
    })

    ipcMain.handle("APP_WINDOW_CLOSE", () => {
      // app.exit()
      app.quit()
    })


    // 重新渲染页面

    ipcMain.handle("RETRY_RENDER",  () => {
      return new Promise( (resolve, reject) => {
        obsConfig.checkConnection(
          ()=>{
              mainWindow.loadURL(`${process.env.ORIGIN_PATH}/plugins/ele-list`);
              resolve(true)
          },
          () => {
            mainWindow.loadFile(path.join(__static, '/pages/checkConnection.html'));
            // mainWindow.loadURL(`${process.env.ORIGIN_PATH}/plugins/ele-list`);
              resolve(false)
          });
      })
     
      
    });


    ipcMain.on('BRIGE_RENDER_TO_MAIN', (event: any, to: 'HOME' | 'GAME', param: any) => {
      console.log('BRIGE_RENDER_TO_MAIN', to, param);
      
      if (to === 'HOME') {
        this.window.webContents.send('BRIGE_MAIN_TO_RENDER', { origin: 'gamescape.live', data: JSON.stringify(param) });
      } else {
        this.subWindow && this.subWindow.webContents.send('BRIGE_MAIN_TO_RENDER', { origin: 'gamescape.live', data: JSON.stringify(param) });
      }
    })
  }

  
}