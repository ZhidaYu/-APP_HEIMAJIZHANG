/**
 * SQLite 数据库管理模块
 *
 * 这个模块是整个记账应用的数据核心——所有记账记录和用户分类都存在这里。
 * 可以把它理解为一个"智能账本"：你能往里面记一笔账、修改、删除、查询。
 * 每个操作都直接操作 SQLite 数据库文件（一个放在用户电脑上的 .db 文件）。
 *
 * 运行环境：仅在 Electron 主进程中运行（渲染进程无法直接访问数据库，
 * 必须通过 IPC 通信，也就是 preload.ts 搭的桥，调用这里的函数）。
 *
 * 安全说明：所有 SQL 语句使用参数化查询（@param 占位符），
 * 用户输入的值不会直接拼进 SQL 字符串，从根本上防止了 SQL 注入攻击。
 */
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import type { ExpenseRecord, CreateExpenseInput, UpdateExpenseInput, RecordType, UserCategory, CreateUserCategoryInput, UpdateUserCategoryInput } from '../shared/types'

/**
 * 数据库文件的存放路径
 * 使用 Electron 提供的用户数据目录（不同操作系统位置不同）：
 * - Windows: C:\Users\<用户名>\AppData\Roaming\heima-accounting\heima-accounting.db
 * - macOS:   ~/Library/Application Support/heima-accounting/heima-accounting.db
 * 这样做的优点：软件更新不会覆盖用户的记账数据
 */
const DB_PATH = join(app.getPath('userData'), 'heima-accounting.db')

/** 数据库连接实例（整个应用只有一个，复用不重复创建） */
let db: Database.Database | null = null

/**
 * 获取数据库连接（单例模式）
 *
 * 第一次调用时会：
 * 1. 创建数据库连接
 * 2. 开启 WAL 模式（提升多操作并发性能）
 * 3. 自动建表（如果表不存在）
 * 4. 兼容旧版本：检查并补充缺失的列
 * 5. 创建索引（加速按日期、分类、类型的查询）
 *
 * 之后再调用会直接复用已有连接，不会重复初始化。
 *
 * @returns 数据库连接实例（类似"账本的把手"，拿着它才能翻页、写字）
 */
export function getDatabase(): Database.Database {
  // 如果已经连接过了，直接复用（避免反复开关数据库，浪费性能）
  if (db) return db

  // 打开数据库文件（如果文件不存在，SQLite 会自动创建）
  db = new Database(DB_PATH)

  // 开启 WAL 模式（Write-Ahead Logging，预写日志）
  // 通俗理解：写入操作先记到"草稿本"上，不直接改"正本"，这样：
  // - 一边有人在写（记新账），另一边有人在读（看报表），互不阻塞
  // - 应用崩溃时，草稿本的数据可以恢复，降低数据丢失风险
  // 这是 SQLite 官方推荐的对性能和数据安全都有好处的设置
  db.pragma('journal_mode = WAL')

  // ---------- 建表：expenses（记账记录表） ----------
  // CREATE TABLE IF NOT EXISTS 的含义：
  // 如果表已经存在就跳过，不存在就新建。
  // 这样应用每次启动都不会破坏已有数据。
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id          TEXT PRIMARY KEY,       -- 每条记录的唯一标识（如 "m2x3y-abc789"）
      type        TEXT DEFAULT 'expense', -- 记录类型：expense（支出）或 income（收入）
      amount      INTEGER NOT NULL,       -- 金额（单位：分，如 3650 表示 36.50 元）
      primary_category TEXT NOT NULL,     -- 一级分类的 key（如 "food" = 餐饮饮食）
      secondary_category TEXT NOT NULL,   -- 二级分类的 key（如 "takeout" = 外卖外送）
      date        TEXT NOT NULL,          -- 记账日期，格式 YYYY-MM-DD（如 "2026-08-08"）
      note        TEXT DEFAULT '',        -- 备注（最长 200 字，用户自己写的说明）
      payment_method  TEXT DEFAULT 'wechat', -- 支付方式（wechat/alipay/bank_card/cash/other）
      created_at  TEXT NOT NULL,          -- 这条记录是什么时候创建的（ISO 格式时间戳）
      updated_at  TEXT NOT NULL           -- 这条记录最近一次被修改是什么时候
    )
  `)

  // ---------- 兼容旧版本数据库：检查并补充 type 列 ----------
  // 背景：最初版本的数据库没有 type 列（只有支出，没有收入）。
  // 如果用户的数据库是那时候创建的，我们需要给它补上这个列，
  // 并且把已有记录都标记为"支出"（符合它们原本的含义）。
  // 这种操作在数据库领域叫"迁移"（Migration）——在不丢数据的前提下升级数据库结构。
  const cols = db.pragma('table_info(expenses)') as any[]
  if (!cols.some(c => c.name === 'type')) {
    // 情况 1：旧数据库缺少 type 列 → 添加列，默认值为 'expense'
    db.exec(`ALTER TABLE expenses ADD COLUMN type TEXT DEFAULT 'expense'`)
    // 情况 2：某些记录可能 type 为 NULL → 统一设为 'expense'
    db.exec(`UPDATE expenses SET type = 'expense' WHERE type IS NULL`)
  }

  // ---------- 创建索引（加速查询）----------
  // 索引就像书的目录：没有目录时，每次查"关于餐饮的记录"需要从头翻到尾。
  // 有了索引，数据库直接跳到相关条目，速度提升几十到几百倍。
  // 这里对最常用来筛选和排序的 3 个列建了索引。
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_primary ON expenses(primary_category);
    CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type);
  `)

  // ---------- 建表：user_categories（用户自定义分类表） ----------
  // 除了预设的 10 大支出分类和 5 大收入分类，用户可以自己创建分类。
  // 这些自定义分类存在这个表中，和预设分类分开管理。
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_categories (
      id          TEXT PRIMARY KEY,       -- 唯一标识（自动生成，以 "user_" 开头）
      type        TEXT NOT NULL,          -- 这个分类属于支出（expense）还是收入（income）
      parent_key  TEXT,                   -- 父分类的 key：
                                          --   NULL  = 这是一个一级分类
                                          --   非NULL = 这是一个二级分类，值指向它属于哪个一级分类
      key         TEXT NOT NULL UNIQUE,   -- 程序内部使用的标识符（类似英文名）
      label       TEXT NOT NULL,          -- 界面上显示的名称（中文，如 "兴趣爱好"）
      icon        TEXT DEFAULT '📋',      -- emoji 图标，用于界面展示
      created_at  TEXT NOT NULL           -- 创建时间
    )
  `)

  return db
}

/**
 * 关闭数据库连接
 *
 * 应用退出前必须调用，确保所有未写入的数据被保存到磁盘。
 * 不关闭的话可能导致数据丢失或数据库文件损坏。
 */
export function closeDatabase(): void {
  if (db) { db.close(); db = null }
}

// ============ 记账记录操作 ============

/**
 * 获取所有记账记录
 *
 * 把数据库里的所有记录都取出来，按"日期倒序 + 创建时间倒序"排列。
 * 也就是说：最新的记录排在最前面，方便用户一眼看到最近的账。
 *
 * @returns 所有记录的数组（如果没有记录，返回空数组 []）
 */
export function getAllExpenses(): ExpenseRecord[] {
  const rows = getDatabase().prepare(
    `SELECT * FROM expenses ORDER BY date DESC, created_at DESC`
  ).all() as any[]
  // 数据库中的列名是下划线风格（如 primary_category），
  // 通过 rowToRecord 转成驼峰风格（如 primaryCategory），
  // 方便前端代码使用
  return rows.map(rowToRecord)
}

/**
 * 新增一条记账记录
 *
 * @param input - 新记录的数据
 *   - amount: 金额（单位：分，如 3650 = 36.50 元）
 *   - primaryCategory: 一级分类 key（如 "food"）
 *   - secondaryCategory: 二级分类 key（如 "takeout"）
 *   - date: 日期（格式 YYYY-MM-DD）
 *   - type: 可选，默认为 'expense'（支出），传 'income' 表示收入
 *   - note: 可选，备注文字
 *   - paymentMethod: 可选，支付方式，默认 'wechat'
 *
 * @returns 完整的记录对象（含自动生成的 id、createdAt、updatedAt）
 */
export function addExpense(input: CreateExpenseInput): ExpenseRecord {
  const db = getDatabase()
  // 生成唯一 ID：时间戳36进制 + 随机数，如 "m2x3y-abc789"
  const id = generateId()
  // 记录创建时间（精确到毫秒的 ISO 格式，如 "2026-08-08T12:30:45.123Z"）
  const now = new Date().toISOString()
  // 如果调用者没传 type，默认当作支出
  const type = input.type || 'expense'

  // 使用参数化查询（@param 占位符）：
  // 所有用户输入的值通过 .run({...}) 的第二个参数传入，
  // SQLite 内部会安全地替换占位符，不会把用户输入当成 SQL 代码执行。
  // 这就是防止 SQL 注入的关键——哪怕用户写了恶意内容，也只是数据，不是命令。
  db.prepare(`
    INSERT INTO expenses (id, type, amount, primary_category, secondary_category, date, note, payment_method, created_at, updated_at)
    VALUES (@id, @type, @amount, @primaryCategory, @secondaryCategory, @date, @note, @paymentMethod, @createdAt, @updatedAt)
  `).run({
    id, type,
    amount: input.amount,
    primaryCategory: input.primaryCategory,
    secondaryCategory: input.secondaryCategory,
    date: input.date,
    note: input.note || '',                     // 空备注 → 空字符串
    paymentMethod: input.paymentMethod || 'wechat', // 没选支付方式 → 默认微信
    createdAt: now, updatedAt: now
  })

  // 构造返回对象（字段和数据库列名对应，但用驼峰命名）
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

/**
 * 修改一条已有的记账记录
 *
 * 只更新调用者传了值的字段，没传的字段保持原样。
 * 比如只传了 amount: 9999，那就只改金额，分类、日期、备注都不变。
 *
 * @param id - 要修改的记录的 ID
 * @param input - 要修改的字段（只传想改的，不用全传）
 *   - amount?: 新金额（分）
 *   - primaryCategory?: 新一级分类
 *   - ... 其他字段都是可选的
 *
 * @returns 修改后的完整记录。如果 ID 不存在，返回 null。
 *         调用者应检查返回值是否为 null，避免对空结果继续操作。
 */
export function updateExpense(id: string, input: UpdateExpenseInput): ExpenseRecord | null {
  const db = getDatabase()
  const now = new Date().toISOString()

  // 动态构建 UPDATE 语句的 SET 子句
  // 思路：先创建一个数组，每检测到一个要更新的字段就 push 一个片段进去
  // 最后用逗号拼接（如 "amount = @amount, note = @note, updated_at = @updatedAt"）
  const sets: string[] = ['updated_at = @updatedAt']
  const params: any = { id, updatedAt: now }

  // 逐一检查：调用者传了这个字段吗？传了就加入更新列表
  // 注意：undefined 表示"没传"，null/0/'' 表示"传了但要设为空"——两者不同
  if (input.type !== undefined) { sets.push('type = @type'); params.type = input.type }
  if (input.amount !== undefined) { sets.push('amount = @amount'); params.amount = input.amount }
  if (input.primaryCategory !== undefined) { sets.push('primary_category = @primaryCategory'); params.primaryCategory = input.primaryCategory }
  if (input.secondaryCategory !== undefined) { sets.push('secondary_category = @secondaryCategory'); params.secondaryCategory = input.secondaryCategory }
  if (input.date !== undefined) { sets.push('date = @date'); params.date = input.date }
  if (input.note !== undefined) { sets.push('note = @note'); params.note = input.note }
  if (input.paymentMethod !== undefined) { sets.push('payment_method = @paymentMethod'); params.paymentMethod = input.paymentMethod }

  // 执行更新
  db.prepare(`UPDATE expenses SET ${sets.join(', ')} WHERE id = @id`).run(params)

  // 更新后重新查询一次，返回最新的完整记录
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as any
  return row ? rowToRecord(row) : null
}

/**
 * 删除一条记账记录
 *
 * @param id - 要删除的记录的 ID
 * @returns true = 删成功了（记录存在且已删除），false = 没找到这条记录
 */
export function deleteExpense(id: string): boolean {
  const result = getDatabase().prepare('DELETE FROM expenses WHERE id = ?').run(id)
  // result.changes 表示"这个操作影响了几行数据"
  // > 0 表示确实删掉了东西，= 0 表示数据库里没找到这个 ID
  return result.changes > 0
}

/**
 * 清空所有记账记录（危险操作！）
 *
 * 删除 expenses 表中的全部数据，不可恢复。
 * 前端调用此方法前应该弹出确认对话框，防止用户误操作。
 *
 * @returns 被删除的记录数量
 */
export function clearAllExpenses(): number {
  const db = getDatabase()
  const result = db.prepare('DELETE FROM expenses').run()
  return result.changes
}

/**
 * 获取某个月的支出或收入总额
 *
 * @param year  - 年份（如 2026）
 * @param month - 月份（1-12，如 8 = 八月）
 * @param type  - 可选：'expense' 只算支出，'income' 只算收入。
 *                不传则计算该月所有记录的总和
 *
 * @returns 该月的总金额（单位：分，如 123456 = 1234.56 元）
 *
 * 原理：使用 SQL 的 LIKE 匹配日期前缀。
 * 如查 2026年8月 → 匹配所有 "2026-08-??" 格式的日期 → SUM 求和。
 */
export function getMonthTotal(year: number, month: number, type?: RecordType): number {
  const db = getDatabase()
  // 构造日期前缀，如 "2026-08"
  const prefix = `${year}-${String(month).padStart(2, '0')}`

  // 查询该月所有记录，把金额加起来（如果该月没有记录，返回 0）
  let sql = `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE @prefix`
  const params: any = { prefix: `${prefix}%` }

  // 如果指定了类型（只查支出或只查收入），额外加上 type 筛选
  if (type) {
    sql += ` AND type = @type`
    params.type = type
  }

  const row = db.prepare(sql).get(params) as any
  return row.total
}

// ============ 用户自定义分类操作 ============

/**
 * 获取所有用户自己创建的分类
 *
 * 预置的 10 大支出分类和 5 大收入分类在 categories.ts 中定义，
 * 不存数据库。只有用户自己创建的"额外分类"才存在 user_categories 表中。
 *
 * @returns 用户自定义分类列表（按创建时间从旧到新排列）
 */
export function getUserCategories(): UserCategory[] {
  const rows = getDatabase().prepare(
    `SELECT * FROM user_categories ORDER BY created_at ASC`
  ).all() as any[]
  return rows.map(rowToUserCategory)
}

/**
 * 新增一个用户自定义分类
 *
 * @param input - 新分类的数据
 *   - type: 'expense'（支出分类）或 'income'（收入分类）
 *   - parentKey: null = 创建一级分类（大类）；传入某分类的 key = 在其下创建二级分类
 *   - label: 分类的中文名称（如 "兴趣爱好"）
 *   - icon: 可选，emoji 图标，默认 📋
 *
 * @returns 创建好的分类对象
 *
 * 分类 key 的生成规则：
 * - 一级分类：key = "user_" + 时间戳36进制（如 "user_m2x3y"）
 * - 二级分类：key = "user_sub_" + 时间戳36进制（如 "user_sub_m2x3y"）
 * key 中带有时间戳，确保每次创建的分类 key 不重复。
 */
export function addUserCategory(input: CreateUserCategoryInput): UserCategory {
  const db = getDatabase()
  // 用当前时间毫秒数的 36 进制字符串作为唯一后缀
  // 比如 Date.now() = 1767890123456 → toString(36) = "m2x3y"
  // 36 进制比 10 进制短，生成更紧凑的 ID
  const ts = Date.now().toString(36)
  const id = `user_${ts}`
  const key = input.parentKey
    ? `user_sub_${ts}`    // 二级分类
    : `user_${ts}`        // 一级分类
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

/**
 * 修改用户自定义分类的名称或图标
 *
 * 预设分类（如"餐饮饮食"）不能通过这个函数修改，只能改用户自己创建的。
 * 调用者（IPC handler）应该在调用前检查分类 ID 是否以 "user_" 开头。
 *
 * @param id - 要修改的分类 ID
 * @param input - 新的 label 和/或 icon（至少传一个）
 * @returns 修改后的分类对象。ID 不存在时返回 null。
 */
export function updateUserCategory(id: string, input: UpdateUserCategoryInput): UserCategory | null {
  const db = getDatabase()
  // 先查一下这个分类是否存在
  const existing = db.prepare('SELECT * FROM user_categories WHERE id = ?').get(id) as any
  if (!existing) return null

  // 调用者传了就用新的，没传就用旧的（即"只改想改的字段"）
  const label = input.label !== undefined ? input.label : existing.label
  const icon = input.icon !== undefined ? input.icon : existing.icon

  db.prepare(`UPDATE user_categories SET label = @label, icon = @icon WHERE id = @id`).run({ label, icon, id })
  return rowToUserCategory(db.prepare('SELECT * FROM user_categories WHERE id = ?').get(id) as any)
}

/**
 * 删除用户自定义分类
 *
 * 如果删除的是一级分类（大类），它下面的所有二级分类也会被一起删掉（级联删除）。
 * 这是合理的：大类都没了，小类留着也没意义。
 * 预设分类不能被删除（调用者应提前检查）。
 *
 * @param id - 要删除的分类 ID
 * @returns true = 删除成功，false = 不存在或不是用户分类
 */
export function deleteUserCategory(id: string): boolean {
  const db = getDatabase()
  const cat = db.prepare('SELECT * FROM user_categories WHERE id = ?').get(id) as any
  if (!cat) return false

  // 如果是一级分类（parent_key 为空）→ 先删它下面的所有二级分类（防止变成孤儿数据）
  if (!cat.parent_key) {
    db.prepare('DELETE FROM user_categories WHERE parent_key = ?').run(cat.key)
  }
  const result = db.prepare('DELETE FROM user_categories WHERE id = ?').run(id)
  return result.changes > 0
}

// ============ 内部辅助函数（不导出，仅模块内部使用）============

/**
 * 生成全局唯一的 ID
 *
 * 格式：时间戳(36进制) - 随机字符串
 * 如 "m2x3y-abc789"
 *
 * 为什么这样设计：
 * - 时间戳部分确保按时间排序时大致有序
 * - 随机部分确保同一毫秒内创建的记录 ID 也不冲突
 * - 36 进制比常用的 16 进制更短
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`
}

/**
 * 把数据库的"行"转换成应用层的"记录对象"
 *
 * 数据库列名用下划线（如 primary_category），是 SQL 界的命名习惯。
 * 应用层用驼峰命名（如 primaryCategory），是 JavaScript/TypeScript 的命名习惯。
 * 这个函数负责在两种命名风格之间做翻译。
 *
 * @param row - 数据库查询返回的原始行数据
 * @returns 转换后的 ExpenseRecord 对象
 */
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

/**
 * 把数据库的"行"转换成应用层的"用户分类对象"
 *
 * 和 rowToRecord 类似的职责：下划线命名 → 驼峰命名。
 *
 * @param row - 数据库查询返回的原始行数据
 * @returns 转换后的 UserCategory 对象
 */
function rowToUserCategory(row: any): UserCategory {
  return {
    id: row.id,
    type: row.type,
    parentKey: row.parent_key || null,   // 数据库存 NULL → 应用层也是 null
    key: row.key,
    label: row.label,
    icon: row.icon || '📋',
    createdAt: row.created_at
  }
}
