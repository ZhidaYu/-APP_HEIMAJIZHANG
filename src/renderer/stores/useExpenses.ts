import { useState, useEffect, useCallback } from 'react'
import type { ExpenseRecord, CreateExpenseInput, UpdateExpenseInput, UserCategory, CreateUserCategoryInput, UpdateUserCategoryInput, RecordType } from '../../shared/types'
import { getCategoryDisplay, mergeCategories, PRIMARY_CATEGORIES, INCOME_CATEGORIES } from '../../shared/categories'
import type { PrimaryCategory } from '../../shared/types'

/**
 * 支出记录管理 Hook
 *
 * 通过 IPC 与主进程通信，主进程操作 SQLite 数据库
 * 首次加载时自动迁移 localStorage 中的旧数据
 */
export function useExpenses() {
  const [records, setRecords] = useState<ExpenseRecord[]>([])
  const [userCategories, setUserCategories] = useState<UserCategory[]>([])
  const [loading, setLoading] = useState(true)

  // 加载用户自定义分类
  const loadUserCategories = useCallback(async () => {
    try {
      const cats = await window.electronAPI.getUserCategories()
      setUserCategories(cats)
    } catch (err) {
      console.error('加载用户分类失败:', err)
    }
  }, [])

  // 初始化：从数据库加载记录，并迁移旧数据
  const loadRecords = useCallback(async () => {
    try {
      const data = await window.electronAPI.getAllExpenses()
      setRecords(data)
    } catch (err) {
      console.error('加载数据失败:', err)
    }
  }, [])

  useEffect(() => {
    async function init() {
      try {
        // 1. 迁移 localStorage 旧数据（如果存在）
        await migrateOldData()
        // 2. 从 SQLite 数据库加载
        await loadRecords()
        // 3. 加载用户自定义分类
        await loadUserCategories()
      } catch (err) {
        console.error('初始化数据失败:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [loadRecords, loadUserCategories])

  /** 添加一笔支出 */
  const addExpense = useCallback(async (input: CreateExpenseInput): Promise<ExpenseRecord | null> => {
    try {
      const record = await window.electronAPI.addExpense(input)
      setRecords(prev => [record, ...prev])
      return record
    } catch (err) {
      console.error('添加记录失败:', err)
      return null
    }
  }, [])

  /** 删除一笔支出 */
  const deleteExpense = useCallback(async (id: string) => {
    try {
      await window.electronAPI.deleteExpense(id)
      setRecords(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error('删除记录失败:', err)
    }
  }, [])

  /** 更新一笔支出 */
  const updateExpense = useCallback(async (id: string, input: UpdateExpenseInput) => {
    try {
      const updated = await window.electronAPI.updateExpense(id, input)
      if (updated) {
        setRecords(prev => prev.map(r => r.id === id ? updated : r))
      }
    } catch (err) {
      console.error('更新记录失败:', err)
    }
  }, [])

  // ===== 查询辅助 =====

  /** 按一级分类筛选 */
  const filterByPrimary = useCallback((primaryKey: string): ExpenseRecord[] => {
    if (!primaryKey) return records
    return records.filter(r => r.primaryCategory === primaryKey)
  }, [records])

  /** 获取某月总支出（单位：分） */
  const getMonthTotal = useCallback(async (year: number, month: number): Promise<number> => {
    try {
      return await window.electronAPI.getMonthTotal(year, month)
    } catch {
      // 降级：本地计算
      const prefix = `${year}-${String(month).padStart(2, '0')}`
      return records
        .filter(r => r.date.startsWith(prefix))
        .reduce((sum, r) => sum + r.amount, 0)
    }
  }, [records])

  // ===== 用户自定义分类操作 =====

  /** 新增用户分类 */
  const addUserCategoryFn = useCallback(async (input: CreateUserCategoryInput): Promise<UserCategory | null> => {
    try {
      const cat = await window.electronAPI.addUserCategory(input)
      setUserCategories(prev => [...prev, cat])
      return cat
    } catch (err) {
      console.error('添加用户分类失败:', err)
      return null
    }
  }, [])

  /** 更新用户分类 */
  const updateUserCategoryFn = useCallback(async (id: string, input: UpdateUserCategoryInput): Promise<UserCategory | null> => {
    try {
      const updated = await window.electronAPI.updateUserCategory(id, input)
      if (updated) {
        setUserCategories(prev => prev.map(c => c.id === id ? updated : c))
      }
      return updated
    } catch (err) {
      console.error('更新用户分类失败:', err)
      return null
    }
  }, [])

  /** 删除用户分类 */
  const deleteUserCategoryFn = useCallback(async (id: string): Promise<boolean> => {
    try {
      const ok = await window.electronAPI.deleteUserCategory(id)
      if (ok) {
        setUserCategories(prev => prev.filter(c => c.id !== id))
      }
      return ok
    } catch (err) {
      console.error('删除用户分类失败:', err)
      return false
    }
  }, [])

  /** 获取合并后的分类列表（预设 + 用户自定义） */
  const getMergedCategories = useCallback((type: RecordType): PrimaryCategory[] => {
    const presets = type === 'expense' ? PRIMARY_CATEGORIES : INCOME_CATEGORIES
    const filtered = userCategories.filter(c => c.type === type)
    return mergeCategories(presets, filtered)
  }, [userCategories])

  /** 格式化金额显示 */
  const formatAmount = useCallback((amountInCents: number): string => {
    return `¥${(amountInCents / 100).toFixed(2)}`
  }, [])

  /** 获取分类显示文字 */
  const getCategoryLabel = useCallback((primaryKey: string, subKey: string): string => {
    return getCategoryDisplay(primaryKey, subKey)
  }, [])

  return {
    records,
    userCategories,
    loading,
    addExpense,
    deleteExpense,
    updateExpense,
    refreshRecords: loadRecords,
    filterByPrimary,
    getMonthTotal,
    formatAmount,
    getCategoryLabel,
    addUserCategory: addUserCategoryFn,
    updateUserCategory: updateUserCategoryFn,
    deleteUserCategory: deleteUserCategoryFn,
    getMergedCategories,
    refreshUserCategories: loadUserCategories
  }
}

// ============ 数据迁移 ============

const MIGRATION_FLAG = 'heima-sqlite-migrated'

/** 将 localStorage 中的旧数据迁移到 SQLite */
async function migrateOldData(): Promise<void> {
  // 如果已经迁移过，跳过
  if (localStorage.getItem(MIGRATION_FLAG)) return

  const oldData = localStorage.getItem('heima-expenses')
  if (!oldData) {
    // 没有旧数据，标记完成
    localStorage.setItem(MIGRATION_FLAG, '1')
    return
  }

  try {
    const oldRecords: ExpenseRecord[] = JSON.parse(oldData)
    if (oldRecords.length === 0) {
      localStorage.setItem(MIGRATION_FLAG, '1')
      return
    }

    // 逐条迁移（旧数据先反转，保持时间顺序）
    for (const record of oldRecords.reverse()) {
      await window.electronAPI.addExpense({
        amount: record.amount,
        primaryCategory: record.primaryCategory,
        secondaryCategory: record.secondaryCategory,
        date: record.date,
        note: record.note,
        paymentMethod: record.paymentMethod
      })
    }

    // 迁移成功，清除旧数据并标记
    localStorage.removeItem('heima-expenses')
    localStorage.setItem(MIGRATION_FLAG, '1')
    console.log(`已迁移 ${oldRecords.length} 条旧记录到 SQLite`)
  } catch (err) {
    console.error('数据迁移失败:', err)
    // 迁移失败不标记，下次再试
  }
}
