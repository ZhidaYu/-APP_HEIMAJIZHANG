---
name: rebuild-app
description: 重新打包黑马记账应用，生成 .exe 安装文件
---

# 重新打包黑马记账

将黑马记账重新编译并打包成 Windows 安装文件（.exe）。

## 打包步骤

### 1. 清理旧的打包文件

删除 `release/` 目录（如果存在），确保全新打包：

```bash
rm -rf release/
```

### 2. 确认依赖完整

检查 `node_modules/` 目录是否存在。如果不存在，先运行：

```bash
npm install
```

### 3. 编译 + 打包

```bash
npm run package:win
```

该命令会自动完成两步：
- **编译**：`electron-vite build` — 把 TypeScript 代码转成可运行的 JavaScript
- **打包**：`electron-builder --win` — 把运行文件封装成 Windows .exe 安装程序

### 4. 确认打包结果

打包完成后，在 `release/` 目录下查看生成的安装文件，文件名类似：

```
黑马记账 Setup 1.0.0.exe
```

告知用户文件名和文件大小。

---

## 重要说明

### 打包方式

| 命令 | 产物 | 说明 |
|------|------|------|
| `package:win` | NSIS 安装包 | **默认使用**，带中文安装向导，用户可选安装路径 |
| `package:win-portable` | 单个 `.exe` | 免安装便携版，双击直接运行 |

### 打包过程

```
清理旧文件 → 编译代码 → 封装成安装包 → 确认结果
```

- 编译阶段：把 TypeScript 源码转成 JavaScript，输出到 `out/` 目录
- 打包阶段：把 `out/` + `node_modules` + Electron 运行时一起封装成安装程序
- 首次打包可能下载 Electron 二进制文件（约 70 MB），需要联网

### 约束条件

- 安装包大小目标 < 200 MB，当前约 83 MB ✅
- 打包后的应用完全离线可用，无需联网
- 用户数据存储在安装目录之外，升级安装不会丢失数据

---

## 常见问题

### Q1: 打包报错 `electron-builder` 找不到

```bash
npm install
```

### Q2: better-sqlite3 原生模块打包失败

```bash
npx electron-rebuild -f -w better-sqlite3
```

### Q3: 打包出来的 exe 被杀毒软件拦截

添加信任即可，这是误报。

### Q4: 首次打包下载慢

可设置国内镜像加速：
```bash
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
```
