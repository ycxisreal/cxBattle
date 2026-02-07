import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('demo', {
  version: () => 'demo-1.0.0',
})
