/**
 * 开发启动脚本
 * 解决 ELECTRON_RUN_AS_NODE 环境变量导致 Electron 无法正常启动的问题
 */
const { spawn } = require('child_process')
const path = require('path')

// 关键：删除阻止 Electron 正常运行的环境变量
delete process.env.ELECTRON_RUN_AS_NODE

// 启动 electron-vite dev
const cli = path.resolve(__dirname, '../node_modules/electron-vite/bin/electron-vite.js')
const child = spawn(process.execPath, [cli, 'dev'], {
  stdio: 'inherit',
  env: process.env,
  cwd: path.resolve(__dirname, '..')
})

child.on('exit', (code) => {
  process.exit(code || 0)
})
