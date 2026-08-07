import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc-handlers'
import { closeDatabase } from './database'

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' ||
                process.argv.includes('--dev') ||
                !app.isPackaged

  const mainWindow = new BrowserWindow({
    width: 420,
    height: 720,
    minWidth: 380,
    minHeight: 600,
    title: '黑马记账',
    resizable: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/preload.js')
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 当 Electron 准备好后创建窗口
app.whenReady().then(() => {
  // 注册 IPC 通信处理器（渲染进程 ↔ 主进程）
  registerIpcHandlers()

  // 创建窗口
  createWindow()
})

// macOS：点击 Dock 图标时如果没有窗口则新建
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 应用退出前关闭数据库
app.on('before-quit', () => {
  closeDatabase()
})
