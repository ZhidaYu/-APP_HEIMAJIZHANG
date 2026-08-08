/**
 * 数据库操作 单元测试
 * 测试 src/main/database.ts 中的 CRUD 函数
 * 使用 Mock 模拟 Electron 和 better-sqlite3，不依赖真实数据库
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============ Mock 设置 ============

// 必须在 import 被测模块之前 Mock，因为 database.ts 顶层会调用 app.getPath
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-heima-data'),
  },
}))

// Mock better-sqlite3
const mockDb = {
  pragma: vi.fn(() => []),        // 返回空数组，让 some() 不报错
  exec: vi.fn(),
  prepare: vi.fn(),
  close: vi.fn(),
}

vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn(function () { return mockDb }),
  }
})

// 现在可以安全 import 被测模块了
import {
  getDatabase,
  closeDatabase,
  getAllExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  clearAllExpenses,
  getMonthTotal,
  getUserCategories,
  addUserCategory,
  deleteUserCategory,
} from '../src/main/database'

// ============ 辅助函数 ============

/** 创建一条 Mock 数据库行数据 */
function mockRow(overrides: Record<string, any> = {}): any {
  return {
    id: 'test-id-001',
    type: 'expense',
    amount: 3650,
    primary_category: 'food',
    secondary_category: 'takeout',
    date: '2026-08-08',
    note: '午餐',
    payment_method: 'wechat',
    created_at: '2026-08-08T12:00:00.000Z',
    updated_at: '2026-08-08T12:00:00.000Z',
    ...overrides,
  }
}

/** 设置 Mock prepare 链式调用 */
function mockPrepareChain(returnValue: any) {
  const mockStatement = {
    run: vi.fn(() => ({ changes: 1 })),
    get: vi.fn(() => returnValue),
    all: vi.fn(() => (Array.isArray(returnValue) ? returnValue : [returnValue])),
  }
  mockDb.prepare.mockReturnValue(mockStatement)
  return mockStatement
}

// ============ 测试 ============

describe('getDatabase', () => {
  beforeEach(() => {
    // 重置 mock
    vi.clearAllMocks()
    // 先关闭之前的连接，让 getDatabase 重新初始化
    try { closeDatabase() } catch (e) { /* 忽略 */ }
  })

  it('第一次调用 → 创建数据库连接并建表', () => {
    const db = getDatabase()
    expect(db).toBeDefined()
    // 应该调用 pragma 设置 WAL 模式
    expect(mockDb.pragma).toHaveBeenCalledWith('journal_mode = WAL')
    // 应该执行建表 SQL
    expect(mockDb.exec).toHaveBeenCalled()
  })

  it('第二次调用 → 复用已有连接', () => {
    const db1 = getDatabase()
    const db2 = getDatabase()
    expect(db1).toBe(db2)
  })
})

describe('addExpense', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try { closeDatabase() } catch (e) { /* 忽略 */ }
  })

  it('新增一条支出 → 返回完整记录', () => {
    mockPrepareChain(null)

    const input = {
      amount: 5000,
      primaryCategory: 'food',
      secondaryCategory: 'meal_daily',
      date: '2026-08-08',
      note: '早餐',
      paymentMethod: 'wechat' as const,
    }

    const result = addExpense(input)

    expect(result).toBeDefined()
    expect(result.amount).toBe(5000)
    expect(result.primaryCategory).toBe('food')
    expect(result.secondaryCategory).toBe('meal_daily')
    expect(result.date).toBe('2026-08-08')
    expect(result.note).toBe('早餐')
    expect(result.paymentMethod).toBe('wechat')
    expect(result.type).toBe('expense') // 默认支出
    expect(result.id).toBeDefined()
    expect(result.id.length).toBeGreaterThan(0)
  })

  it('新增一条收入记录', () => {
    mockPrepareChain(null)

    const input = {
      type: 'income' as const,
      amount: 100000,
      primaryCategory: 'salary',
      secondaryCategory: 'monthly_salary',
      date: '2026-08-01',
    }

    const result = addExpense(input)
    expect(result.type).toBe('income')
    expect(result.amount).toBe(100000)
  })

  it('不传 paymentMethod → 默认 wechat', () => {
    mockPrepareChain(null)

    const input = {
      amount: 1000,
      primaryCategory: 'entertainment',
      secondaryCategory: 'movie_show',
      date: '2026-08-08',
    }

    const result = addExpense(input)
    expect(result.paymentMethod).toBe('wechat')
  })

  it('不传 note → 默认空字符串', () => {
    mockPrepareChain(null)

    const input = {
      amount: 1000,
      primaryCategory: 'entertainment',
      secondaryCategory: 'movie_show',
      date: '2026-08-08',
    }

    const result = addExpense(input)
    expect(result.note).toBe('')
  })
})

describe('updateExpense', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try { closeDatabase() } catch (e) { /* 忽略 */ }
  })

  it('更新金额 → 成功返回更新后的记录', () => {
    mockPrepareChain(mockRow({ amount: 9999 }))

    const result = updateExpense('test-id-001', { amount: 9999 })
    expect(result).toBeDefined()
    expect(result!.amount).toBe(9999)
  })

  it('更新不存在的 ID → 返回 null', () => {
    mockDb.prepare.mockImplementation((sql: string) => {
      // 第一个 prepare 是 UPDATE，第二个是 SELECT
      return {
        run: vi.fn(() => ({ changes: 0 })),
        get: vi.fn(() => null), // SELECT 返回 null
      }
    })

    const result = updateExpense('bad-id', { amount: 100 })
    expect(result).toBeNull()
  })

  it('不传任何更新字段 → 只更新 updatedAt', () => {
    mockPrepareChain(mockRow())

    const result = updateExpense('test-id-001', {})
    expect(result).toBeDefined()
  })

  it('更新多个字段 → 全部生效', () => {
    mockPrepareChain(mockRow({
      amount: 8888,
      primary_category: 'shopping',
      secondary_category: 'clothing',
      note: '新衣服',
    }))

    const result = updateExpense('test-id-001', {
      amount: 8888,
      primaryCategory: 'shopping',
      secondaryCategory: 'clothing',
      note: '新衣服',
    })
    expect(result!.amount).toBe(8888)
    expect(result!.primaryCategory).toBe('shopping')
    expect(result!.note).toBe('新衣服')
  })
})

describe('deleteExpense', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try { closeDatabase() } catch (e) { /* 忽略 */ }
  })

  it('删除存在的记录 → 返回 true', () => {
    mockDb.prepare.mockReturnValue({
      run: vi.fn(() => ({ changes: 1 })),
    })

    const result = deleteExpense('test-id-001')
    expect(result).toBe(true)
  })

  it('删除不存在的记录 → 返回 false', () => {
    mockDb.prepare.mockReturnValue({
      run: vi.fn(() => ({ changes: 0 })),
    })

    const result = deleteExpense('bad-id')
    expect(result).toBe(false)
  })
})

describe('getMonthTotal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try { closeDatabase() } catch (e) { /* 忽略 */ }
  })

  it('返回指定月份的总额', () => {
    mockDb.prepare.mockReturnValue({
      get: vi.fn(() => ({ total: 123456 })),
    })

    const total = getMonthTotal(2026, 8)
    expect(total).toBe(123456)
  })

  it('可以按类型筛选（仅支出）', () => {
    mockDb.prepare.mockReturnValue({
      get: vi.fn(() => ({ total: 50000 })),
    })

    const total = getMonthTotal(2026, 8, 'expense')
    expect(total).toBe(50000)
  })
})

describe('clearAllExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try { closeDatabase() } catch (e) { /* 忽略 */ }
  })

  it('清空全部记录 → 返回删除数量', () => {
    mockDb.prepare.mockReturnValue({
      run: vi.fn(() => ({ changes: 42 })),
    })

    const count = clearAllExpenses()
    expect(count).toBe(42)
  })
})

describe('getUserCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try { closeDatabase() } catch (e) { /* 忽略 */ }
  })

  it('返回用户自定义分类列表', () => {
    mockDb.prepare.mockReturnValue({
      all: vi.fn(() => [
        {
          id: '1', type: 'expense', parent_key: null,
          key: 'user_hobby', label: '兴趣爱好', icon: '🎨',
          created_at: '2026-01-01',
        },
      ]),
    })

    const cats = getUserCategories()
    expect(cats).toHaveLength(1)
    expect(cats[0].key).toBe('user_hobby')
    expect(cats[0].label).toBe('兴趣爱好')
  })

  it('没有自定义分类 → 返回空数组', () => {
    mockDb.prepare.mockReturnValue({
      all: vi.fn(() => []),
    })

    const cats = getUserCategories()
    expect(cats).toEqual([])
  })
})
