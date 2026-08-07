# 黑马记账

> 🐴 简单、直观的个人桌面记账应用

## 关于

黑马记账是一款跨平台（Windows + Mac）桌面端个人记账应用，帮助用户记录每一笔人民币支出。

## 功能

- ✏️ 快速记账：3 秒完成一笔支出记录
- 📂 二级分类：10 个一级分类 + 40+ 个二级分类
- 📋 账单查看：按时间查看所有历史记录
- 💾 本地存储：数据存在电脑上，不联网不上传

## 开发

本项目使用 **Electron + React + TypeScript** 开发。

### 环境要求

- [Conda](https://docs.conda.io/)（或直接安装 Node.js 20+）
- Windows 10+ 或 macOS 12+

### 快速开始

```bash
# 1. 激活 conda 环境
conda activate heima-accounting

# 2. 安装依赖
npm install

# 3. 启动开发
npm run dev

# 4. 打包
npm run package:win    # Windows
npm run package:mac    # Mac
```

## 项目结构

```
├── docs/PRODUCT.md       # 产品文档
├── CLAUDE.md             # AI 开发协作指南
├── src/
│   ├── main/             # Electron 主进程
│   ├── renderer/         # React 前端界面
│   └── shared/           # 共享代码（分类数据、类型定义）
└── package.json          # 项目配置
```

## 许可

MIT
