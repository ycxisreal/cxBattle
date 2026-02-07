import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = !app.isPackaged

const projectRoot = path.resolve(__dirname, '..')
const dataDirectories = [
  path.join(projectRoot, 'src', 'game', 'data'),
  path.join(projectRoot, 'public', 'data'),
  path.join(projectRoot, 'dist', 'data'),
  path.join(process.cwd(), 'src', 'game', 'data'),
  path.join(process.cwd(), 'public', 'data'),
  path.join(process.cwd(), 'dist', 'data'),
  path.join(process.resourcesPath, 'app.asar', 'dist', 'data'),
  path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'data'),
]

// 读取 JSON 文件并返回数据
function readJsonFile(fileName) {
  for (const dir of dataDirectories) {
    const filePath = path.join(dir, fileName)
    if (!fs.existsSync(filePath)) continue
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  }
  return null
}

// 加载游戏数据
function loadGameData() {
  return {
    units: readJsonFile('units.json') || [],
    skills: readJsonFile('skills.json') || [],
    strengths: readJsonFile('strengths.json') || [],
  }
}

// 提供同步数据读取，避免 preload 沙盒访问 fs
ipcMain.on('demo:get-data-sync', (event) => {
  event.returnValue = loadGameData()
})

// 创建主窗口
function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.maximize()
  win.removeMenu()
  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
