---
name: unit-test
description: 创建单元测试、执行测试并生成测试报告
---

# 单元测试

为项目代码创建单元测试，运行测试，并生成测试报告。

**测试框架**：Vitest（与项目 Vite 构建工具天生配套）

---

## 执行步骤

### 步骤 1：配置 Vitest 环境

检查项目中是否已安装 Vitest。如果未安装，执行：

```bash
npm install -D vitest @types/node
```

然后检查 `vitest.config.ts` 是否存在。如果不存在，创建配置文件：

```typescript
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // 测试文件匹配规则
    include: ['tests/**/*.test.ts'],
    // 使用 node 环境（不需要浏览器 DOM）
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
```

最后在 `package.json` 中添加 test 脚本（如果没有的话）：
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

### 步骤 2：分析要测试的代码

扫描 `src/shared/` 和 `src/main/` 目录，找出**可以被测试的函数和工具**。

**优先测试**（纯函数，不依赖 Electron）：
- 分类数据查询函数（`getPrimaryCategory`、`getSubCategory` 等）
- 数据转换函数
- 工具函数

**需要 Mock 才能测试**（依赖 Electron API 或 SQLite）：
- 主进程 IPC 处理函数
- 数据库操作函数

**不适合单元测试**：
- React 组件（需要浏览器环境，后续可加）
- 简单的数据常量定义

### 步骤 3：创建测试文件

在 `tests/` 目录下创建测试文件。每个源文件对应一个测试文件：

```
tests/
├── categories.test.ts     # 测试分类查询函数
├── database.test.ts       # 测试数据库操作（Mock）
└── ipc-handlers.test.ts   # 测试 IPC 函数（Mock）
```

**测试文件命名规范**：`{模块名}.test.ts`

**每个测试文件的结构**：
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('模块名称', () => {
  // 正常情况
  it('应该正确返回结果（正常输入）', () => {
    const result = ... // 调用被测函数
    expect(result).toBe(...) // 验证结果
  })

  // 边界情况
  it('应该处理空值', () => { ... })
  it('应该处理不存在的 key', () => { ... })

  // 错误情况
  it('应该处理异常输入', () => { ... })
})
```

**本项目的具体测试内容**：

#### 1. `tests/categories.test.ts` — 分类查询函数

测试以下函数：

| 函数 | 测试要点 |
|------|---------|
| `getCategoriesByType('expense')` | 返回支出 10 大类 |
| `getCategoriesByType('income')` | 返回收入 5 大类 |
| `getPrimaryCategory('food')` | 查找到"餐饮饮食" |
| `getPrimaryCategory('not_exist')` | 返回 undefined |
| `getSubCategory('food', 'takeout')` | 查找到"外卖外送" |
| `getSubCategory('food', 'not_exist')` | 返回 undefined |
| `getCategoryColor('food')` | 返回颜色 `#F97316` |
| `getCategoryColor('unknown')` | 返回默认灰色 `#6B7280` |
| `getCategoryDisplay('food', 'takeout')` | 返回"餐饮饮食 > 外卖外送" |
| `mergeCategories()` | 用户分类正确合并到预设中 |
| `isUserCategoryKey('user_xxx')` | 返回 true |
| `isUserCategoryKey('food')` | 返回 false |

#### 2. `tests/database.test.ts` — 数据库操作

测试以下函数（需要用 Mock 模拟 SQLite）：

| 函数 | 测试要点 |
|------|---------|
| `getAllExpenses()` | 返回记录列表 |
| `addExpense(input)` | 新增记录成功，返回完整记录 |
| `updateExpense(id, input)` | 更新记录成功 |
| `updateExpense('bad_id', input)` | 返回 null |
| `deleteExpense(id)` | 删除成功返回 true |
| `deleteExpense('bad_id')` | 返回 false |
| `getMonthTotal(2026, 8)` | 返回正确月份总额 |
| `clearAllExpenses()` | 清空成功 |

### 步骤 4：执行测试

```bash
npm test
```

或者使用 npx 直接运行：
```bash
npx vitest run --reporter=verbose
```

如果只跑某个测试文件：
```bash
npx vitest run tests/categories.test.ts
```

### 步骤 5：生成测试报告

根据 Vitest 的输出，整理测试报告：

## 📊 测试报告

| 项目 | 结果 |
|------|------|
| 测试文件数 | X 个 |
| 测试用例数 | X 条 |
| 通过 | X 条 ✅ |
| 失败 | X 条 ❌ |
| 通过率 | XX% |

### 通过的测试 ✅
（列出所有通过的测试名称）

### 失败的测试 ❌
（列出失败的测试，附错误原因和修复建议）

### 未覆盖的代码 ⚠️
（指出哪些文件还没有测试，建议后续补充）

---

## 重要补充

### Vitest 是什么

- Vitest 是为 Vite 项目设计的测试工具，和本项目天生配套
- 配置极简，几乎不需要额外设置
- 语法和 Jest 兼容，学习成本低
- 支持 TypeScript，无需额外配置

### 测试文件放在哪里

- 测试文件统一放在 `tests/` 目录下
- 文件名格式：`{被测模块名}.test.ts`
- 每个源文件对应一个测试文件，一一对应

### 什么时候写测试

- 新增工具函数后，立即写测试
- 修复 Bug 后，补一个测试防止复发
- 不需要给每种代码都写测试（比如简单的类型定义）

### 跳过某些测试

如果某条测试暂时无法通过（如依赖 Electron API），可以用 `it.skip` 跳过：
```typescript
it.skip('暂时跳过的测试', () => { ... })
```

---

## 常见问题

### Q1: Vitest 报 "Cannot find module"

**原因**：依赖未安装。

**解决**：
```bash
npm install
```

### Q2: 报 "electron" 或 "better-sqlite3" 找不到

**原因**：测试文件中引用了 Electron 主进程的模块，需要 Mock。

**解决**：在测试文件顶部添加 Mock：
```typescript
import { vi } from 'vitest'
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp/test-data') }
}))
vi.mock('better-sqlite3', () => {
  return { default: vi.fn() }
})
```

### Q3: 测试通过了但代码有 Bug？

**原因**：测试可能没覆盖到 Bug 所在的情况。

**解决**：针对 Bug 补充一条专门测试，确保它被覆盖到。

### Q4: 不想运行全部测试，只想测一个文件？

```bash
npx vitest run tests/categories.test.ts
```
