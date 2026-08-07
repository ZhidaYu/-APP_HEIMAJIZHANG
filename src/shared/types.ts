/**
 * 数据类型定义
 * 项目中所有核心数据结构都在这里定义
 */

// ---------- 通用 ----------

/** 记录类型：支出 或 收入 */
export type RecordType = 'expense' | 'income'

// ---------- 分类相关 ----------

/** 二级分类 */
export interface SubCategory {
  key: string
  label: string
  description: string
}

/** 一级分类 */
export interface PrimaryCategory {
  key: string
  label: string
  icon: string
  children: SubCategory[]
}

// ---------- 记录相关 ----------

/** 支付方式 */
export type PaymentMethod = 'wechat' | 'alipay' | 'bank_card' | 'cash' | 'other'

/** 支付方式选项 */
export interface PaymentOption {
  key: PaymentMethod
  label: string
  icon: string
}

/** 一条记账记录（支出或收入） */
export interface ExpenseRecord {
  id: string
  type: RecordType
  amount: number            // 单位：分
  primaryCategory: string
  secondaryCategory: string
  date: string              // YYYY-MM-DD
  note: string
  paymentMethod: PaymentMethod
  createdAt: string
  updatedAt: string
}

/** 新建记录的输入数据 */
export interface CreateExpenseInput {
  type?: RecordType         // 默认 'expense'
  amount: number
  primaryCategory: string
  secondaryCategory: string
  date: string
  note?: string
  paymentMethod?: PaymentMethod
}

/** 编辑记录的输入数据 */
export interface UpdateExpenseInput {
  type?: RecordType
  amount?: number
  primaryCategory?: string
  secondaryCategory?: string
  date?: string
  note?: string
  paymentMethod?: PaymentMethod
}

// ---------- 用户自定义分类 ----------

/** 用户自定义分类（存储在数据库中） */
export interface UserCategory {
  id: string
  type: RecordType
  parentKey: string | null    // null = 一级分类，非 null = 所属一级分类的 key
  key: string                 // 唯一标识（自动生成）
  label: string               // 显示名称
  icon: string                // emoji 图标
  createdAt: string
}

/** 创建用户分类的输入 */
export interface CreateUserCategoryInput {
  type: RecordType
  parentKey?: string | null   // 不传 = 创建一级分类
  label: string
  icon?: string
}

/** 更新用户分类的输入 */
export interface UpdateUserCategoryInput {
  label?: string
  icon?: string
}
