import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = !app.isPackaged

const projectRoot = path.resolve(__dirname, '..')

// 获取可写数据目录
function getWritableDataDir() {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'data')
  }
  return path.join(projectRoot, 'src', 'game', 'data')
}

const dataDirectories = [
  getWritableDataDir(),
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
    blessings: readJsonFile('blessings.json') || [],
    equipmentAffixes: readJsonFile('equipmentAffixes.json') || [],
    progression: readJsonFile('progression.json') || {
      totalPoints: 0,
      allocations: {},
    },
  }
}

// 提供同步数据读取，避免 preload 沙盒访问 fs
ipcMain.on('demo:get-data-sync', (event) => {
  event.returnValue = loadGameData()
})

// 保存数据到可写目录
ipcMain.handle('demo:save-data', async (event, payload) => {
  const dataDir = getWritableDataDir()
  try {
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(
      path.join(dataDir, 'units.json'),
      JSON.stringify(payload?.units ?? [], null, 2),
      'utf-8'
    )
    fs.writeFileSync(
      path.join(dataDir, 'skills.json'),
      JSON.stringify(payload?.skills ?? [], null, 2),
      'utf-8'
    )
    fs.writeFileSync(
      path.join(dataDir, 'strengths.json'),
      JSON.stringify(payload?.strengths ?? [], null, 2),
      'utf-8'
    )
    fs.writeFileSync(
      path.join(dataDir, 'blessings.json'),
      JSON.stringify(payload?.blessings ?? [], null, 2),
      'utf-8'
    )
    fs.writeFileSync(
      path.join(dataDir, 'equipmentAffixes.json'),
      JSON.stringify(payload?.equipmentAffixes ?? [], null, 2),
      'utf-8'
    )
    fs.writeFileSync(
      path.join(dataDir, 'progression.json'),
      JSON.stringify(
        payload?.progression ?? {
          totalPoints: 0,
          allocations: {},
        },
        null,
        2
      ),
      'utf-8'
    )
    return { ok: true }
  } catch (error) {
    return { ok: false, error: String(error?.message || error) }
  }
})

// 创建主窗口
function createWindow() {
  const win = new BrowserWindow({
    width: 1536,
    height: 864,
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  // win.maximize()
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
