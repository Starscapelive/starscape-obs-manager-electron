const util = require('util');
const url = require('url');
const dgram = require('dgram');
const tls = require('tls');
const { StringDecoder } = require('string_decoder');
const stream = require('stream');
const repl = require('repl');
const readline = require('readline');
const querystring = require('querystring');
const { performance } = require('perf_hooks');
const path = require('path');
const os = require('os');
const net = require('net');
const inspector = require('inspector');
const http = require('http');
const https = require('https');
const http2 = require('http2');
const fs = require('fs');
const crypto = require('crypto');
const cluster = require('cluster');
const async_hooks = require('async_hooks');
import * as isDev from 'electron-is-dev'

var nconf = require('nconf').file({ file: getUserHome() + '/sound-machine-config.json' });

function saveSettings(settingKey, settingValue) {
  nconf.set(settingKey, settingValue);
  nconf.save();
}

function readSettings(settingKey) {
  nconf.load();
  return nconf.get(settingKey);
}

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}
const node = {
  StringDecoder,
  process,
  performance,
  util,
  url,
  dgram,
  tls,
  stream,
  repl,
  readline,
  querystring,
  path,
  os,
  net,
  inspector,
  http,
  https,
  http2,
  fs,
  crypto,
  cluster,
  async_hooks,
}

class UserConfig {
  _config: any
  _isProd = process.execPath.search('node_modules') === -1;

  constructor() {
    this._config = Object.assign({
      debug: true,
      // debug: false,
      serverPort: 3000,
      serverGolbalAddr: '0.0.0.0',
      serverLocalAddr: 'localhost'
    }, readSettings('UserConfig'))
  }
  saveSettings(): void {
    saveSettings('UserConfig', this._config)
  }

  get debug(): boolean {
    return this._config.debug
  }
  set debug(val: boolean) {
    this._config.debug = val
    this.saveSettings()
  }

  get serverPort(): string {
    return this._config.serverPort
  }
  set serverPort(val: string) {
    this._config.serverPort = val
    this.saveSettings()
  }

  get serverGolbalAddr(): string {
    return this._config.serverGolbalAddr
  }
  set serverGolbalAddr(val: string) {
    this._config.serverGolbalAddr = val
    this.saveSettings()
  }

  get serverLocalAddr(): string {
    return this._config.serverLocalAddr
  }
  set serverLocalAddr(val: string) {
    this._config.serverLocalAddr = val
    this.saveSettings()
  }

  get node() {
    return node
  }

  get isDev(): boolean {
    return isDev
  }

  get isProd(): boolean {
    return this._isProd
  }

}

export const Config = new UserConfig()
