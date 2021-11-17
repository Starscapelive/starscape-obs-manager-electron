import * as path from 'path'
// We will use the next module for apropriate positioning. We should display
// About page in the center of the screen.
import positioner from 'electron-traywindow-positioner';
import * as https from 'https'
import * as http from 'http'
declare const __static: string;

import {Menu, BrowserWindow, Tray, app} from 'electron'

export class TrayIcon {
  trayIcon: Tray
  trayWindow: BrowserWindow
  mainWindow: BrowserWindow
  constructor(trayWindow, mainWindow) {
    if( !trayWindow ) return
    this.trayWindow = trayWindow
    this.mainWindow = mainWindow
    // Path to the app icon that will be displayed in the Tray (icon size: 22px)
    let iconPath = path.join(__static, '/icons/icon22.png')

    this.trayIcon = new Tray(iconPath);
    this.trayIcon.setToolTip('Starscape OBS Manager');
  }

  initSystemMenu(menus:  Electron.MenuItemConstructorOptions[]){
    const trayMenuTemplate = [
      {
         label: 'Quit',
         click: () => app.quit()
      }
   ]
   
   let trayMenu = Menu.buildFromTemplate(menus || trayMenuTemplate)
   this.trayIcon.setContextMenu(trayMenu);
   this.trayIcon.popUpContextMenu();
   trayMenu.on('menu-will-close', () => {
     this.trayIcon.setContextMenu(null);
     trayMenu = null;
   });
  }

  initTrayWindow(menus:  Electron.MenuItemConstructorOptions[]) {
    // By clicking on the icon we have to show TrayWindow and position it in the middle under the tray icon (initialy this window is hidden).
    this.trayIcon.on('right-click', (e, bounds) => this.initSystemMenu(menus))
    // this.trayIcon.on('double-click', (e, bounds) => this.toggleWindow(e, bounds))
    this.trayIcon.on('click', (e, bounds) => this.toggleMainWindow() )
  }

  toggleWindow(e:Electron.Event, bounds: Electron.Rectangle) {
    if ( this.trayWindow.isVisible() ) {
      this.trayWindow.hide();
    } else {
      positioner.position(this.trayWindow, this.trayWindow.getBounds());
      this.trayWindow.show();
    }
  }

  toggleMainWindow = () => {
    const win = this.mainWindow;
    if (win.isVisible()){
      win.focus();
    } else {
      win.show();
      win.focus();
    }
  }

}

