/**
 * Electron 主进程入口文件
 *
 * 这是整个桌面应用的"启动器"和"大总管"。
 * 当你双击应用图标或在终端输入 npm run dev 时，Electron 首先执行的就是这个文件。
 *
 * 它负责三件事：
 * 1. 创建桌面窗口（设置大小、标题、安全策略）
 * 2. 加载前端界面（开发模式从本地服务器加载，生产模式从打包文件加载）
 * 3. 管理应用的生命周期（启动、激活、退出）
 *
 * 生命周期时间线：
 * 应用启动 → app.whenReady() → 注册 IPC 处理器 → 创建窗口 → 加载界面
 *                                                               ↓
 * 用户关闭窗口 → window-all-closed → 应用退出 → before-quit → 关闭数据库
 */
import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc-handlers'
import { closeDatabase } from './database'

/**
 * 创建应用主窗口
 *
 * 设计考量：
 * - 宽度 420px：足够显示记账表单，但不会太宽
 * - 高度 720px：和常见手机屏幕差不多，适合竖屏使用
 * - 最小尺寸：防止用户把窗口缩得太小导致界面变形
 * - show: false：先加载页面，等准备好了再显示（避免先看到白屏）
 */
function createWindow() {
  // 判断是否在开发模式：
  // 条件 1：NODE_ENV 环境变量为 "development"
  // 条件 2：命令行参数中有 --dev
  // 条件 3：应用没有被 electron-builder 打包过（app.isPackaged = false）
  const isDev = process.env.NODE_ENV === 'development' ||
                process.argv.includes('--dev') ||
                !app.isPackaged

  // 创建浏览器窗口（Electron 里叫 BrowserWindow，其实就是桌面窗口）
  const mainWindow = new BrowserWindow({
    width: 420,          // 窗口宽度（像素）
    height: 720,         // 窗口高度（像素）
    minWidth: 380,       // 最小宽度（用户不能缩得比这更窄）
    minHeight: 600,      // 最小高度（保证界面元素不会挤成一团）
    title: '黑马记账',    // 窗口标题栏显示的文字
    resizable: true,     // 允许用户拖动调整窗口大小

    // webPreferences：网页安全设置（Electron 安全的核心）
    webPreferences: {
      nodeIntegration: false,    // 🔒 禁止网页内直接使用 Node.js（防远程代码执行）
      contextIsolation: true,    // 🔒 隔离网页 JS 和主进程 JS 的运行环境（防变量污染和攻击）
      // preload：指定预加载脚本的路径。
      // 这个脚本在网页加载前执行，通过 contextBridge 有选择地暴露 API 给网页。
      // 网页只能使用 preload 暴露的函数，无法绕过它访问系统功能。
      preload: join(__dirname, '../preload/preload.js')
    }
  })

  // 窗口内容加载完成后才显示（避免用户先看到灰白色空白页面）
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 根据运行模式加载不同的前端地址
  if (isDev) {
    // 开发模式：从 Vite 开发服务器加载（http://localhost:5173）
    // Vite 提供热更新（修改代码浏览器自动刷新），大大提高开发效率
    mainWindow.loadURL('http://localhost:5173')
    // 自动打开 Chrome 开发者工具（方便调试界面和查看网络请求）
    mainWindow.webContents.openDevTools()
  } else {
    // 生产模式：加载打包后的静态 HTML 文件
    // 文件路径：out/renderer/index.html（由 electron-vite build 生成）
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ============ 应用生命周期事件 ============

/**
 * app.whenReady()
 * Electron 的"就绪信号"——框架初始化完毕、系统资源准备好之后触发。
 * 只有在这个事件之后才能创建窗口，否则会报错。
 *
 * 用生活类比：就像 Windows 开机——必须等桌面加载出来之后，才能打开软件。
 */
app.whenReady().then(() => {
  // 第一步：注册所有 IPC 通信处理器（"把电话线接好"）
  registerIpcHandlers()

  // 第二步：创建窗口（"打开店面"）
  createWindow()
})

/**
 * app.on('activate')
 * macOS 特有的行为：点击 Dock 栏图标时触发。
 * 在 macOS 上，用户关闭所有窗口后应用不一定退出，
 * 再次点击图标时如果没有窗口可用，就创建一个新窗口。
 *
 * Windows/Linux 上这个事件通常不会触发（关掉窗口就等于退出应用）。
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

/**
 * app.on('window-all-closed')
 * 所有窗口都关闭时触发。
 * Windows/Linux：直接退出应用（关掉所有窗口就是退出了）。
 * macOS：不退出（macOS 习惯是应用留在后台，等用户显式退出）。
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * app.on('before-quit')
 * 应用即将退出前触发——这是最后的"收尾"机会。
 *
 * 在这里关闭数据库连接，确保所有未写入的数据被刷到磁盘。
 * 如果不关闭就退出，数据库文件可能损坏，用户的数据就丢了。
 */
app.on('before-quit', () => {
  closeDatabase()
})
