const { contextBridge, ipcRenderer } = require('electron')

// 获取主进程中的 JSON 数据
const getGameData = () => ipcRenderer.sendSync('demo:get-data-sync')

// 保存 JSON 数据到主进程
const saveGameData = (payload) => ipcRenderer.invoke('demo:save-data', payload)

contextBridge.exposeInMainWorld('demo', {
  // 获取应用版本
  version: () => 'cxBattle-1.2.4',
  // 标记为 Electron 环境
  isElectron: true,
  // 获取本地 JSON 数据
  getData: () => getGameData(),
  // 保存本地 JSON 数据
  saveData: (payload) => saveGameData(payload),
})
