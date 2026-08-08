/**
 * Preload 预加载脚本
 *
 * 这是 Electron 安全架构中最关键的一环——它是"前台"（网页）和"后台"（主进程）之间
 * 唯一的合法通道。
 *
 * ## 为什么需要 Preload？
 *
 * 用机场安检做类比：
 * - 主进程 = 驾驶舱（控制整个飞机，权力最大，但也最危险）
 * - 渲染进程 = 客舱（乘客待的地方，被严格限制，不能进驾驶舱）
 * - Preload = 安检口（乘客要什么服务，安检员检查后传给空乘，不让你自己跑去驾驶舱）
 *
 * 技术上：
 * - 网页代码可能来自任何地方（如第三方广告脚本、用户自己安装的插件），
 *   如果网页能直接调用 Node.js，就等于把系统控制权交给了任意网页。
 * - 所以 Electron 默认不让网页碰 Node.js（nodeIntegration: false）。
 * - Preload 脚本在中间做"传话"，只传允许的消息，屏蔽危险的操作。
 *
 * ## 安全原则
 *
 * 1. 最小权限原则：只暴露网页真正需要的 API，不暴露多余的。
 * 2. 参数校验：所有从网页传来的数据都应视为"不可信的"，传给主进程处理时
 *    需由主进程做验证（本项目的验证在 ipc-handlers.ts 中）。
 * 3. 不暴露 ipcRenderer 原始对象：网页只能调用我们包装好的函数，
 *    不能直接发任意 IPC 消息。
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseRecord, CreateUserCategoryInput, UpdateUserCategoryInput, UserCategory } from '../shared/types'

/**
 * contextBridge.exposeInMainWorld('electronAPI', { ... })
 *
 * 这行代码的意思是：在网页的全局作用域中创建一个名叫 `electronAPI` 的对象，
 * 网页代码可以通过 `window.electronAPI.getAllExpenses()` 来调用后端功能。
 *
 * 注意：
 * - 网页不能看到这个函数的内部实现（Electron 自动隐藏了）
 * - 网页不能修改或删除 `electronAPI` 对象（Electron 自动冻结了）
 * - 只有这里列出的方法才可用，没列出来的功能网页根本看不到
 */
contextBridge.exposeInMainWorld('electronAPI', {

  // 暴露操作系统平台信息给前端（如 'win32' = Windows, 'darwin' = macOS）
  // 前端可以根据平台调整 UI（比如 macOS 的窗口按钮布局和 Windows 不同）
  platform: process.platform,

  // ===== 记账记录操作 =====

  /**
   * 获取所有记账记录
   * 前端打开记账列表或统计页面时调用
   */
  getAllExpenses: (): Promise<ExpenseRecord[]> => {
    return ipcRenderer.invoke('expense:getAll')
  },

  /**
   * 新增一条记账记录
   * @param input - 包含金额（分）、分类、日期等信息
   */
  addExpense: (input: CreateExpenseInput): Promise<ExpenseRecord> => {
    return ipcRenderer.invoke('expense:add', input)
  },

  /**
   * 修改已有记录
   * @param id - 要修改的记录 ID
   * @param input - 只需传要改的字段，没传的保持原样
   */
  updateExpense: (id: string, input: UpdateExpenseInput): Promise<ExpenseRecord | null> => {
    return ipcRenderer.invoke('expense:update', id, input)
  },

  /**
   * 删除一条记录
   * @param id - 要删除的记录 ID
   * @returns true（删除成功）或 false（记录不存在）
   */
  deleteExpense: (id: string): Promise<boolean> => {
    return ipcRenderer.invoke('expense:delete', id)
  },

  /**
   * 获取某个月的支出总额
   * @param year - 年份（2026）
   * @param month - 月份（1-12）
   * @returns 金额（单位：分，如 123456 = 1234.56 元）
   */
  getMonthTotal: (year: number, month: number): Promise<number> => {
    return ipcRenderer.invoke('expense:getMonthTotal', year, month)
  },

  /**
   * 把数据库中的记录导出为 CSV 文件
   * 用户会看到一个"另存为"对话框来选择保存位置
   */
  exportCsv: (): Promise<{ success: boolean; message: string }> => {
    return ipcRenderer.invoke('export:csv')
  },

  /**
   * 从 CSV 文件导入记账记录
   * 用户会看到一个"打开文件"对话框来选择要导入的 .csv 文件
   */
  importCsv: (): Promise<{ success: boolean; message: string; count?: number }> => {
    return ipcRenderer.invoke('import:csv')
  },

  /**
   * 清空所有记账记录（不可恢复！）
   * 前端调用前必须弹出确认框
   */
  clearAll: (): Promise<number> => {
    return ipcRenderer.invoke('expense:clearAll')
  },

  // ===== 用户自定义分类操作 =====

  /**
   * 获取所有用户自己创建的分类
   */
  getUserCategories: (): Promise<UserCategory[]> => {
    return ipcRenderer.invoke('category:getAll')
  },

  /**
   * 新增用户自定义分类
   * @param input - type（支出/收入）、parentKey（null=一级分类）、label（中文名称）
   */
  addUserCategory: (input: CreateUserCategoryInput): Promise<UserCategory> => {
    return ipcRenderer.invoke('category:add', input)
  },

  /**
   * 修改用户分类（只能改名称和图标）
   * 不能修改预设分类（id 不以 "user_" 开头的）
   */
  updateUserCategory: (id: string, input: UpdateUserCategoryInput): Promise<UserCategory | null> => {
    return ipcRenderer.invoke('category:update', id, input)
  },

  /**
   * 删除用户分类
   * 不能删除预设分类
   */
  deleteUserCategory: (id: string): Promise<boolean> => {
    return ipcRenderer.invoke('category:delete', id)
  }
})
