/**
 * IPC 通信处理模块
 *
 * "IPC" 是 Inter-Process Communication 的缩写，翻译过来就是"进程间通信"。
 *
 * 用生活类比理解：
 * Electron 应用有两层——主进程（后台大管家，管数据库、管文件、管窗口）
 * 和渲染进程（前台服务员，管界面、管用户交互）。
 * 这两层不能直接对话（安全限制），需要一部"电话"来传话。
 *
 * IPC 就是这部电话。渲染进程拨号 → 主进程接听 → 处理 → 回话。
 *
 * 数据流向：
 * 用户在界面上操作 → 渲染进程（React 组件）
 *                    → preload 桥（安全中转，只传允许的消息）
 *                    → 主进程 IPC handler（这里的函数）
 *                    → SQLite 数据库
 *                    → 结果沿原路返回
 *
 * 安全说明：
 * - 本文件中的每个 handler 都是"接电话的人"，只处理特定的来电
 * - CSV 导出中的文件路径来自原生保存对话框（用户自己选的），不是来自用户输入
 * - CSV 导入对每条数据做了多层验证（金额格式、日期格式、分类白名单匹配）
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
import { generateCsv, parseCsv } from './ipc-csv'

/**
 * 注册所有 IPC 处理器（"把所有电话线接好"）
 *
 * 每个 ipcMain.handle(...) 就相当于一个分机号码：
 * - 'expense:getAll'  → 前端说 "给我所有账单"
 * - 'expense:add'     → 前端说 "帮我记一笔账"
 * - 'export:csv'      → 前端说 "帮我把账单导出成 Excel 能打开的文件"
 *
 * 命名规范：模块名:操作名（如 expense:add、category:delete）
 */
export function registerIpcHandlers(): void {

  // ===== 记账记录基本操作（增删改查）=====

  /**
   * 获取全部记账记录
   * 前端打开应用时或切换筛选条件时调用，拿到所有数据后在前端做筛选和排序
   */
  ipcMain.handle('expense:getAll', async (): Promise<ExpenseRecord[]> => {
    return getAllExpenses()
  })

  /**
   * 新增一条记账记录
   * 前端用户填写完表单点"保存"时调用
   */
  ipcMain.handle('expense:add', async (_event, input: CreateExpenseInput): Promise<ExpenseRecord> => {
    return addExpense(input)
  })

  /**
   * 修改一条已有的记账记录
   * 前端用户在编辑弹窗中修改后点"保存"时调用
   */
  ipcMain.handle('expense:update', async (_event, id: string, input: UpdateExpenseInput): Promise<ExpenseRecord | null> => {
    return updateExpense(id, input)
  })

  /**
   * 删除一条记账记录
   * 前端用户确认删除后调用。返回 true 表示删成功了。
   */
  ipcMain.handle('expense:delete', async (_event, id: string): Promise<boolean> => {
    return deleteExpense(id)
  })

  /**
   * 获取某个月的总支出
   * 前端统计页面显示月度汇总数字时调用
   */
  ipcMain.handle('expense:getMonthTotal', async (_event, year: number, month: number): Promise<number> => {
    return getMonthTotal(year, month, 'expense')
  })

  /**
   * 清空所有记账记录（危险操作！）
   *
   * 前端调用前必须先弹出确认对话框。
   * 后端（这里）没有再做二次确认，设计上是把确认责任放在前端，
   * 因为对话框是 UI 层面的事情。
   */
  ipcMain.handle('expense:clearAll', async (): Promise<number> => {
    return clearAllExpenses()
  })

  // ===== 用户自定义分类操作 =====

  /**
   * 获取所有用户自己创建的分类
   * 不包含预设的 10 大支出和 5 大收入分类（那些在 categories.ts 里）
   */
  ipcMain.handle('category:getAll', async (): Promise<UserCategory[]> => {
    return getUserCategories()
  })

  /**
   * 新增用户自定义分类
   * 创建一级分类（大类）还是二级分类（小类），由 input.parentKey 决定：
   * parentKey = null → 一级；parentKey = "food" → 在"餐饮饮食"下加小类。
   */
  ipcMain.handle('category:add', async (_event, input: CreateUserCategoryInput): Promise<UserCategory> => {
    return addUserCategory(input)
  })

  /**
   * 修改用户自定义分类（只能改名称和图标）
   *
   * 安全保护：只允许修改 ID 以 "user_" 开头的分类。
   * 如果前端试图修改预设分类（如 "food"），这里直接返回 null 拦截。
   * 这样即使前端代码有 Bug 或被人篡改，预设分类也不会被破坏。
   */
  ipcMain.handle('category:update', async (_event, id: string, input: UpdateUserCategoryInput): Promise<UserCategory | null> => {
    if (!id.startsWith('user_')) return null
    return updateUserCategory(id, input)
  })

  /**
   * 删除用户自定义分类
   *
   * 安全保护同上：只允许删除 ID 以 "user_" 开头的。
   * 如果是大类，database.deleteUserCategory 会自动连小类一起删除（级联删除）。
   */
  ipcMain.handle('category:delete', async (_event, id: string): Promise<boolean> => {
    if (!id.startsWith('user_')) return false
    return deleteUserCategory(id)
  })

  // ===== CSV 导出（账单 → 文件）=====

  /**
   * 把数据库中的所有记账记录导出为 CSV 文件
   *
   * CSV（Comma-Separated Values，逗号分隔值）是一种通用的表格格式，
   * 可以被 Excel、WPS、Numbers 等任何表格软件打开。
   *
   * 导出流程：
   * 1. 从数据库读出所有记录
   * 2. 弹出"另存为"对话框，让用户选择保存位置
   * 3. 把记录转成 CSV 格式的文本
   * 4. 在文件开头加上 BOM（字节序标记），确保 Excel 能正确识别中文
   * 5. 写入用户选择的文件
   *
   * @returns { success, message }
   *   success: true = 导出成功，false = 没有数据 / 用户取消 / 写入失败
   *   message: 给用户看的提示文字
   */
  ipcMain.handle('export:csv', async (): Promise<{ success: boolean; message: string }> => {
    try {
      const records = getAllExpenses()
      if (records.length === 0) {
        return { success: false, message: '没有可导出的记录' }
      }

      // 弹出系统原生"另存为"对话框（不是网页里的那种，是真正的操作系统对话框）
      // 这样做的好处：
      // - 用户可以选择任意文件夹，不必局限于下载目录
      // - 路径由操作系统生成，不存在路径遍历攻击风险
      const result = await dialog.showSaveDialog({
        title: '导出账单数据',
        defaultPath: `黑马记账_导出_${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [
          { name: 'CSV 文件', extensions: ['csv'] }
        ]
      })

      // 用户点了"取消"按钮 → 不保存任何东西
      if (result.canceled || !result.filePath) {
        return { success: false, message: '已取消导出' }
      }

      // 把记录数组转成 CSV 格式的纯文本
      const csvContent = generateCsv(records)

      // BOM（Byte Order Mark，U+FEFF 字符）是一个不可见字符，
      // 放在文件最开头可以告诉 Excel "这个文件是 UTF-8 编码"，
      // 否则 Excel 打开中文 CSV 会乱码（全部变问号或方块）。
      writeFileSync(result.filePath, '﻿' + csvContent, 'utf-8')

      return { success: true, message: `成功导出 ${records.length} 条记录` }
    } catch (err: unknown) {
      // 写入失败的可能原因：磁盘满了、文件被占用、没有写入权限等
      // 注意：不把 err.message 直接给用户，避免暴露文件系统路径
      console.error('CSV 导出失败', err)
      return { success: false, message: '导出失败，请检查磁盘空间或文件权限后重试' }
    }
  })

  // ===== CSV 导入（文件 → 账单）=====

  /**
   * 从 CSV 文件导入记账记录
   *
   * 导入流程：
   * 1. 弹出"打开文件"对话框，让用户选择一个 .csv 文件
   * 2. 读取文件内容（UTF-8 编码）
   * 3. 去掉 BOM 头（如果有的话）
   * 4. 逐行解析 CSV
   * 5. 对每条解析出的记录做验证（金额是否合法、日期格式是否正确、分类是否存在）
   * 6. 验证通过的写入数据库，不通过的跳过
   *
   * 安全设计：每条记录的解析和验证分开进行，一行解析失败不影响其他行。
   * 不会把 CSV 内容直接拼成 SQL 语句（始终使用参数化查询）。
   *
   * @returns { success, message, count? }
   *   count: 成功导入的记录数量
   */
  ipcMain.handle('import:csv', async (): Promise<{ success: boolean; message: string; count?: number }> => {
    try {
      const result = await dialog.showOpenDialog({
        title: '导入账单数据',
        filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
        properties: ['openFile']  // 只能选文件（不能选文件夹），一次只能选一个
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, message: '已取消导入' }
      }

      const filePath = result.filePaths[0]
      const content = readFileSync(filePath, 'utf-8')

      // 去掉 BOM 头（﻿），防止它干扰第一行表头的解析
      const cleanContent = content.replace(/^﻿/, '')

      // 把 CSV 文本解析成结构化数据
      const records = parseCsv(cleanContent)
      if (records.length === 0) {
        return { success: false, message: '文件中没有找到有效记录' }
      }

      // 逐条写入数据库。每条单独写，确保一条失败不影响其他条。
      let imported = 0
      for (const rec of records) {
        try {
          addExpense(rec)
          imported++
        } catch {
          // 跳过解析失败的记录（如重复 ID 等极端情况）
        }
      }

      return { success: true, message: `成功导入 ${imported} 条记录`, count: imported }
    } catch (err: unknown) {
      console.error('CSV 导入失败', err)
      return { success: false, message: '导入失败，请检查文件格式是否正确' }
    }
  })
}

