/**
 * IPC 通信处理模块
 *
 * 架构：渲染进程 ←→ (preload 桥接) ←→ 主进程 ←→ SQLite
 */
import { ipcMain, dialog } from 'electron'
import { writeFileSync, readFileSync } from 'fs'
import {
  getAllExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  clearAllExpenses,
  getMonthTotal,
  getUserCategories,
  addUserCategory,
  updateUserCategory,
  deleteUserCategory
} from './database'
import { getCategoryDisplay, PRIMARY_CATEGORIES, INCOME_CATEGORIES } from '../shared/categories'
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseRecord, PaymentMethod, RecordType, CreateUserCategoryInput, UpdateUserCategoryInput, UserCategory } from '../shared/types'

/** 注册所有 IPC 处理器 */
export function registerIpcHandlers(): void {
  // 获取所有记录
  ipcMain.handle('expense:getAll', async (): Promise<ExpenseRecord[]> => {
    return getAllExpenses()
  })

  // 添加记录
  ipcMain.handle('expense:add', async (_event, input: CreateExpenseInput): Promise<ExpenseRecord> => {
    return addExpense(input)
  })

  // 更新记录
  ipcMain.handle('expense:update', async (_event, id: string, input: UpdateExpenseInput): Promise<ExpenseRecord | null> => {
    return updateExpense(id, input)
  })

  // 删除记录
  ipcMain.handle('expense:delete', async (_event, id: string): Promise<boolean> => {
    return deleteExpense(id)
  })

  // 获取月度总支出
  ipcMain.handle('expense:getMonthTotal', async (_event, year: number, month: number): Promise<number> => {
    return getMonthTotal(year, month)
  })

  // 清空所有记录
  ipcMain.handle('expense:clearAll', async (): Promise<number> => {
    return clearAllExpenses()
  })

  // ===== 用户自定义分类 =====

  ipcMain.handle('category:getAll', async (): Promise<UserCategory[]> => {
    return getUserCategories()
  })

  ipcMain.handle('category:add', async (_event, input: CreateUserCategoryInput): Promise<UserCategory> => {
    return addUserCategory(input)
  })

  ipcMain.handle('category:update', async (_event, id: string, input: UpdateUserCategoryInput): Promise<UserCategory | null> => {
    // 保护：只允许修改用户创建的分类（id 以 user_ 开头）
    if (!id.startsWith('user_')) return null
    return updateUserCategory(id, input)
  })

  ipcMain.handle('category:delete', async (_event, id: string): Promise<boolean> => {
    // 保护：只允许删除用户创建的分类（id 以 user_ 开头）
    if (!id.startsWith('user_')) return false
    return deleteUserCategory(id)
  })

  // ===== CSV 导出 =====

  ipcMain.handle('export:csv', async (): Promise<{ success: boolean; message: string }> => {
    try {
      const records = getAllExpenses()
      if (records.length === 0) {
        return { success: false, message: '没有可导出的记录' }
      }

      // 打开原生保存对话框
      const result = await dialog.showSaveDialog({
        title: '导出账单数据',
        defaultPath: `黑马记账_导出_${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [
          { name: 'CSV 文件', extensions: ['csv'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, message: '已取消导出' }
      }

      // 生成 CSV 内容
      const csvContent = generateCsv(records)

      // 写入文件
      writeFileSync(result.filePath, '﻿' + csvContent, 'utf-8') // BOM 确保 Excel 正确识别中文

      return { success: true, message: `成功导出 ${records.length} 条记录` }
    } catch (err: any) {
      return { success: false, message: `导出失败：${err.message}` }
    }
  })

  // ===== CSV 导入 =====

  ipcMain.handle('import:csv', async (): Promise<{ success: boolean; message: string; count?: number }> => {
    try {
      const result = await dialog.showOpenDialog({
        title: '导入账单数据',
        filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: '已取消导入' }
      }

      const filePath = result.filePaths[0]
      const content = readFileSync(filePath, 'utf-8')

      // 去掉 BOM 头
      const cleanContent = content.replace(/^﻿/, '')

      // 解析 CSV
      const records = parseCsv(cleanContent)
      if (records.length === 0) {
        return { success: false, message: '文件中没有找到有效记录' }
      }

      // 逐条插入数据库
      let imported = 0
      for (const rec of records) {
        try {
          addExpense(rec)
          imported++
        } catch {
          // 跳过解析失败的行
        }
      }

      return { success: true, message: `成功导入 ${imported} 条记录`, count: imported }
    } catch (err: any) {
      return { success: false, message: `导入失败：${err.message}` }
    }
  })
}

/** 将支出记录转为 CSV 字符串 */
function generateCsv(records: ExpenseRecord[]): string {
  // CSV 表头
  const headers = ['类型', '日期', '金额（元）', '一级分类', '二级分类', '分类', '支付方式', '备注']

  // 数据行
  const rows = records.map(r => {
    const typeLabel = r.type === 'income' ? '收入' : '支出'
    const amount = (r.type === 'income' ? '+' : '-') + (r.amount / 100).toFixed(2)
    const primary = getCategoryDisplay(r.primaryCategory, r.secondaryCategory).split(' > ')[0] || ''
    const secondary = getCategoryDisplay(r.primaryCategory, r.secondaryCategory).split(' > ')[1] || ''
    const category = `${primary} > ${secondary}`
    const payment = paymentLabel(r.paymentMethod)
    // CSV 转义
    const note = escapeCsvField(r.note)
    return [typeLabel, r.date, amount, primary, secondary, category, payment, note]
  })

  return [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')
}

function paymentLabel(key: string): string {
  const map: Record<string, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
    bank_card: '银行卡',
    cash: '现金',
    other: '其他'
  }
  return map[key] || key
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** 解析 CSV 内容，返回 CreateExpenseInput 数组 */
function parseCsv(content: string): CreateExpenseInput[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  // 解析表头，确定列索引
  const header = lines[0].split(',')
  const colMap: Record<string, number> = {}
  header.forEach((h, i) => { colMap[h.trim()] = i })

  // 确定金额列（兼容有/无"类型"列的CSV）
  const typeCol = colMap['类型'] ?? -1
  const amountCol = colMap['金额（元）'] ?? (typeCol >= 0 ? 2 : 1)
  const dateCol = colMap['日期'] ?? (typeCol >= 0 ? 1 : 0)
  const primaryCol = colMap['一级分类'] ?? (typeCol >= 0 ? 3 : 2)
  const secondaryCol = colMap['二级分类'] ?? (typeCol >= 0 ? 4 : 3)
  const noteCol = colMap['备注'] ?? (typeCol >= 0 ? 7 : 6)
  const paymentCol = colMap['支付方式'] ?? (typeCol >= 0 ? 6 : 5)

  // 反向支付方式映射
  const paymentReverse: Record<string, string> = {
    '微信支付': 'wechat',
    '支付宝': 'alipay',
    '银行卡': 'bank_card',
    '现金': 'cash',
    '其他': 'other'
  }

  // 分类 key 映射（从 label 反查 key）
  const primaryKeyMap = buildKeyMap()

  const records: CreateExpenseInput[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    if (cols.length < 3) continue

    const typeStr = typeCol >= 0 ? cols[typeCol]?.trim() : ''
    const amountStr = (cols[amountCol]?.trim() || '').replace(/^[+-]/, '')
    const dateStr = cols[dateCol]?.trim()
    const primaryLabel = cols[primaryCol]?.trim()
    const secondaryLabel = cols[secondaryCol]?.trim()
    const noteStr = cols[noteCol]?.trim() || ''
    const paymentStr = cols[paymentCol]?.trim() || ''

    const recordType: RecordType = typeStr === '收入' ? 'income' : 'expense'
    const allCats = [...PRIMARY_CATEGORIES, ...INCOME_CATEGORIES]

    // 金额解析（去掉可能的前缀符号）
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) continue

    // 日期验证
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue

    // 分类查找
    const primaryKey = primaryKeyMap[primaryLabel]
    if (!primaryKey) continue

    const secondaryKey = findSecondaryKey(primaryKey, secondaryLabel)
    if (!secondaryKey) {
      const cat = allCats.find(c => c.key === primaryKey)
      if (!cat) continue
    }

    const secKey = secondaryKey || (allCats.find(c => c.key === primaryKey)?.children[0].key)
    if (!secKey) continue

    records.push({
      type: recordType,
      amount: Math.round(amount * 100),
      primaryCategory: primaryKey,
      secondaryCategory: secKey,
      date: dateStr,
      note: noteStr,
      paymentMethod: (paymentReverse[paymentStr] || 'wechat') as PaymentMethod
    })
  }

  return records
}

/** 解析 CSV 的一行（处理引号内的逗号） */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

/** 构建中文 label → key 的映射（包含支出和收入分类 + 用户自定义分类） */
function buildKeyMap(): Record<string, string> {
  const map: Record<string, string> = {}
  // 预置分类
  for (const cat of [...PRIMARY_CATEGORIES, ...INCOME_CATEGORIES]) {
    map[cat.label] = cat.key
  }
  // 用户自定义分类（只在有数据库连接时）
  try {
    const { getUserCategories } = require('./database')
    const userCats = getUserCategories()
    for (const uc of userCats) {
      if (uc.parentKey === null) {
        map[uc.label] = uc.key
      }
    }
  } catch { /* 忽略 */ }
  return map
}

/** 根据中文 label 查找二级分类的 key（含用户自定义分类） */
function findSecondaryKey(primaryKey: string, secondaryLabel: string): string | undefined {
  // 先查预置分类
  let allCats = [...PRIMARY_CATEGORIES, ...INCOME_CATEGORIES]
  // 合并用户一级分类（只在有数据库连接时）
  try {
    const { getUserCategories } = require('./database')
    const userCats = getUserCategories()
    const userPrimaries = userCats.filter((c: any) => c.parentKey === null)
    allCats = [...allCats, ...userPrimaries.map((c: any) => ({ key: c.key, label: c.label, children: [] }))]
    // 找二级分类时也包含用户二级分类
    const cat = allCats.find(c => c.key === primaryKey)
    if (cat) {
      const userSubs = userCats.filter((c: any) => c.parentKey === primaryKey)
      const sub = [...(cat.children || []), ...userSubs.map((c: any) => ({ key: c.key, label: c.label }))]
        .find((s: any) => s.label === secondaryLabel)
      if (sub) return sub.key
    }
  } catch { /* 忽略 */ }

  const cat = allCats.find(c => c.key === primaryKey)
  if (!cat) return undefined
  const sub = cat.children.find(s => s.label === secondaryLabel)
  return sub?.key
}
