const { ipcRenderer, shell } = require("electron");
/**
/**
 * @zhao.han 参考这里的文档
 * https://www.electronjs.org/zh/docs/latest/api/ipc-renderer#ipcrendererinvokechannel-args
 */

// 获取软件版本
window.RetryRender= ()=>{
  return ipcRenderer.invoke('RETRY_RENDER');
}



// 获取软件版本
window.getAppVersion= ()=>{
  return ipcRenderer.invoke('GET_APP_VERSION');
}


//------------------------ipc-----------------------------------------
window.checkProtocol = (protocolurl)=>{
  customProtocolCheck(protocolurl,()=>{
    return false
  },()=>{
    return true
  })
}




//------------------------ipc-----------------------------------------
window.obsMessage = (channel,cb) => {
  ipcRenderer.on(channel,(event,data)=>{
    console.log("get obs message",data)
    cb(data)
  })
}

// window.obsMessage("obsSystemErrorMsg",(res)=>{
//   弹窗(res.message)
// })
//------------------------APP-----------------------------------------
// 最小化
window.AppWindowMin = () => {
  return ipcRenderer.invoke('APP_WINDOW_MIN');
};

// 最大化和恢复
window.AppWindowToggle = (params) => {
  return ipcRenderer.invoke('APP_WINDOW_TOGGLE', params);
};

// 关闭软件
window.AppWindowClose = () => {
  return ipcRenderer.invoke('APP_WINDOW_CLOSE');
};


//------------------------obs-path-----------------------------------------

// 获取obs目录
window.obsPathGet = (params) => {
  return ipcRenderer.invoke('OBS_PATH_GET', params);
};
// 从注册表重新读取目录信息
window.obsPathReset = (params)=>{
  return ipcRenderer.invoke('OBS_PATH_RESET', params);
};
// 手动指定OBS目录
window.obsPathModify = (params) => {
  return ipcRenderer.invoke('OBS_PATH_MODIFY', params);
};

// 手动指定OBS目录
// window.obsPathOpen = (params)=>{
//   return ipcRenderer.invoke('OBS_PATH_OPEN', params);
// };

//------------------------obs-software-----------------------------------------
// 检查obs是否正在运行
window.obsCheckRunning = (params)=>{
  return ipcRenderer.invoke('OBS_CHECK_RUNNING', params);
};

// 打开obs软件
window.obsOpen = (params)=>{
  return ipcRenderer.invoke('OBS_OPEN', params);
};

// 关闭obs软件
window.obsClose = (params)=>{
  return ipcRenderer.invoke('OBS_CLOSE', params);
};


//------------------------obs-plugin-----------------------------------------

// 获取本地插件列表
window.obsPluginGet = (params)=>{
  return ipcRenderer.invoke('OBS_PLUGIN_GET', params);
};


// 安装插件
window.obsPluginInstall = (params)=>{
  return ipcRenderer.invoke('OBS_PLUGIN_INSTALL', params);
};

// 升级插件插件
window.obsPluginUpdate = (params)=>{
  return ipcRenderer.invoke('OBS_PLUGIN_INSTALL', params);
  // return ipcRenderer.invoke('OBS_PLUGIN_UPDATE', params);
};


// 卸载插件
window.obsPluginRemove = (params)=>{
  return ipcRenderer.invoke('OBS_PLUGIN_REMOVE', params);
};



//------------------------obs-message-----------------------------------------

// 发送消息
window.postMessage = (params) => {
  const _params = JSON.parse(params || '{}');

  // send to Main brige
  ipcRenderer.send('BRIGE_RENDER_TO_MAIN', 'GAME', _params)

  console.log('postMessage success！===>', _params)
}
// window.addEventListener('message', recievedMsg, false);

// electron用默认浏览器打开链接
window.openExternalLogin = (externalKey) => {
  const _externalKey = externalKey ? externalKey: window.localStorage.getItem('externalKey');
  window.localStorage.setItem('externalKey', _externalKey);
  shell.openExternal(`https://www-test.starscape.live/ongoinglive.html?externalKey=${_externalKey}`);
}

console.log('preload loaded')

