/**
 * SQLite 数据库管理模块
 * 负责数据库初始化、建表、增删改查操作
 * 运行在 Electron 主进程中
 */
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import type { ExpenseRecord, CreateExpenseInput, UpdateExpenseInput, RecordType, UserCategory, CreateUserCategoryInput, UpdateUserCategoryInput } from '../shared/types'

const DB_PATH = join(app.getPath('userData'), 'heima-accounting.db')
let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (db) return db
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')

  // 建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id          TEXT PRIMARY KEY,
      type        TEXT DEFAULT 'expense',
      amount      INTEGER NOT NULL,
      primary_category TEXT NOT NULL,
      secondary_category TEXT NOT NULL,
      date        TEXT NOT NULL,
      note        TEXT DEFAULT '',
      payment_method  TEXT DEFAULT 'wechat',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    )
  `)

  // 迁移：如果没有 type 列，添加它
  const cols = db.pragma('table_info(expenses)') as any[]
  if (!cols.some(c => c.name === 'type')) {
    db.exec(`ALTER TABLE expenses ADD COLUMN type TEXT DEFAULT 'expense'`)
    db.exec(`UPDATE expenses SET type = 'expense' WHERE type IS NULL`)
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_primary ON expenses(primary_category);
    CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type);
  `)

  // 用户自定义分类表
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_categories (
      id          TEXT PRIMARY KEY,
      type        TEXT NOT NULL,
      parent_key  TEXT,
      key         TEXT NOT NULL UNIQUE,
      label       TEXT NOT NULL,
      icon        TEXT DEFAULT '📋',
      created_at  TEXT NOT NULL
    )
  `)

  return db
}

export function closeDatabase(): void {
  if (db) { db.close(); db = null }
}

// ============ 数据操作 ============

export function getAllExpenses(): ExpenseRecord[] {
  const rows = getDatabase().prepare(
    `SELECT * FROM expenses ORDER BY date DESC, created_at DESC`
  ).all() as any[]
  return rows.map(rowToRecord)
}

export function addExpense(input: CreateExpenseInput): ExpenseRecord {
  const db = getDatabase()
  const id = generateId()
  const now = new Date().toISOString()
  const type = input.type || 'expense'

  db.prepare(`
    INSERT INTO expenses (id, type, amount, primary_category, secondary_category, date, note, payment_method, created_at, updated_at)
    VALUES (@id, @type, @amount, @primaryCategory, @secondaryCategory, @date, @note, @paymentMethod, @createdAt, @updatedAt)
  `).run({
    id, type,
    amount: input.amount,
    primaryCategory: input.primaryCategory,
    secondaryCategory: input.secondaryCategory,
    date: input.date,
    note: input.note || '',
    paymentMethod: input.paymentMethod || 'wechat',
    createdAt: now, updatedAt: now
  })

  return {
    id, type,
    amount: input.amount,
    primaryCategory: input.primaryCategory,
    secondaryCategory: input.secondaryCategory,
    date: input.date,
    note: input.note || '',
    paymentMethod: input.paymentMethod || 'wechat',
    createdAt: now, updatedAt: now
  }
}

export function updateExpense(id: string, input: UpdateExpenseInput): ExpenseRecord | null {
  const db = getDatabase()
  const now = new Date().toISOString()
  const sets: string[] = ['updated_at = @updatedAt']
  const params: any = { id, updatedAt: now }

  if (input.type !== undefined) { sets.push('type = @type'); params.type = input.type }
  if (input.amount !== undefined) { sets.push('amount = @amount'); params.amount = input.amount }
  if (input.primaryCategory !== undefined) { sets.push('primary_category = @primaryCategory'); params.primaryCategory = input.primaryCategory }
  if (input.secondaryCategory !== undefined) { sets.push('secondary_category = @secondaryCategory'); params.secondaryCategory = input.secondaryCategory }
  if (input.date !== undefined) { sets.push('date = @date'); params.date = input.date }
  if (input.note !== undefined) { sets.push('note = @note'); params.note = input.note }
  if (input.paymentMethod !== undefined) { sets.push('payment_method = @paymentMethod'); params.paymentMethod = input.paymentMethod }

  db.prepare(`UPDATE expenses SET ${sets.join(', ')} WHERE id = @id`).run(params)
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as any
  return row ? rowToRecord(row) : null
}

export function deleteExpense(id: string): boolean {
  const result = getDatabase().prepare('DELETE FROM expenses WHERE id = ?').run(id)
  return result.changes > 0
}

/** 清空所有记账记录 */
export function clearAllExpenses(): number {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM expenses').run()
  return result.changes
}

export function getMonthTotal(year: number, month: number, type?: RecordType): number {
  const db = getDatabase()
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  let sql = `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE @prefix`
  const params: any = { prefix: `${prefix}%` }
  if (type) {
    sql += ` AND type = @type`
    params.type = type
  }
  const row = db.prepare(sql).get(params) as any
  return row.total
}

// ============ 用户自定义分类操作 ============

/** 获取所有用户自定义分类 */
export function getUserCategories(): UserCategory[] {
  const rows = getDatabase().prepare(
    `SELECT * FROM user_categories ORDER BY created_at ASC`
  ).all() as any[]
  return rows.map(rowToUserCategory)
}

/** 新增用户分类 */
export function addUserCategory(input: CreateUserCategoryInput): UserCategory {
  const db = getDatabase()
  const ts = Date.now().toString(36)
  const id = `user_${ts}`
  const key = input.parentKey
    ? `user_sub_${ts}`
    : `user_${ts}`
  const now = new Date().toISOString()
  const icon = input.icon || '📋'

  db.prepare(`
    INSERT INTO user_categories (id, type, parent_key, key, label, icon, created_at)
    VALUES (@id, @type, @parentKey, @key, @label, @icon, @createdAt)
  `).run({
    id, type: input.type,
    parentKey: input.parentKey || null,
    key, label: input.label, icon,
    createdAt: now
  })

  return { id, type: input.type, parentKey: input.parentKey || null, key, label: input.label, icon, createdAt: now }
}

/** 更新用户分类（仅允许修改 label 和 icon） */
export function updateUserCategory(id: string, input: UpdateUserCategoryInput): UserCategory | null {
  const db = getDatabase()
  const existing = db.prepare('SELECT * FROM user_categories WHERE id = ?').get(id) as any
  if (!existing) return null

  const label = input.label !== undefined ? input.label : existing.label
  const icon = input.icon !== undefined ? input.icon : existing.icon

  db.prepare(`UPDATE user_categories SET label = @label, icon = @icon WHERE id = @id`).run({ label, icon, id })
  return rowToUserCategory(db.prepare('SELECT * FROM user_categories WHERE id = ?').get(id) as any)
}

/** 删除用户分类（一级分类级联删除子分类） */
export function deleteUserCategory(id: string): boolean {
  const db = getDatabase()
  const cat = db.prepare('SELECT * FROM user_categories WHERE id = ?').get(id) as any
  if (!cat) return false

  // 如果是一级分类，同时删除其下所有二级分类
  if (!cat.parent_key) {
    db.prepare('DELETE FROM user_categories WHERE parent_key = ?').run(cat.key)
  }
  const result = db.prepare('DELETE FROM user_categories WHERE id = ?').run(id)
  return result.changes > 0
}

// ============ 辅助 ============

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`
}

function rowToRecord(row: any): ExpenseRecord {
  return {
    id: row.id,
    type: row.type || 'expense',
    amount: row.amount,
    primaryCategory: row.primary_category,
    secondaryCategory: row.secondary_category,
    date: row.date,
    note: row.note || '',
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function rowToUserCategory(row: any): UserCategory {
  return {
    id: row.id,
    type: row.type,
    parentKey: row.parent_key || null,
    key: row.key,
    label: row.label,
    icon: row.icon || '📋',
    createdAt: row.created_at
  }
}
