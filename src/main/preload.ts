import { contextBridge, ipcRenderer } from 'electron'
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseRecord } from '../shared/types'

/**
 * Preload 脚本
 * 通过 contextBridge 安全地暴露 API 给渲染进程
 *
 * 渲染进程只能调用这里暴露的方法，无法直接访问 Node.js 或 Electron API
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // 平台信息
  platform: process.platform,

  // ===== 支出记录操作 =====

  /** 获取所有支出记录 */
  getAllExpenses: (): Promise<ExpenseRecord[]> => {
    return ipcRenderer.invoke('expense:getAll')
  },

  /** 添加一条支出记录 */
  addExpense: (input: CreateExpenseInput): Promise<ExpenseRecord> => {
    return ipcRenderer.invoke('expense:add', input)
  },

  /** 更新一条支出记录 */
  updateExpense: (id: string, input: UpdateExpenseInput): Promise<ExpenseRecord | null> => {
    return ipcRenderer.invoke('expense:update', id, input)
  },

  /** 删除一条支出记录 */
  deleteExpense: (id: string): Promise<boolean> => {
    return ipcRenderer.invoke('expense:delete', id)
  },

  /** 获取某月总支出（单位：分） */
  getMonthTotal: (year: number, month: number): Promise<number> => {
    return ipcRenderer.invoke('expense:getMonthTotal', year, month)
  },

  /** 导出数据为 CSV 文件 */
  exportCsv: (): Promise<{ success: boolean; message: string }> => {
    return ipcRenderer.invoke('export:csv')
  },

  /** 从 CSV 文件导入数据 */
  importCsv: (): Promise<{ success: boolean; message: string; count?: number }> => {
    return ipcRenderer.invoke('import:csv')
  },

  /** 清空所有记账记录 */
  clearAll: (): Promise<number> => {
    return ipcRenderer.invoke('expense:clearAll')
  }
})
