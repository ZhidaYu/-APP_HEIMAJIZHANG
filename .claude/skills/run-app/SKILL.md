---
name: run-app
description: 启动黑马记账应用（开发模式）
---

# 启动黑马记账应用

当用户调用此技能时，按以下步骤启动应用：

## 启动步骤

### 1. 激活 Conda 环境

```bash
conda activate heima-accounting
```

如果环境不存在，提示用户运行：
```bash
conda create -n heima-accounting nodejs=20 -y
conda activate heima-accounting
npm install
```

### 2. 检查依赖

确认 `node_modules/` 目录存在。如果不存在，运行：
```bash
npm install
```

### 3. 启动开发模式

```bash
npm run dev
```

这会通过 `scripts/dev.js` 启动 electron-vite，自动处理 `ELECTRON_RUN_AS_NODE` 环境变量问题。

### 4. 确认启动成功

应用窗口弹出即表示启动成功。

---

## 重要补充

### 运行环境
- **必须使用 Conda 环境 `heima-accounting`**，Node.js 版本为 20。不要用系统自带的 Node.js，否则可能版本不匹配。
- 本项目使用 `better-sqlite3` 原生模块，它和 Node.js 版本强绑定。如果切换了 Node.js 版本，需要用 `npm rebuild` 重新编译该模块。

### 数据存储位置
- 所有记账数据保存在用户本地电脑的 SQLite 数据库文件中，完全离线可用。
- 数据库文件位于应用的用户数据目录（Electron `app.getPath('userData')`），不是项目源码目录。
- 开发模式和生产模式使用不同的数据目录，互不影响。

### 离线运行
- 应用启动和运行不需要联网，所有功能离线可用。
- 图表库（Recharts）、图标库（Lucide React）等已打包在本地，不会请求外部资源。

### 金额计算
- 内部金额以**分**为单位存储和计算（整数），避免浮点数精度问题。
- 界面显示时转换为**元**（除以 100），格式如 `¥36.50`。

### 打包后的应用
- 打包命令：`npm run package:win-portable`（Windows 便携版）
- 输出位置：`release/` 目录
- 安装包大小约 74 MB，目标 < 200 MB ✅

---

## 常见问题

### Q1: 启动报错 `Cannot read properties of undefined (reading 'whenReady')`

**原因**：系统中设置了 `ELECTRON_RUN_AS_NODE=1` 环境变量，导致 Electron 无法正常启动。

**解决**：本项目的 `scripts/dev.js` 已自动清除该变量，如果仍然报错：
1. 检查 `~/.bashrc` 或 `~/.bash_profile` 中是否有 `export ELECTRON_RUN_AS_NODE=1`
2. 删除该行后重启终端
3. 或者每次启动前手动执行：`unset ELECTRON_RUN_AS_NODE`

### Q2: 看到 `GPU process exited unexpectedly` 或 `Network service crashed` 错误

**原因**：这些错误出现在无显示器环境（如远程服务器、部分虚拟机）。

**结论**：**不影响应用功能，可以忽略。** 应用窗口仍会正常显示和运行。

### Q3: 启动后窗口白屏或空白

**可能原因**：
1. Vite 还在构建中，稍等几秒即可。
2. 查看终端是否有编译错误（红色报错信息）。
3. 尝试按 `Ctrl+Shift+I` 打开开发者工具，查看 Console 是否有报错。

### Q4: `better-sqlite3` 模块报错

**原因**：原生模块和当前 Node.js 版本不匹配。

**解决**：
```bash
# 确认 conda 环境已激活
conda activate heima-accounting

# 重新编译原生模块
npx electron-rebuild -f -w better-sqlite3

# 或者重新安装依赖
npm install
```

### Q5: 端口被占用

**原因**：electron-vite 默认端口可能被其他程序占用。

**解决**：
1. 关闭其他正在运行的本项目实例。
2. 或者检查是否有其他程序占用了 electron-vite 的端口。

### Q6: Conda 环境激活失败

**解决**：
```bash
# 检查 conda 是否安装
conda --version

# 查看已有环境
conda env list

# 如果 heima-accounting 不存在，创建它
conda create -n heima-accounting nodejs=20 -y

# 激活后安装依赖
conda activate heima-accounting
npm install
```
