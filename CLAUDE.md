# 黑马记账 (Heima Accounting)

> 跨平台桌面端个人记账应用。记录人民币支出流水，2 级分类体系。
> **平台**: Windows 10/11 + macOS 12+ | **语言**: 全中文 | **运行**: 离线可用，无需登录

---

## 🔴 用户协作规则（最重要！）

本项目的使用者是**完全非技术背景的初学者**。在整个开发过程中，**每当遇到任何技术选型或实现方案的选择时**，助手必须遵守以下规则：

### 决策流程

```
1. 识别: 发现需要做技术决策的地方
2. 分析: 研究 2-3 个可行方案
3. 解释: 用通俗语言 + 生活类比，向用户解释每个方案
4. 推荐: 给出你的推荐方案和理由
5. 等待: 必须等用户明确选择后才能继续
6. 记录: 将用户的选择记录到下方的「技术决策日志」中
```

### 禁止行为

- ❌ 不要问需要技术背景的问题（如"你要用 Redux 还是 Zustand？"）
- ❌ 不要自行替用户做技术决定
- ❌ 不要假设用户懂任何编程术语
- ❌ 不要跳过"解释方案"这一步

### 沟通规则

- 所有对话使用**简体中文**
- 解释技术概念时，优先使用**生活类比**
- 每完成一个功能模块，向用户展示成果
- 代码注释使用**中文**
- 涉及金额的数据，用**分**做单位计算，显示时转为**元**

---

## 📋 技术决策日志

| 编号 | 日期 | 决策内容 | 用户选择 | 选择理由 |
|------|------|---------|---------|---------|
| D001 | 2026-08-06 | 桌面应用框架 | **Electron** | 最成熟稳定，社区最大，开发最快，中文资料多 |
| D002 | 2026-08-06 | UI 框架 | **React** | 全球最流行，生态最大，未来找人维护最容易 |
| D003 | 2026-08-06 | 开发环境管理 | **Conda 环境 (heima-accounting)** | 用户有 Anaconda，使用 conda 环境隔离 Node.js 依赖 |
| D004 | 2026-08-06 | 数据存储方案 | **SQLite (better-sqlite3)** | 真正的数据库，数据安全可靠，支持复杂查询 |
| D005 | 2026-08-07 | 收入记录功能 | **加入收入记录** | 用户改变决定，加入收入5大类+支出/收入切换 |
| D006 | 2026-08-07 | 打包方式 | **Portable 便携版** | 用户要直接运行的 .exe，不要安装程序 |
| D006 | 2026-08-07 | 图表方案 | **Recharts 图表库** | 用户决定引入专业饼图+折线图，视觉效果更好 |
| D007 | 2026-08-07 | 打包工具 | **electron-builder (NSIS)** | Windows 安装包 83MB，含中文安装界面 |

---

## 🔧 技术栈

| 层面 | 选择 | 说明 |
|------|------|------|
| 桌面框架 | Electron | 把网页技术打包成桌面应用 |
| 前端语言 | TypeScript | JavaScript 的增强版，更安全 |
| UI 框架 | React | 全球最流行的前端 UI 框架 |
| 构建工具 | electron-vite | Electron + Vite 集成开发工具 |
| 样式方案 | 原生 CSS（CSS 变量） | 简洁，无需额外学习 |
| 数据存储 | SQLite (better-sqlite3) | 本地数据库文件，安全可靠 |
| 打包工具 | electron-builder | 打包成 Windows .exe 和 Mac .dmg |
| 开发环境 | Conda (heima-accounting) | Node.js 20.17，隔离项目管理 |
| 包管理 | npm | Node.js 标准包管理工具 |

---

## 📊 支出分类数据（权威参考）

本应用使用**一级分类 → 二级分类**的 2 级体系。以下为代码中使用的完整分类定义。

### 数据结构

每个分类的数据格式：
```
{
  key: "food",           // 一级分类标识（英文，代码用）
  label: "餐饮饮食",      // 一级分类名称（中文，界面显示）
  icon: "🍽️",            // 图标
  children: [ ... ]      // 二级分类列表
}
```

### 完整分类表

#### 1. 🍽️ 餐饮饮食

| key | label | 说明 |
|-----|-------|------|
| meal_daily | 三餐日常 | 早午晚餐等日常吃饭 |
| snack_drink | 零食饮料 | 零食、奶茶、咖啡 |
| takeout | 外卖外送 | 美团、饿了么等 |
| group_dining | 聚餐聚会 | 朋友聚餐、请客 |

#### 2. 🚗 交通出行

| key | label | 说明 |
|-----|-------|------|
| public_transit | 公共交通 | 公交、地铁、轮渡 |
| ride_hailing | 网约车/出租车 | 滴滴、花小猪、出租车 |
| car_expense | 私家车费用 | 加油、充电、过路费、停车 |
| train_flight | 火车/飞机 | 高铁、动车、机票 |

#### 3. 🛒 购物消费

| key | label | 说明 |
|-----|-------|------|
| daily_needs | 日常用品 | 洗漱、纸巾、清洁用品 |
| clothing | 服装鞋帽 | 衣服、鞋子、帽子、配饰 |
| electronics | 数码产品 | 手机、电脑、耳机 |
| home_decor | 家居装饰 | 家具、灯具、厨具 |

#### 4. 🏠 住房物业

| key | label | 说明 |
|-----|-------|------|
| rent_mortgage | 房租/房贷 | 每月房租或房贷 |
| utilities | 水电燃气 | 水费、电费、燃气费 |
| property_mgmt | 物业费用 | 物业管理、垃圾清运 |
| maintenance | 维修保养 | 水管、电器、墙面维修 |

#### 5. 🎮 休闲娱乐

| key | label | 说明 |
|-----|-------|------|
| movie_show | 电影演出 | 电影票、演唱会、展览 |
| travel | 旅游度假 | 酒店、门票、旅行团 |
| sports_fitness | 运动健身 | 健身房、器材、游泳 |
| game_topup | 游戏充值 | 手游、端游充值 |

#### 6. 💊 医疗健康

| key | label | 说明 |
|-----|-------|------|
| doctor_visit | 看病挂号 | 挂号费、门诊费 |
| medicine | 药品购买 | 药店买药、处方药 |
| health_checkup | 体检检查 | 年度体检、专项检查 |
| wellness | 保健养生 | 保健品、按摩、中医 |

#### 7. 📚 学习教育

| key | label | 说明 |
|-----|-------|------|
| training | 培训课程 | 线上/线下培训、兴趣班 |
| books | 书籍资料 | 纸质书、电子书 |
| stationery | 文具用品 | 笔、本子、文件夹 |
| exam_fee | 考试报名 | 各类考试报名费 |

#### 8. 🎁 人情社交

| key | label | 说明 |
|-----|-------|------|
| gift_redpacket | 红包礼金 | 微信红包、份子钱、礼物 |
| family_support | 孝敬长辈 | 给父母长辈的钱/物 |
| pet_expense | 宠物支出 | 猫粮狗粮、宠物医疗 |
| donation | 公益捐款 | 慈善捐款、水滴筹 |

#### 9. 💰 金融保险

| key | label | 说明 |
|-----|-------|------|
| insurance | 保险费用 | 社保、商业保险、车险 |
| loan_interest | 贷款利息 | 房贷/车贷/消费贷利息 |
| investment | 投资理财 | 股票、基金、理财（可选记录） |
| bank_fee | 手续费 | 转账、提现手续费 |

#### 10. 📦 其他支出

| key | label | 说明 |
|-----|-------|------|
| shipping | 快递运费 | 寄快递、退货运费 |
| beauty_salon | 美容美发 | 理发、烫染、护肤、美甲 |
| misc | 其他杂项 | 以上无法覆盖的支出 |

> ⚠️ 以上分类为代码中的权威数据源。修改分类时，从此表开始修改，然后同步更新代码。

---

## 📐 数据模型

### 支出记录 ExpenseRecord

```typescript
interface ExpenseRecord {
  id: string;               // 唯一标识（UUID）
  amount: number;            // 金额，单位：分（如 3650 表示 36.50 元）
  primaryCategory: string;   // 一级分类 key（如 "food"）
  secondaryCategory: string; // 二级分类 key（如 "takeout"）
  date: string;              // 支出日期，格式 YYYY-MM-DD
  note: string;              // 备注（最多 200 字）
  paymentMethod: string;     // 支付方式 key（如 "wechat"）
  createdAt: string;         // 创建时间 ISO 格式
  updatedAt: string;         // 修改时间 ISO 格式
}
```

### 支付方式预设

| key | label |
|-----|-------|
| wechat | 微信支付 |
| alipay | 支付宝 |
| bank_card | 银行卡 |
| cash | 现金 |
| other | 其他 |

---

## 🏗️ 项目文件结构

```
heima-accounting/
├── README.md                # 项目说明（给开发者看）
├── CLAUDE.md                # 本文件 - AI 协作指南
├── package.json             # 项目配置与依赖
├── electron-builder.yml     # 打包配置
├── docs/
│   └── PRODUCT.md           # 产品文档（给用户看）
├── src/
│   ├── main/                # Electron 主进程
│   │   ├── index.ts         # 主进程入口（创建窗口）
│   │   └── ipc-handlers.ts  # 与渲染进程通信的处理函数
│   ├── renderer/            # 前端界面（渲染进程）
│   │   ├── index.html       # HTML 入口
│   │   ├── index.tsx        # React/Vue 入口
│   │   ├── components/      # 可复用 UI 组件
│   │   ├── pages/           # 页面组件
│   │   ├── stores/          # 数据状态管理
│   │   └── styles/          # 样式文件
│   ├── shared/              # 主进程与渲染进程共享
│   │   ├── categories.ts    # 分类数据常量
│   │   └── types.ts         # 类型定义
│   └── assets/              # 静态资源（图标、图片）
├── tests/                   # 测试代码
└── scripts/                 # 构建/打包脚本
```

---

## 🐍 Conda 环境配置

本项目使用 Conda 环境管理 Node.js 版本，确保环境一致。

```bash
# 第一次使用：激活 conda 环境
conda activate heima-accounting

# 如果环境不存在，创建它：
conda create -n heima-accounting nodejs=20 -y
conda activate heima-accounting
npm install
```

## 🚀 开发命令

```bash
# 激活 conda 环境（每次开发前）
conda activate heima-accounting

# 安装依赖（首次或新增依赖后）
npm install

# 启动开发模式（自动打开应用窗口）
npm run dev

# 构建生产版本
npm run build

# 打包 Windows 安装程序
npm run package:win

# 打包 Mac 安装程序
npm run package:mac

# 打包全平台
npm run package:all
```

---

## 🎨 设计规范

### 语言与格式
- 所有用户界面文字：**简体中文**
- 金额显示格式：**¥36.50**（小数点后 2 位）
- 日期显示格式：**2026年08月06日**
- 金额内部计算：使用**分**（整数），避免浮点数精度问题

### 色彩参考
- 主色调：待确定（用于顶部标题栏和按钮）
- 每个一级分类一个独立颜色（用于图表和分类标签）
- 背景色：浅色主题（后续可加暗色主题）

### 字体
- 中文：系统默认中文字体
- 金额数字：等宽字体，方便对齐

---

## ⚠️ 已知问题与解决方案

### ELECTRON_RUN_AS_NODE 环境变量问题

**问题描述**：当系统环境变量中设置了 `ELECTRON_RUN_AS_NODE=1` 时，Electron 会被当作纯 Node.js 运行，导致 `require('electron')` 无法返回 Electron API（app、BrowserWindow 等）。

**表现**：运行 `npm run dev` 时报错：
```
TypeError: Cannot read properties of undefined (reading 'whenReady')
```

**原因**：`ELECTRON_RUN_AS_NODE=1` 使 Electron 的模块拦截机制失效，`require('electron')` 解析到 npm 包的路径字符串而非 Electron API 对象。

**解决方案**：本项目使用 `scripts/dev.js` 和 `scripts/build.js` 作为启动脚本，在脚本开头通过 `delete process.env.ELECTRON_RUN_AS_NODE` 清除该变量。

**根治**：检查并删除 shell 配置文件（如 `~/.bashrc`、`~/.bash_profile`）中的 `export ELECTRON_RUN_AS_NODE=1` 行。

### GPU 相关错误（仅限无显示器环境）

在无显示器的服务器环境中运行时，可能看到以下错误，这些是正常的，不影响应用功能：
```
ERROR:network_service_instance_impl.cc(601)] Network service crashed
ERROR:gpu_process_host.cc(993)] GPU process exited unexpectedly
```

---

## ⚠️ 约束条件

- ✅ 必须支持：Windows 10/11 + macOS 12+
- ✅ 完全离线可用，不依赖网络
- ✅ 无用户账号系统，无登录
- ✅ 所有数据存储在用户本地电脑
- ✅ 界面全中文，无英文
- ✅ 金额精确到分（小数点后 2 位）
- ✅ APP 安装包 < 200 MB

---

## 📝 编码规范

### 命名

| 类型 | 规则 | 示例 |
|------|------|------|
| 文件名 | 小写字母 + 连字符 | `expense-form.tsx` |
| 变量/函数 | 小驼峰 | `expenseAmount`, `getRecords()` |
| 组件/类 | 大驼峰 | `ExpenseForm`, `RecordList` |
| 常量 | 大写下划线 | `PRIMARY_CATEGORIES` |

### 代码风格
- 每个函数不超过 50 行
- 每个文件不超过 300 行
- 代码注释使用中文
- 使用 TypeScript（不用纯 JavaScript）

### Git 提交
- 提交信息用中文
- 格式：`[类型] 描述`
- 类型：`功能` `修复` `优化` `文档` `样式`

---

## 🔄 开发流程

```
用户确认需求 → 技术方案选择 → 编码实现 → 展示成果 → 用户验收 → 下一步
```

1. **需求确认**: 开发每个功能前，确认功能细节和期望效果
2. **技术方案**: 遇到技术选型，遵循「用户协作规则」
3. **编码实现**: 遵循编码规范，小步快跑
4. **功能验收**: 每完成一个功能，展示给用户确认
5. **迭代优化**: 根据反馈调整

---

## 🗺️ 开发路线图

> 每个阶段的完成状态：✅ 已完成 | 🔶 部分完成 | ⬜ 未开始

### 阶段 0：产品文档设计与技术选型 ✅

- [x] 产品需求文档 (PRODUCT.md)
- [x] 支出分类体系设计（10大类 + 40+小类）
- [x] 技术方案对比与选择（Electron + React + TypeScript）
- [x] 用户协作规则确立（所有技术决策由用户选择）

### 阶段 1：项目初始化 ✅

- [x] Conda 开发环境配置 (heima-accounting, Node.js 20)
- [x] Electron + React + TypeScript 工程骨架
- [x] electron-vite 构建工具配置
- [x] 主进程/渲染进程/Preload 基础搭建
- [x] 开发脚本 (scripts/dev.js, scripts/build.js)
- [x] 解决 ELECTRON_RUN_AS_NODE 环境变量问题
- [x] 应用窗口能成功启动

### 阶段 2：数据存储与分类管理 ✅

- [x] 支出分类数据定义 (categories.ts)
- [x] 数据模型定义 (types.ts)
- [x] **SQLite 数据库建表 (better-sqlite3)**
- [x] **主进程 IPC 数据读写通道**
- [x] **localStorage → SQLite 数据迁移**

### 阶段 3：记账功能开发 🔶

- [x] 支出金额输入（带格式校验）
- [x] 两级分类选择器（一级网格 + 二级联动）
- [x] 日期选择（默认今天）
- [x] 支付方式选择（5种预设）
- [x] 备注输入（最多200字）
- [x] 支出记录新增（自动保存）
- [x] 支出记录查看（按日期分组）
- [x] 支出记录编辑（弹窗表单）
- [x] 支出记录删除
- [x] 分类筛选（一级+二级联动）
- [x] **收入记录功能（支出/收入切换，5大收入分类）**

### 阶段 4：统计图表开发 ✅

- [x] 月度统计页面（概览卡片 + 柱状图 + 分类明细）
- [x] 月份切换浏览
- [x] **Recharts 饼图（分类占比环形图）**
- [x] **Recharts 折线图（每日消费趋势）**
- [ ] **年度统计汇总** ⬜ 待实现

### 阶段 5：数据导入导出 ✅

- [x] **数据导出为 CSV（原生保存对话框）**
- [x] **CSV 数据导入（原生打开对话框）**
- [ ] 数据备份功能（后续版本）

### 阶段 6：界面美化与交互优化 ✅

- [x] 基础 UI 布局（顶部栏 + 底部导航）
- [x] 表单交互（分类联动、支付方式选择）
- [x] 编辑弹窗动画
- [x] 筛选栏横向滚动
- [x] **删除确认对话框（防止误删）**
- [x] **分类颜色体系（列表圆点 + 选择器颜色标识）**
- [x] **页面切换过渡动画**
- [ ] **暗色主题支持**（后续版本）
- [ ] **应用图标设计**（当前为占位图标）

### 阶段 7：打包发布 ✅

- [x] electron-builder 配置验证
- [x] Windows 便携版 .exe 生成（74 MB，免安装直接运行 ✅ < 200 MB）
- [x] 安装包大小检查通过
- [ ] macOS .dmg 安装程序生成（需要在 Mac 上操作）
- [ ] 应用图标设计（当前为紫色占位图标）

