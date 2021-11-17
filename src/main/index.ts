
import * as electron from 'electron'
import { TrayWindow } from './windows/TrayWindow';
import { MainWindow } from './windows/MainWindow';
import { TrayIcon } from './TrayIcon';
import { Config } from './Config';
import path from 'path';
declare const __static: string;
const { app, Menu, ipcMain, globalShortcut, session } = electron;

process.env.ORIGIN_PATH = 'https://obs.starscape.live/'; 
process.env.API_URL =  "https://api.starscape.live/"

export interface Context {
  tray?: TrayWindow,
  trayIcon?: TrayIcon,
  mainWindow?: MainWindow,
  ipcMain?: electron.IpcMain,
  node?: any
  electron?: any
  staticPath?: string
}
const context: Context = {
  ipcMain,
  electron,
  node: Config.node,
  mainWindow: null,
  staticPath: path.join(__static, ''),
}

function initApp() {

  const gotTheLock: boolean = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    app.quit()
    return
  }

  // 注册协议
  const PROTOCOL = 'STARSCAPE-OBS';
  app.setAsDefaultProtocolClient(PROTOCOL);

  // 禁用硬件加速
  // app.disableHardwareAcceleration();

  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (context.mainWindow && context.mainWindow.window) {
      const commands = commandLine.slice();
      const jumpURL = decodeURI(commands.pop()).replace('starscape-obs://', `${process.env.ORIGIN_PATH}/plugins/`);
      context.mainWindow.window.loadURL(jumpURL);
      context.mainWindow.window.show();
      // context.mainWindow.window.reload(); // 每次唤醒刷新页面
      if (context.mainWindow.window.isMinimized()) context.mainWindow.window.restore()
      context.mainWindow.window.focus()
    }
  })

  app.on('open-url', (event, url) => {
    if (context.mainWindow && context.mainWindow.window) {
      const jumpURL = url.replace('starscape-obs://', `${process.env.ORIGIN_PATH}/plugins/`);
      context.mainWindow.window.loadURL(jumpURL);
      context.mainWindow.window.show();
      // context.mainWindow.window.reload(); // 每次唤醒刷新页面
      if (context.mainWindow.window.isMinimized()) context.mainWindow.window.restore()
      context.mainWindow.window.focus()
    }
  })

  // We hide dock, because we do not want to show our app as common app. 
  // We want to display our app as a Tray-like app (like Dropbox, Skitch or ets).
  // app.dock.hide();

  // This event will be emitted when Electron has finished initialization.
  // app.setName('Starscape-' + app.getVersion())
  app.on('ready', function () {
    try {
      // let us = 'Mozilla/5.0 (Windows NT 10.0; rv:74.0) Gecko/20100101 Firefox/74.0';
      // us = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:70.0) Gecko/20100101 Firefox/70.0';
      // us = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15';
      // session.defaultSession.setUserAgent(us);
      // app.userAgentFallback = us;
      onReady()
      // console.log('process.execPath', process.execPath)
    } catch (error) {
      console.log('ready', error)
    }
  })

  function onReady() {
    console.log('ready')
    context.tray = new TrayWindow();
    context.mainWindow = new MainWindow();
    context.trayIcon = new TrayIcon(context.tray.window, context.mainWindow.window);
    
    context.trayIcon.initTrayWindow(getTrayIconMenu());

    const webContents = context.mainWindow.window.webContents
    globalShortcut.register('Cmd+Ctrl+Shift+]', () => {
      if (Config.debug) {
        Config.debug = false;
        webContents.closeDevTools()
      } else {
        Config.debug = true;
        webContents.openDevTools({ mode: 'detach' })
      }
      webContents.reload()
    })
    globalShortcut.register('Cmd+Ctrl+Shift+[', () => {
      console.log('Cmd+Ctrl+Shift+F1')
      if (webContents.isDevToolsOpened()) {
        webContents.closeDevTools()
      } else {
        webContents.openDevTools({ mode: 'detach' })
      }
    })

    // windows如果是通过url schema启动则发出时间处理
    // 启动参数超过1个才可能是通过url schema启动
    if (process.argv.length > 1 && !process.argv.includes('dev')) {
      if (!app.isReady()) {
        app.once("browser-window-created", () => {
          // app 未打开时，通过 open-url打开 app，此时可能还没 ready，需要延迟发送事件
          // 此段ready延迟无法触发 service/app/ open-url 处理，因为saga初始化需要时间
          app.emit("second-instance", null, process.argv);
        });
      } else {
        app.emit("second-instance", null, process.argv);
      }
    }
    
    console.log('ready done')
  }
  app.on('will-quit', () => {
    // Unregister all shortcuts.
    globalShortcut.unregisterAll()
  })
  // Custom event created to close the app from Tray Window.
  // The ipcMain module is used to handle events from a renderer process (web page).

  app.dock && app.dock.setMenu(Menu.buildFromTemplate([
    {
      label: 'Show Main Window',
      click: () => context.mainWindow.window.show()
    }, {
      label: 'New Window with Settings',
      submenu: [
        { label: 'Basic' },
        { label: 'Pro' }
      ]
    },
    { label: 'New Command...' }
  ]))

  ipcMain.on('quit-app', function () {
    context.tray.window.close(); // Standart Event of the BrowserWindow object.
    app.exit(); // Standart event of the app - that will close our app.
  });

  ipcMain.on('show-main', function () {
    showMainWindow()
  });
  ipcMain.on('show-dev-tools', function () {
    showDevTools()
  });
  ipcMain.on('switch-dev', function () {
    switchDev()
  });

  ipcMain.on('check-update', function () {
    // updater.checkForUpdates()
  });

  function showMainWindow() {
    if (context.mainWindow.window.isDestroyed()) {
      context.mainWindow.destroy()
      context.mainWindow = new MainWindow();
    } else {
      context.mainWindow.window.show()
      context.mainWindow.window.focus()
    }
  }

  function showDevTools() {
    const webContents = context.mainWindow.window.webContents
    webContents.openDevTools({ mode: 'detach' })
  }

  function switchDev() {
    const webContents = context.mainWindow.window.webContents
    if (Config.debug) {
      Config.debug = false;
      webContents.closeDevTools()
    } else {
      Config.debug = true;
      webContents.openDevTools({ mode: 'detach' })
    }
    webContents.reload()
  }

  function getTrayIconMenu(): Electron.MenuItemConstructorOptions[] {
    const tools: Electron.MenuItemConstructorOptions[] = [
      // {
      //   label: 'Test',
      //   click: () => {
      //     window.open('https://www.baidu.com', '_blank')
      //   }
      // },
      {
        label: 'Quit',
        click: () => app.exit()
      },
      {
        label: 'Show Main Widnow',
        click: () => showMainWindow()
      },
      // {
      //   type: 'separator',
      // },
      // {
      //   label: 'Version:' + app.getVersion(),
      //   enabled: false
      // },
      // {
      //   label: 'Check Updates',
      //   click: () => GmsUpdaterNotCodeSiging.getInstance(context).checkForUpdates()
      // },
    ]
    // if (true || !Config.isProd) {
    //   tools.push({
    //     label: 'Swtich to Dev',
    //     click: () => switchDev()
    //   })
    //   tools.push({
    //     label: 'Developer Tools',
    //     click: () => showDevTools()
    //   })
    // }
    return tools
  }

}
// 初始化app
initApp()
