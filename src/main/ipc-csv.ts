/**
 * CSV 导入导出处理模块
 *
 * 本模块负责两件事：
 * 1. 生成 CSV（记录数组 → CSV 文本）—— 用于账单导出
 * 2. 解析 CSV（CSV 文本 → 记录数组）—— 用于账单导入
 *
 * CSV（逗号分隔值）是一种通用表格格式，Excel、WPS、Numbers 都能打开。
 * 本模块的代码不涉及 Electron IPC，是纯数据处理逻辑。
 */
import { getAllExpenses, getMonthTotal, getUserCategories } from './database'
import { getCategoryDisplay, PRIMARY_CATEGORIES, INCOME_CATEGORIES } from '../shared/categories'
import type { CreateExpenseInput, ExpenseRecord, RecordType, PaymentMethod, UserCategory } from '../shared/types'

// ============ CSV 内容生成（记录数组 → CSV 文本）============

/**
 * 把记账记录数组转成 CSV 格式的字符串
 *
 * CSV 的格式很简单：
 * - 第一行是表头（列名），用逗号分隔
 * - 之后每一行是一条数据
 * - 如果某个单元格的值里有逗号或引号，需要用双引号包起来
 *
 * 示例输出：
 * 类型,日期,金额（元）,一级分类,二级分类,分类,支付方式,备注
 * 支出,2026-08-08,-36.50,餐饮饮食,外卖外送,餐饮饮食 > 外卖外送,微信支付,午餐
 *
 * @param records - 要导出的记录数组
 * @returns CSV 格式的完整文本（含表头）
 */
function generateCsv(records: ExpenseRecord[]): string {
  // 表头：告诉看文件的人（或软件）每一列代表什么意思
  const headers = ['类型', '日期', '金额（元）', '一级分类', '二级分类', '分类', '支付方式', '备注']

  // 获取用户自定义分类，用于正确显示分类名称
  const userCats = getUserCategories()

  // 把每条记录转成一行 CSV 数据
  const rows = records.map(r => {
    // 类型显示：收入前面加 +，支出前面加 -
    const typeLabel = r.type === 'income' ? '收入' : '支出'
    const amount = (r.type === 'income' ? '+' : '-') + (r.amount / 100).toFixed(2)

    // 从分类 key（如 "food"）反查分类名称（如 "餐饮饮食"），
    // 通过 getCategoryDisplay 得到 "一级 > 二级" 的格式，再拆开
    const primary = getCategoryDisplay(r.primaryCategory, r.secondaryCategory, userCats).split(' > ')[0] || ''
    const secondary = getCategoryDisplay(r.primaryCategory, r.secondaryCategory, userCats).split(' > ')[1] || ''
    const category = `${primary} > ${secondary}`

    const payment = paymentLabel(r.paymentMethod)

    // 备注可能包含逗号、引号、换行，需要特殊处理（CSV 转义）
    const note = escapeCsvField(r.note)

    return [typeLabel, r.date, amount, primary, secondary, category, payment, note]
  })

  // 把表头和数据行拼在一起，用换行符分隔
  return [headers, ...rows]
    .map(row => row.join(','))   // 每行的列用逗号连接
    .join('\n')                  // 行与行之间用换行分隔
}

/**
 * 支付方式 key → 中文名称
 * 如 "wechat" → "微信支付"
 */
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

/**
 * CSV 字段转义
 *
 * 如果字段值中包含逗号、双引号、或换行符，需要用双引号包裹，
 * 并且把内部的双引号变成两个连续的双引号（CSV 标准转义规则）。
 *
 * 举例：
 * - "午餐"     → 午餐        （无特殊字符，不需要转义）
 * - "说,你好"  → "说,你好"    （含逗号，需要双引号包裹）
 * - "说"你好"" → "说""你好""" （含双引号，转义后变成两个双引号）
 *
 * @param value - 原始字段值
 * @returns 转义后的安全字段值
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// ============ CSV 内容解析（CSV 文本 → 记录数组）============

/**
 * 把 CSV 文件内容解析成可用于导入的记录数组
 *
 * 解析流程：
 * 1. 按换行切分成行，去掉空行
 * 2. 第一行是表头，用来确定每列的位置（列的位置不是固定的）
 * 3. 从第二行开始，每行解析为一条记录
 * 4. 每条记录要经过验证（金额、日期、分类），不通过的直接跳过
 *
 * 兼容性设计：
 * - 支持有"类型"列的 CSV（新版本导出）和无"类型"列的 CSV（老版本导出）
 * - 列的顺序可以不同（通过表头名称匹配，不依赖列的顺序）
 *
 * @param content - CSV 文件的完整文本内容
 * @returns 通过验证的记录数组
 */
function parseCsv(content: string): CreateExpenseInput[] {
  // 按换行符切分，去掉空行（最后一行可能为空）
  const lines = content.split('\n').filter(line => line.trim())
  // 至少需要表头 + 1 条数据 = 2 行
  if (lines.length < 2) return []

  // ---------- 第1步：解析表头，确定每一列的索引位置 ----------
  // 如 "类型,日期,金额（元）,一级分类,二级分类,分类,支付方式,备注"
  // → { '类型': 0, '日期': 1, '金额（元）': 2, ... }
  const header = lines[0].split(',')
  const colMap: Record<string, number> = {}
  header.forEach((h, i) => { colMap[h.trim()] = i })

  // 兼容处理：有"类型"列（收入/支出）和没有"类型"列（默认都是支出），列位置不同
  const typeCol = colMap['类型'] ?? -1
  const amountCol = colMap['金额（元）'] ?? (typeCol >= 0 ? 2 : 1)
  const dateCol = colMap['日期'] ?? (typeCol >= 0 ? 1 : 0)
  const primaryCol = colMap['一级分类'] ?? (typeCol >= 0 ? 3 : 2)
  const secondaryCol = colMap['二级分类'] ?? (typeCol >= 0 ? 4 : 3)
  const noteCol = colMap['备注'] ?? (typeCol >= 0 ? 7 : 6)
  const paymentCol = colMap['支付方式'] ?? (typeCol >= 0 ? 6 : 5)

  // ---------- 第2步：构建反向映射表 ----------

  // 支付方式中文名 → 代码 key（如 "微信支付" → "wechat"）
  const paymentReverse: Record<string, string> = {
    '微信支付': 'wechat',
    '支付宝': 'alipay',
    '银行卡': 'bank_card',
    '现金': 'cash',
    '其他': 'other'
  }

  // 分类中文名 → key（如 "餐饮饮食" → "food"），用于导入时反查
  const primaryKeyMap = buildKeyMap()

  // ---------- 第3步：逐行解析 ----------
  const records: CreateExpenseInput[] = []

  for (let i = 1; i < lines.length; i++) {
    // 用自定义的 parseCsvLine 而不是 split(',')，
    // 因为备注字段中可能包含逗号（CSV 转义规则下会用引号包裹）
    const cols = parseCsvLine(lines[i])
    if (cols.length < 3) continue  // 列数不够，整行跳过

    // 提取各列的值
    const typeStr = typeCol >= 0 ? cols[typeCol]?.trim() : ''
    // 去除金额前面的 + 或 - 符号（如 "-36.50" → "36.50"）
    const amountStr = (cols[amountCol]?.trim() || '').replace(/^[+-]/, '')
    const dateStr = cols[dateCol]?.trim()
    const primaryLabel = cols[primaryCol]?.trim()
    const secondaryLabel = cols[secondaryCol]?.trim()
    const noteStr = cols[noteCol]?.trim() || ''
    const paymentStr = cols[paymentCol]?.trim() || ''

    // 判断是收入还是支出
    const recordType: RecordType = typeStr === '收入' ? 'income' : 'expense'
    const allCats = [...PRIMARY_CATEGORIES, ...INCOME_CATEGORIES]

    // ---------- 验证 1：金额必须是有效的正数 ----------
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) continue  // 不是合法金额，跳过

    // ---------- 验证 2：日期必须是 YYYY-MM-DD 格式 ----------
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue  // 日期格式不对，跳过

    // ---------- 验证 3：一级分类必须在已知分类列表中 ----------
    const primaryKey = primaryKeyMap[primaryLabel]
    if (!primaryKey) continue  // 分类不存在于预设或用户分类中，跳过

    // ---------- 验证 4：二级分类也必须在已知列表中 ----------
    const secondaryKey = findSecondaryKey(primaryKey, secondaryLabel)
    if (!secondaryKey) {
      const cat = allCats.find(c => c.key === primaryKey)
      if (!cat) continue  // 一级分类没找到，跳过
    }

    // 如果二级分类识别失败，用该一级分类的第一个二级分类兜底
    const secKey = secondaryKey || (allCats.find(c => c.key === primaryKey)?.children[0]?.key)
    if (!secKey) continue  // 兜底也失败，跳过

    // ---------- 全部验证通过，加入导入列表 ----------
    // 金额：元 → 分（乘以 100），Math.round 消除浮点数误差
    // 如 36.50 元 × 100 → round(3650.0) → 3650 分
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

/**
 * 解析 CSV 文件中的一行（正确处理引号内的逗号）
 *
 * 为什么不用简单的 split(',')？
 * 因为 CSV 的备注字段可能包含逗号，比如用户写了 "午餐,加奶茶"。
 * CSV 标准会用双引号把这个字段包起来："午餐,加奶茶"。
 * 如果用 split(',') 直接拆，会错误地把这一个字段拆成两半。
 *
 * 这个函数手动遍历字符串，遇到引号就切换"是否在引号内"的状态，
 * 只有在引号外的逗号才当作分隔符，引号内的逗号保留。
 *
 * @param line - CSV 文件中的一行文本
 * @returns 拆分后的字段数组
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false  // 当前字符是否在双引号内部

  for (const ch of line) {
    if (ch === '"') {
      // 遇到双引号：不管在不在引号里都要切换状态
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      // 遇到逗号且在引号外：这是一个分隔符，结束当前字段，开始下一个
      result.push(current)
      current = ''
    } else {
      // 普通字符：加入当前字段
      current += ch
    }
  }
  // 推入最后一个字段（行尾没有逗号，需要手动补推）
  result.push(current)
  return result
}

/**
 * 构建"分类中文名 → key"的映射表
 *
 * 如 { "餐饮饮食": "food", "外卖外送": "takeout", ... }
 *
 * 包含了预设的支出分类、收入分类，以及用户自己创建的分类。
 * 这个映射表用于 CSV 导入时——CSV 文件里存的是中文名称（给人看的），
 * 但数据库存的是英文 key（给程序用的），所以需要反查。
 */
function buildKeyMap(): Record<string, string> {
  const map: Record<string, string> = {}

  // 预置分类：遍历所有一级分类，建立 label → key 的映射
  for (const cat of [...PRIMARY_CATEGORIES, ...INCOME_CATEGORIES]) {
    map[cat.label] = cat.key
  }

  // 用户自定义一级分类（parentKey = null 表示一级分类）
  try {
    const userCats = getUserCategories()
    for (const uc of userCats) {
      if (uc.parentKey === null) {
        map[uc.label] = uc.key
      }
    }
  } catch {
    // 数据库未初始化时 getUserCategories 可能出错，忽略即可
  }

  return map
}

/**
 * 根据中文名称反查二级分类的 key
 *
 * @param primaryKey - 所属一级分类的 key
 * @param secondaryLabel - 二级分类的中文名
 * @returns 二级分类的 key，找不到返回 undefined
 */
function findSecondaryKey(primaryKey: string, secondaryLabel: string): string | undefined {
  // 先合并预设和用户分类
  let allCats = [...PRIMARY_CATEGORIES, ...INCOME_CATEGORIES]

  try {
    const userCats = getUserCategories()
    // 用户创建的一级分类
    const userPrimaries = userCats.filter((c: UserCategory) => c.parentKey === null)
    allCats = [...allCats, ...userPrimaries.map((c: UserCategory) => ({ key: c.key, label: c.label, children: [] }))]

    // 在某一级分类下查找二级分类
    const cat = allCats.find(c => c.key === primaryKey)
    if (cat) {
      // 合并预设的二级分类和用户创建的二级分类
      const userSubs = userCats.filter((c: UserCategory) => c.parentKey === primaryKey)
      const sub = [...(cat.children || []), ...userSubs.map((c: UserCategory) => ({ key: c.key, label: c.label }))]
        .find((s: { key: string; label: string }) => s.label === secondaryLabel)
      if (sub) return sub.key
    }
  } catch {
    // 数据库未初始化时忽略
  }

  // 兜底：只在预设分类中查找
  const cat = allCats.find(c => c.key === primaryKey)
  if (!cat) return undefined
  const sub = cat.children.find(s => s.label === secondaryLabel)
  return sub?.key
}
