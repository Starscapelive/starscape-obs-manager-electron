import * as path from 'path'
// We will use the next module for apropriate positioning. We should display
// About page in the center of the screen.
const positioner = require('electron-traywindow-positioner');

import { BrowserWindow } from 'electron'
declare const __static: string;

const unhandled = require('electron-unhandled');
unhandled();

export class TrayWindow {
  window: BrowserWindow
  constructor() {
    // Link to the HTML file that will render app window.
    let htmlPath = 'file://' + path.join(__static, '/pages/tray_page.html')

    // Creation of the new window.
    this.window = new BrowserWindow({
      show: false, // Initially, we should hide it, in such way we will remove blink-effect.
      height: 210,
      width: 150,
      frame: false, // This option will remove frame buttons. By default window has standart chrome header buttons (close, hide, minimize). We should change this option because we want to display our window like Tray Window not like common chrome-like window.
      backgroundColor: '#E4ECEF',
      resizable: false,
      webPreferences: {    
        contextIsolation: true,
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
      }
    });

    this.window.loadURL(htmlPath);
    positioner.position(this.window, this.window.getBounds());

    // Object BrowserWindow has a lot of standart events/ We will hide Tray Window
    // on blur. To emulate standart behavior of the tray-like apps.
    this.window.on('blur', () => {
      this
        .window
        .hide();
    });
  }
}
