const { contextBridge, ipcRenderer } = require('electron')

// 获取主进程中的 JSON 数据
const getGameData = () => ipcRenderer.sendSync('demo:get-data-sync')

contextBridge.exposeInMainWorld('demo', {
  // 获取应用版本
  version: () => 'demo-1.0.0',
  // 标记为 Electron 环境
  isElectron: true,
  // 获取本地 JSON 数据
  getData: () => getGameData(),
})
